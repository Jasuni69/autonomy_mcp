import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { Logger } from '../prereqs';
import {
  checkPython, checkUv, checkAzureCli, checkAzureAuth, checkOdbc, checkDotnet,
  installFabricCore, setupAuditVenv, copyDirRecursive,
  smokeTestServers,
} from '../prereqs';
import { findPowerBIMcpExtension } from '../utils';
import { formatElapsed } from './animations';
import { buildMcpConfig, writeMcpConfig, ensureClaudeSettings, ensureAgentTeamsEnv } from '../mcpConfig';
import type { ConfigScope } from './prompts';
import {
  projectPaths, globalPaths,
  WORKSPACE_FILES, TRANSLATION_TOOLKIT_FILES,
  SKILL_DIR, SKILL_FILES, DEPLOY_AGENTS_SKILL_DIR, DEPLOY_AGENTS_SKILL_FILES,
  AGENT_FILES,
} from '../constants';
import type { InstallPaths, ServerSelection } from './types';

export interface CliContext {
  workspaceRoot: string;
  extensionPath: string;
  servers: ServerSelection;
  logger: Logger;
  paths: InstallPaths;
}

/** Resolve install paths based on scope */
export function resolvePaths(workspaceRoot: string, scope: ConfigScope): InstallPaths {
  return scope === 'project' ? projectPaths(workspaceRoot) : globalPaths();
}

/** Run all prerequisite checks and print results */
export function runPrereqChecks(): boolean {
  const checks = [
    { name: 'Python 3.12+', result: checkPython() },
    { name: 'uv', result: checkUv() },
    { name: 'Azure CLI', result: checkAzureCli() },
    { name: 'Azure Auth', result: checkAzureAuth() },
    { name: 'ODBC Driver 18', result: checkOdbc() },
    { name: '.NET 9.x Runtime', result: checkDotnet() },
  ];

  let allOk = true;
  const nameWidth = 20;
  for (const check of checks) {
    const icon = check.result.ok ? pc.green('✓') : pc.red('✗');
    const paddedName = check.name.padEnd(nameWidth);
    const msg = check.result.ok ? check.result.message : pc.red(check.result.message);
    p.log.message(`  ${icon} ${paddedName}${pc.dim('│')} ${msg}`);
    if (check.result.detail) {
      p.log.message(`    ${' '.repeat(nameWidth)} ${pc.dim(check.result.detail)}`);
    }
    if (!check.result.ok) allOk = false;
  }

  return allOk;
}

/** Install selected MCP servers to paths */
export async function installServers(ctx: CliContext): Promise<{
  fabricCoreOk: boolean;
  auditPythonPath: string | null;
  powerbiExePath: string | null;
}> {
  let fabricCoreOk = false;
  let auditPythonPath: string | null = null;
  let powerbiExePath: string | null = null;

  // Fabric Core
  if (ctx.servers.fabricCore) {
    const t0 = Date.now();
    const s = p.spinner();
    s.start('Installing fabric-core MCP server...');
    const bundledDir = path.join(ctx.extensionPath, 'bundled', 'fabric-core');
    if (fs.existsSync(bundledDir)) {
      const result = await installFabricCore(bundledDir, ctx.paths.fabricCoreDir, ctx.logger);
      fabricCoreOk = result.ok;
      if (result.ok) {
        s.stop(pc.green('fabric-core installed') + formatElapsed(Date.now() - t0));
      } else {
        s.stop(pc.red(`fabric-core failed: ${result.message}`) + formatElapsed(Date.now() - t0));
      }
    } else {
      s.stop(pc.yellow('fabric-core source not found in bundled/'));
    }
  }

  // Translation Audit
  if (ctx.servers.translationAudit) {
    const t0 = Date.now();
    const s = p.spinner();
    s.start('Setting up translation audit server...');
    const auditSrc = path.join(ctx.extensionPath, 'bundled', 'translation-audit');
    if (fs.existsSync(auditSrc)) {
      if (!fs.existsSync(ctx.paths.translationAuditDir)) {
        fs.mkdirSync(ctx.paths.translationAuditDir, { recursive: true });
      }
      copyDirRecursive(auditSrc, ctx.paths.translationAuditDir);
      const result = await setupAuditVenv(ctx.paths.translationAuditDir, ctx.logger);
      auditPythonPath = result.pythonPath;
      if (result.ok) {
        s.stop(pc.green('translation audit server ready') + formatElapsed(Date.now() - t0));
      } else {
        s.stop(pc.red(`audit setup failed: ${result.message}`) + formatElapsed(Date.now() - t0));
      }
    } else {
      s.stop(pc.yellow('translation-audit source not found in bundled/'));
    }
  }

  // Power BI Modeling (always global — it's a VS Code extension)
  if (ctx.servers.powerbiModeling) {
    const t0 = Date.now();
    const s = p.spinner();
    s.start('Detecting Power BI Modeling MCP...');
    powerbiExePath = findPowerBIMcpExtension();
    if (powerbiExePath) {
      s.stop(pc.green('Power BI Modeling MCP found') + formatElapsed(Date.now() - t0));
    } else {
      s.stop(pc.yellow('Power BI Modeling MCP not found (install from VS Code Marketplace)') + formatElapsed(Date.now() - t0));
    }
  }

  return { fabricCoreOk, auditPythonPath, powerbiExePath };
}

/** Copy knowledge base files to target dirs */
export function copyKnowledgeBase(ctx: CliContext): void {
  const bundledDir = path.join(ctx.extensionPath, 'bundled');
  const { kbDir, claudeDir } = ctx.paths;

  // CLAUDE.md
  for (const fileName of WORKSPACE_FILES) {
    const src = path.join(bundledDir, fileName);
    const dest = path.join(kbDir, fileName);
    if (fs.existsSync(src)) {
      copyFileIfNewerCli(src, dest, true);
    }
  }

  // Skills
  const skillSrcDir = path.join(bundledDir, SKILL_DIR);
  const skillDestDir = path.join(claudeDir, SKILL_DIR);
  copyFilesFromDir(skillSrcDir, skillDestDir, SKILL_FILES);

  // Deploy-agents skill
  const daSrcDir = path.join(bundledDir, DEPLOY_AGENTS_SKILL_DIR);
  const daDestDir = path.join(claudeDir, DEPLOY_AGENTS_SKILL_DIR);
  copyFilesFromDir(daSrcDir, daDestDir, DEPLOY_AGENTS_SKILL_FILES);

  // Agents
  const agentsSrcDir = path.join(bundledDir, 'agents');
  const agentsDestDir = path.join(claudeDir, 'agents');
  copyFilesFromDir(agentsSrcDir, agentsDestDir, AGENT_FILES);

  // Translation toolkit
  const toolkitDir = path.join(bundledDir, 'translation-toolkit');
  for (const fileName of TRANSLATION_TOOLKIT_FILES) {
    const src = path.join(toolkitDir, fileName);
    const dest = path.join(kbDir, fileName);
    if (fs.existsSync(src)) {
      copyFileIfNewerCli(src, dest, true);
    }
  }
}

/** Write MCP config and Claude settings */
export function writeConfig(
  ctx: CliContext,
  fabricCoreOk: boolean,
  powerbiExePath: string | null,
  auditPythonPath: string | null,
): Record<string, any> {
  const mcpConfig = buildMcpConfig({
    enableFabricCore: fabricCoreOk,
    powerbiExePath,
    auditPythonPath,
    paths: ctx.paths,
  });
  writeMcpConfig(ctx.paths.configDir, mcpConfig);
  ensureClaudeSettings();
  ensureAgentTeamsEnv(ctx.paths.claudeDir);
  return mcpConfig;
}

/** Print summary of where everything got installed */
export function printInstallSummary(ctx: CliContext, mcpConfig: Record<string, any>): void {
  const { paths } = ctx;
  const servers = mcpConfig.mcpServers || {};
  const serverCount = Object.keys(servers).length;

  const lines: string[] = [];
  lines.push('');
  lines.push(pc.cyan('  ┌──────────────────────────────────────────┐'));
  lines.push(pc.cyan('  │') + pc.bold('  Install Summary') + pc.cyan('                         │'));
  lines.push(pc.cyan('  ├──────────────────────────────────────────┤'));
  lines.push(pc.cyan('  │') + `  ${pc.white('Root:')}     ${pc.dim(paths.mcpRoot)}`);
  lines.push(pc.cyan('  │') + `  ${pc.white('Config:')}   ${pc.dim(path.join(paths.configDir, '.mcp.json'))}`);
  lines.push(pc.cyan('  │') + `  ${pc.white('KB:')}       ${pc.dim(path.join(paths.kbDir, 'CLAUDE.md'))}`);
  lines.push(pc.cyan('  │') + `  ${pc.white('Agents:')}   ${pc.dim(path.join(paths.claudeDir, 'agents'))}`);
  lines.push(pc.cyan('  │') + `  ${pc.white('Servers:')}  ${pc.dim(paths.fabricCoreDir)}`);

  if (servers[require('../constants').MCP_SERVER_KEYS.translationAudit]) {
    lines.push(pc.cyan('  │') + `             ${pc.dim(paths.translationAuditDir)}`);
  }

  lines.push(pc.cyan('  ├──────────────────────────────────────────┤'));
  lines.push(pc.cyan('  │') + `  ${pc.bold(pc.green(`${serverCount} server(s) configured`))}`);
  lines.push(pc.cyan('  └──────────────────────────────────────────┘'));
  lines.push('');

  console.log(lines.join('\n'));
}

/** Run smoke tests on configured servers */
export function runSmokeTests(mcpConfig: Record<string, any>): void {
  const results = smokeTestServers(mcpConfig);
  let failures = 0;

  for (const r of results) {
    const icon = r.ok ? pc.green('✓') : pc.red('✗');
    const msg = r.ok ? r.message : pc.red(r.message);
    p.log.message(`${icon} ${r.server}: ${msg}`);
    if (!r.ok) failures++;
  }

  if (failures > 0) {
    p.log.warn(`${failures} server(s) failed smoke test`);
  } else if (results.length > 0) {
    p.log.success('All servers validated');
  }
}

// --- helpers ---

function copyFilesFromDir(srcDir: string, destDir: string, files: readonly string[]): void {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  for (const fileName of files) {
    const src = path.join(srcDir, fileName);
    const dest = path.join(destDir, fileName);
    if (fs.existsSync(src)) {
      copyFileIfNewerCli(src, dest, true);
    }
  }
}

function copyFileIfNewerCli(src: string, dest: string, overwrite: boolean): void {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(dest) && !overwrite) {
    const srcStat = fs.statSync(src);
    const destStat = fs.statSync(dest);
    if (srcStat.mtimeMs <= destStat.mtimeMs) return;
  }
  fs.copyFileSync(src, dest);
}
