#!/usr/bin/env node

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { createConsoleLogger } from './logger';
import { promptServerSelection, promptCompanyConfig, promptConfigScope } from './prompts';
import { runCompanySync, syncCompanyFiles } from './company';
import type { ConfigScope } from './types';
import {
  resolvePaths, runPrereqChecks, installServers, copyKnowledgeBase, writeConfig,
  runSmokeTests, printInstallSummary,
} from './tasks';
import type { CliContext } from './tasks';

// Box inner width = 62. Each line padded to exactly 62 visible chars.
const W = 62;
const pad = (s: string, len: number) => s + ' '.repeat(Math.max(0, W - len));

const BANNER = [
  pc.cyan('╔' + '═'.repeat(W) + '╗'),
  pc.cyan('║') + ' '.repeat(W) + pc.cyan('║'),
  pc.cyan('║') + pad('   ███████╗ █████╗ ██████╗ ██████╗ ██╗ ██████╗', 46) + pc.cyan('║'),
  pc.cyan('║') + pad('   ██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██╔════╝', 46) + pc.cyan('║'),
  pc.cyan('║') + pad('   █████╗  ███████║██████╔╝██████╔╝██║██║     ', 46) + pc.cyan('║'),
  pc.cyan('║') + pad('   ██╔══╝  ██╔══██║██╔══██╗██╔══██╗██║██║     ', 46) + pc.cyan('║'),
  pc.cyan('║') + pad('   ██║     ██║  ██║██████╔╝██║  ██║██║╚██████╗', 46) + pc.cyan('║'),
  pc.cyan('║') + pad('   ╚═╝     ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝', 46) + pc.cyan('║'),
  pc.cyan('║') + ' '.repeat(W) + pc.cyan('║'),
  pc.cyan('║') + '   ' + pc.bold(pc.magenta('& Power BI Toolkit')) + '       ' + pc.dim('MCP Server Manager') + ' '.repeat(16) + pc.cyan('║'),
  pc.cyan('║') + ' '.repeat(W) + pc.cyan('║'),
  pc.cyan('╚' + '═'.repeat(W) + '╝'),
].join('\n');

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

async function runFullSetup(ctx: CliContext, auto: boolean): Promise<void> {
  // Server selection
  let servers;
  if (auto) {
    p.log.info('Auto mode: selecting all servers');
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
  p.log.step('Checking prerequisites...');
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

  // Install servers
  p.log.step('Installing MCP servers...');
  const { fabricCoreOk, auditPythonPath, powerbiExePath } = await installServers(ctx);

  // Copy knowledge base (bundled defaults first)
  p.log.step('Copying knowledge base...');
  copyKnowledgeBase(ctx);
  p.log.success('Knowledge base copied');

  // Overlay company-specific files if selected
  if (companyConfig?.mode === 'repo' && companyConfig.repoUrl && companyConfig.companyName) {
    p.log.step('Syncing company config...');
    await syncCompanyFiles(companyConfig.repoUrl, companyConfig.companyName, ctx.paths);
  }

  // Write config
  p.log.step(`Writing configuration...`);
  const mcpConfig = writeConfig(ctx, fabricCoreOk, powerbiExePath, auditPythonPath);
  const serverCount = Object.keys(mcpConfig.mcpServers).length;
  p.log.success(`.mcp.json written with ${serverCount} server(s)`);

  // Smoke tests
  p.log.step('Validating servers...');
  runSmokeTests(mcpConfig);

  // Summary
  printInstallSummary(ctx, mcpConfig);
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
        { value: 'exit', label: 'Exit' },
      ],
    });

    if (p.isCancel(action) || action === 'exit') {
      p.outro(pc.dim('See ya.'));
      return;
    }

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

  console.log(BANNER);

  const defaultServers = { fabricCore: true, powerbiModeling: true, translationAudit: true };
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
