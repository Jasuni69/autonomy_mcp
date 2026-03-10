#!/usr/bin/env node

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { createConsoleLogger } from './logger';
import { promptServerSelection, promptCompanyConfig, promptConfigScope } from './prompts';
import { runCompanySync, runLocalSync, syncCompanyFiles, syncLocalFiles } from './company';
import type { ConfigScope } from './types';
import {
  resolvePaths, runPrereqChecks, installServers, copyKnowledgeBase, writeConfig,
  runSmokeTests, printInstallSummary,
} from './tasks';
import type { CliContext } from './tasks';
import {
  printBannerAnimated, printBannerInstant, gradientColor,
  microSpinner, phaseDivider, stepLabel, renderSuccessBox, sleep,
} from './animations';
import {
  listAzureTenants, getActiveTenant, loginToTenant,
} from '../prereqs';

// Read version from root package.json so banner stays in sync
const ROOT_VERSION: string = (() => {
  try {
    const pkg = require('../../../package.json');
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

// Box inner width = 62. Each line padded to exactly 62 visible chars.
const W = 62;
const pad = (s: string, len: number) => s + ' '.repeat(Math.max(0, W - len));

const TOTAL_LINES = 12;

function buildBannerLines(): string[] {
  const lines: string[] = [];
  const raw = [
    // line 0: top border
    () => { const c = gradientColor(0, TOTAL_LINES); return c('╔' + '═'.repeat(W) + '╗'); },
    // line 1: blank
    () => { const c = gradientColor(1, TOTAL_LINES); return c('║') + ' '.repeat(W) + c('║'); },
    // line 2-7: ASCII art
    () => { const c = gradientColor(2, TOTAL_LINES); return c('║') + pad('   ███████╗ █████╗ ██████╗ ██████╗ ██╗ ██████╗', 46) + c('║'); },
    () => { const c = gradientColor(3, TOTAL_LINES); return c('║') + pad('   ██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██╔════╝', 46) + c('║'); },
    () => { const c = gradientColor(4, TOTAL_LINES); return c('║') + pad('   █████╗  ███████║██████╔╝██████╔╝██║██║     ', 46) + c('║'); },
    () => { const c = gradientColor(5, TOTAL_LINES); return c('║') + pad('   ██╔══╝  ██╔══██║██╔══██╗██╔══██╗██║██║     ', 46) + c('║'); },
    () => { const c = gradientColor(6, TOTAL_LINES); return c('║') + pad('   ██║     ██║  ██║██████╔╝██║  ██║██║╚██████╗', 46) + c('║'); },
    () => { const c = gradientColor(7, TOTAL_LINES); return c('║') + pad('   ╚═╝     ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝', 46) + c('║'); },
    // line 8: blank
    () => { const c = gradientColor(8, TOTAL_LINES); return c('║') + ' '.repeat(W) + c('║'); },
    // line 9: subtitle
    () => {
      const c = gradientColor(9, TOTAL_LINES);
      return c('║') + '   ' + pc.bold(pc.magenta('& Power BI Toolkit')) + '       ' + pc.dim('MCP Server Manager') + ' '.repeat(16) + c('║');
    },
    // line 10: blank
    () => { const c = gradientColor(10, TOTAL_LINES); return c('║') + ' '.repeat(W) + c('║'); },
    // line 11: bottom border
    () => { const c = gradientColor(11, TOTAL_LINES); return c('╚' + '═'.repeat(W) + '╝'); },
  ];

  for (const fn of raw) {
    lines.push(fn());
  }

  // Version line below banner
  lines.push(pc.dim(`  v${ROOT_VERSION}  Fabric + Power BI + Claude Code`));

  return lines;
}

// Parse args
function parseArgs(): { workspace: string; extensionPath: string; auto: boolean } {
  const args = process.argv.slice(2);
  let workspace = '';
  let extensionPath = '';
  let auto = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--workspace' && args[i + 1]) {
      workspace = args[++i];
    } else if (args[i] === '--extension-path' && args[i + 1]) {
      extensionPath = args[++i];
    } else if (args[i] === '--auto') {
      auto = true;
    }
  }

  // Default to current working directory
  if (!workspace) workspace = process.cwd();
  if (!extensionPath) extensionPath = process.cwd();

  return { workspace, extensionPath, auto };
}

const SETUP_STEPS = 6;

async function runFullSetup(ctx: CliContext, auto: boolean): Promise<void> {
  let step = 0;

  // ──── Prerequisites ────
  console.log('');
  console.log(phaseDivider('Prerequisites'));

  // Server selection
  step++;
  let servers;
  if (auto) {
    p.log.info(`${stepLabel(step, SETUP_STEPS)} Auto mode: selecting all servers`);
    servers = { fabricCore: true, powerbiModeling: true, translationAudit: true };
  } else {
    servers = await promptServerSelection();
  }

  // Config scope
  let scope: ConfigScope = 'project';
  if (!auto) {
    scope = await promptConfigScope();
  }

  // Company config
  let companyConfig;
  if (!auto) {
    companyConfig = await promptCompanyConfig();
  } else {
    p.log.info('Auto mode: using bundled defaults');
  }

  // Resolve paths based on scope
  const paths = resolvePaths(ctx.workspaceRoot, scope);
  ctx.servers = servers;
  ctx.paths = paths;

  const scopeLabel = scope === 'project'
    ? pc.cyan(`mcp/ → ${paths.mcpRoot}`)
    : pc.yellow(`global → ${paths.mcpRoot}`);
  p.log.info(`Install target: ${scopeLabel}`);

  // Prereq checks
  step++;
  p.log.step(`${stepLabel(step, SETUP_STEPS)} Checking prerequisites...`);
  const prereqsOk = runPrereqChecks();
  if (!prereqsOk && !auto) {
    const proceed = await p.confirm({
      message: 'Some prerequisites missing. Continue anyway?',
      initialValue: true,
    });
    if (p.isCancel(proceed) || !proceed) {
      return;
    }
  }

  // ──── Installation ────
  console.log('');
  console.log(phaseDivider('Installation'));

  step++;
  p.log.step(`${stepLabel(step, SETUP_STEPS)} Installing MCP servers...`);
  const { fabricCoreOk, auditPythonPath, powerbiExePath } = await installServers(ctx);

  // ──── Configuration ────
  console.log('');
  console.log(phaseDivider('Configuration'));

  // Copy knowledge base (bundled defaults first)
  step++;
  p.log.step(`${stepLabel(step, SETUP_STEPS)} Copying knowledge base...`);
  copyKnowledgeBase(ctx);
  p.log.success('Knowledge base copied');

  // Overlay company-specific files if selected
  if (companyConfig?.mode === 'repo' && companyConfig.repoUrl && companyConfig.companyName) {
    p.log.step('Syncing company config...');
    await syncCompanyFiles(companyConfig.repoUrl, companyConfig.companyName, ctx.paths);
  } else if (companyConfig?.mode === 'local') {
    p.log.step('Syncing local config...');
    syncLocalFiles(ctx.paths);
  }

  // Write config
  step++;
  p.log.step(`${stepLabel(step, SETUP_STEPS)} Writing configuration...`);
  const mcpConfig = writeConfig(ctx, fabricCoreOk, powerbiExePath, auditPythonPath);
  const serverCount = Object.keys(mcpConfig.mcpServers).length;
  p.log.success(`.mcp.json written with ${serverCount} server(s)`);

  // ──── Validation ────
  console.log('');
  console.log(phaseDivider('Validation'));

  step++;
  p.log.step(`${stepLabel(step, SETUP_STEPS)} Validating servers...`);
  runSmokeTests(mcpConfig);

  // Summary
  printInstallSummary(ctx, mcpConfig);

  // Completion celebration
  console.log(renderSuccessBox(serverCount));
}

/** Azure Tenant Picker — list tenants, let user switch */
async function runAzureTenantSwitch(): Promise<void> {
  const s = p.spinner();
  s.start('Fetching Azure tenants...');

  const tenants = listAzureTenants();
  const active = getActiveTenant();

  if (tenants.length === 0) {
    s.stop(pc.yellow('No Azure tenants found'));
    p.log.warn('Not logged in or az CLI not found. Run: az login');
    return;
  }

  s.stop(pc.green(`Found ${tenants.length} tenant(s)`));

  if (active) {
    const who = active.userEmail ? pc.cyan(active.userEmail) : pc.bold(active.displayName);
    p.log.info(`Current: ${who} ${pc.dim(`(${active.tenantId.slice(0, 8)}...)`)}`);
  }

  const options = [
    ...tenants.map(t => ({
      value: t.tenantId,
      label: t.userEmail || t.displayName,
      hint: (t.isDefault ? '(active) ' : '') + t.tenantId.slice(0, 13) + '...',
    })),
    { value: '__new__', label: 'Login to new tenant', hint: 'opens browser' },
  ];

  const choice = await p.select({
    message: 'Select Azure tenant',
    options,
  });

  if (p.isCancel(choice)) return;

  const tenantId = choice as string;

  if (tenantId === '__new__') {
    p.log.info('Opening browser for Azure login...');
    const newTenantId = await p.text({
      message: 'Tenant ID to login to',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      validate: (val) => {
        if (!val.trim()) return 'Tenant ID required';
        return undefined;
      },
    });
    if (p.isCancel(newTenantId)) return;

    const loginSpinner = p.spinner();
    loginSpinner.start('Logging in...');
    const result = loginToTenant(newTenantId as string);
    if (result.ok) {
      loginSpinner.stop(pc.green(result.message));
    } else {
      loginSpinner.stop(pc.red(result.message));
    }
    return;
  }

  // Switch to selected tenant
  if (active && tenantId === active.tenantId) {
    p.log.info('Already on that tenant.');
    return;
  }

  const loginSpinner = p.spinner();
  loginSpinner.start('Switching tenant...');
  const result = loginToTenant(tenantId);
  if (result.ok) {
    loginSpinner.stop(pc.green(result.message));
  } else {
    loginSpinner.stop(pc.red(result.message));
  }
}

async function mainMenu(ctx: CliContext, auto: boolean): Promise<void> {
  if (auto) {
    // Auto mode: project scope, install to mcp/
    ctx.paths = resolvePaths(ctx.workspaceRoot, 'project');
    await runFullSetup(ctx, true);
    return;
  }

  // Main menu loop
  while (true) {
    console.log('');
    const action = await p.select({
      message: 'What do you want to do?',
      options: [
        { value: 'setup', label: 'Full Setup', hint: 'install servers, copy KB, write config' },
        { value: 'prereqs', label: 'Check Prerequisites', hint: 'Python, uv, Azure CLI, .NET...' },
        { value: 'smoke', label: 'Smoke Test Servers', hint: 'verify MCP servers can start' },
        { value: 'company', label: 'Company Config', hint: 'sync KB from company repo' },
        { value: 'local', label: 'Local Overrides', hint: 'pick local CLAUDE.md, agents/, skills/' },
        { value: 'azure', label: 'Azure Login / Switch Tenant', hint: 'switch Fabric tenant' },
        { value: 'exit', label: 'Exit' },
      ],
    });

    // Only exit on explicit 'exit' selection.
    // Don't exit on isCancel — VS Code terminal arrow keys can
    // send ESC sequences that clack misreads as cancel.
    if (action === 'exit') {
      p.outro(pc.dim('See ya.'));
      return;
    }
    if (p.isCancel(action)) continue;

    switch (action) {
      case 'setup':
        await runFullSetup(ctx, false);
        break;

      case 'prereqs':
        p.log.step('Checking prerequisites...');
        runPrereqChecks();
        break;

      case 'smoke': {
        p.log.step('Running smoke tests...');
        // Use current paths (from last setup) or default to project
        if (!ctx.paths.mcpRoot) {
          ctx.paths = resolvePaths(ctx.workspaceRoot, 'project');
        }
        const { fabricCoreOk, auditPythonPath, powerbiExePath } = detectCurrentState(ctx.paths);
        const cfg = writeConfig(ctx, fabricCoreOk, powerbiExePath, auditPythonPath);
        runSmokeTests(cfg);
        break;
      }

      case 'company':
        await runCompanySync(ctx.paths);
        break;

      case 'local':
        if (!ctx.paths.mcpRoot) {
          ctx.paths = resolvePaths(ctx.workspaceRoot, 'project');
        }
        await runLocalSync(ctx.paths);
        break;

      case 'azure':
        await runAzureTenantSwitch();
        break;
    }
  }
}

/** Detect what's currently installed without re-installing */
function detectCurrentState(paths: import('../constants').InstallPaths) {
  const fs = require('fs');
  const path = require('path');
  const { findPowerBIMcpExtension } = require('../utils');

  const fabricCoreOk = fs.existsSync(path.join(paths.fabricCoreDir, 'fabric_mcp_stdio.py'));
  const powerbiExePath = findPowerBIMcpExtension();

  const auditPython = process.platform === 'win32'
    ? path.join(paths.translationAuditDir, '.venv', 'Scripts', 'python.exe')
    : path.join(paths.translationAuditDir, '.venv', 'bin', 'python');
  const auditPythonPath = fs.existsSync(auditPython) ? auditPython : null;

  return { fabricCoreOk, auditPythonPath, powerbiExePath };
}

async function main() {
  const { workspace, extensionPath, auto } = parseArgs();
  const logger = createConsoleLogger();

  // Animated or instant banner
  const bannerLines = buildBannerLines();
  if (auto) {
    printBannerInstant(bannerLines);
  } else {
    await printBannerAnimated(bannerLines);
    await microSpinner('Initializing...', 600);
  }

  // Setup context
  const defaultPaths = resolvePaths(workspace, 'project');
  const ctx: CliContext = {
    workspaceRoot: workspace,
    extensionPath,
    servers: defaultServers,
    logger,
    paths: defaultPaths,
  };

  await mainMenu(ctx, auto);
}

main().catch((err) => {
  p.log.error(pc.red(`Setup failed: ${err.message}`));
  process.exit(1);
});
