import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { findPowerBIMcpExtension } from './utils';
import {
  checkPython, checkUv, checkAzureCli, checkAzureAuth, checkOdbc,
  installFabricCore, setupAuditVenv, copyDirRecursive, findUvPath,
} from './prereqs';
import { buildMcpConfig, writeMcpConfig, ensureClaudeSettings } from './mcpConfig';
import {
  SETUP_FLAG, SETUP_VERSION, CURRENT_VERSION,
  GLOBAL_MCP_DIR, FABRIC_CORE_DIR, TRANSLATION_AUDIT_DIR,
  WORKSPACE_FILES, TRANSLATION_TOOLKIT_FILES,
  SKILL_DIR, SKILL_FILES, AGENT_FILES,
} from './constants';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Fabric & Power BI Toolkit');

  context.subscriptions.push(
    vscode.commands.registerCommand('fabricPowerbi.setupWorkspace', () =>
      runSetup(context, true)
    ),
    vscode.commands.registerCommand('fabricPowerbi.checkPrereqs', () =>
      runPrereqCheck()
    ),
    vscode.commands.registerCommand('fabricPowerbi.regenerateMcpJson', () =>
      regenerateMcpJson()
    ),
  );

  // Auto-run on first activation
  const lastVersion = context.globalState.get<string>(SETUP_VERSION, '');
  if (lastVersion !== CURRENT_VERSION) {
    runSetup(context, false);
  }
}

export function deactivate() {}

async function runSetup(
  context: vscode.ExtensionContext,
  manual: boolean
): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    if (manual) {
      vscode.window.showWarningMessage('No workspace folder open.');
    }
    return;
  }

  const workspaceRoot = workspaceFolder.uri.fsPath;
  const bundledDir = path.join(context.extensionPath, 'bundled');

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Fabric & Power BI Toolkit',
      cancellable: false,
    },
    async (progress) => {
      const results: string[] = [];

      // Step 1: Check prerequisites
      progress.report({ message: 'Checking prerequisites...' });
      const pythonResult = checkPython();
      const uvResult = checkUv();
      const azResult = checkAzureCli();
      const odbcResult = checkOdbc();

      if (!pythonResult.ok) {
        outputChannel.appendLine(`WARN: ${pythonResult.message}`);
        if (manual) {
          vscode.window.showWarningMessage(
            'Python 3.12+ not found. Required for MCP servers.',
            'Install Now (winget)',
            'Download Page'
          ).then(action => {
            if (action === 'Install Now (winget)') {
              const terminal = vscode.window.createTerminal('Python Install');
              terminal.show();
              terminal.sendText('winget install -e --id Python.Python.3.12');
            } else if (action === 'Download Page') {
              vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
            }
          });
        }
      }
      if (!uvResult.ok) {
        outputChannel.appendLine(`WARN: ${uvResult.message}`);
        if (manual) {
          vscode.window.showWarningMessage(
            'uv not found. Required for MCP server dependency management.',
            'Install Now (PowerShell)',
            'Install Guide'
          ).then(action => {
            if (action === 'Install Now (PowerShell)') {
              const terminal = vscode.window.createTerminal('uv Install');
              terminal.show();
              terminal.sendText('powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"');
            } else if (action === 'Install Guide') {
              vscode.env.openExternal(vscode.Uri.parse('https://docs.astral.sh/uv/getting-started/installation/'));
            }
          });
        }
      }

      // Step 1b: Check Azure CLI + authentication
      if (!azResult.ok) {
        outputChannel.appendLine(`WARN: ${azResult.message}`);
        if (manual) {
          vscode.window.showWarningMessage(
            'Azure CLI not found. Required for Fabric MCP tools.',
            'Install Now (winget)',
            'Manual Install'
          ).then(action => {
            if (action === 'Install Now (winget)') {
              const terminal = vscode.window.createTerminal('Azure CLI Install');
              terminal.show();
              terminal.sendText('winget install -e --id Microsoft.AzureCLI');
            } else if (action === 'Manual Install') {
              vscode.env.openExternal(vscode.Uri.parse(
                'https://learn.microsoft.com/en-us/cli/azure/install-azure-cli'
              ));
            }
          });
        }
      } else {
        progress.report({ message: 'Checking Azure authentication...' });
        const authResult = checkAzureAuth();
        if (!authResult.ok) {
          outputChannel.appendLine(`WARN: ${authResult.message}`);
          if (manual) {
            vscode.window.showWarningMessage(
              'Not logged in to Azure. MCP tools will fail without authentication.',
              'Open Terminal to Login'
            ).then(action => {
              if (action === 'Open Terminal to Login') {
                const terminal = vscode.window.createTerminal('Azure Login');
                terminal.show();
                terminal.sendText('az login');
              }
            });
          }
        } else {
          outputChannel.appendLine(authResult.message);
        }
      }

      // Step 1c: Check ODBC Driver 18
      if (!odbcResult.ok) {
        outputChannel.appendLine(`WARN: ${odbcResult.message}`);
        if (manual) {
          vscode.window.showWarningMessage(
            'ODBC Driver 18 not found (optional — only needed for SQL queries against lakehouses/warehouses).',
            'Install Now (winget)',
            'Download Page'
          ).then(action => {
            if (action === 'Install Now (winget)') {
              const terminal = vscode.window.createTerminal('ODBC Driver Install');
              terminal.show();
              terminal.sendText('winget install -e --id Microsoft.msodbcsql18');
            } else if (action === 'Download Page') {
              vscode.env.openExternal(vscode.Uri.parse(
                'https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server'
              ));
            }
          });
        }
      }

      // Step 2: Install fabric-core globally
      let fabricCoreOk = false;
      if (pythonResult.ok && uvResult.ok) {
        progress.report({ message: 'Installing fabric-core MCP server...' });
        const fabricSrc = path.join(bundledDir, 'fabric-core');
        if (fs.existsSync(fabricSrc)) {
          const result = await installFabricCore(fabricSrc, FABRIC_CORE_DIR, outputChannel);
          fabricCoreOk = result.ok;
          results.push(result.message);
          outputChannel.appendLine(result.message);
        }
      } else {
        results.push('Skipped fabric-core (missing Python 3.12+ or uv)');
      }

      // Step 3: Install translation audit server
      progress.report({ message: 'Setting up translation audit server...' });
      const auditSrc = path.join(bundledDir, 'translation-audit');
      let auditPythonPath: string | null = null;
      if (fs.existsSync(auditSrc)) {
        // Ensure global dir exists
        if (!fs.existsSync(TRANSLATION_AUDIT_DIR)) {
          fs.mkdirSync(TRANSLATION_AUDIT_DIR, { recursive: true });
        }
        copyDirRecursive(auditSrc, TRANSLATION_AUDIT_DIR);
        const auditResult = await setupAuditVenv(TRANSLATION_AUDIT_DIR, outputChannel);
        auditPythonPath = auditResult.pythonPath;
        results.push(auditResult.message);
        outputChannel.appendLine(auditResult.message);
      }

      // Step 4: Find Power BI Modeling MCP
      progress.report({ message: 'Detecting Power BI Modeling MCP...' });
      const powerbiExePath = findPowerBIMcpExtension();
      if (powerbiExePath) {
        results.push(`Power BI Modeling MCP found`);
        outputChannel.appendLine(`Power BI Modeling MCP: ${powerbiExePath}`);
      } else {
        results.push('Power BI Modeling MCP not found (install from VS Code Marketplace if needed)');
        outputChannel.appendLine('Power BI Modeling MCP extension not detected');
      }

      // Step 5: Copy CLAUDE.md to workspace
      progress.report({ message: 'Copying knowledge base...' });
      for (const fileName of WORKSPACE_FILES) {
        const src = path.join(bundledDir, fileName);
        const dest = path.join(workspaceRoot, fileName);
        if (fs.existsSync(src)) {
          copyFileIfNewer(src, dest, manual);
        }
      }

      // Step 5b: Copy fabric-toolkit skill to .claude/skills/
      progress.report({ message: 'Installing fabric-toolkit skill...' });
      const skillSrcDir = path.join(bundledDir, SKILL_DIR);
      const skillDestDir = path.join(workspaceRoot, '.claude', SKILL_DIR);
      if (!fs.existsSync(skillDestDir)) {
        fs.mkdirSync(skillDestDir, { recursive: true });
      }
      for (const fileName of SKILL_FILES) {
        const src = path.join(skillSrcDir, fileName);
        const dest = path.join(skillDestDir, fileName);
        if (fs.existsSync(src)) {
          copyFileIfNewer(src, dest, manual);
        }
      }

      // Step 5c: Copy custom agents to .claude/agents/
      progress.report({ message: 'Installing custom agents...' });
      const agentsSrcDir = path.join(bundledDir, 'agents');
      const agentsDestDir = path.join(workspaceRoot, '.claude', 'agents');
      if (!fs.existsSync(agentsDestDir)) {
        fs.mkdirSync(agentsDestDir, { recursive: true });
      }
      for (const fileName of AGENT_FILES) {
        const src = path.join(agentsSrcDir, fileName);
        const dest = path.join(agentsDestDir, fileName);
        if (fs.existsSync(src)) {
          copyFileIfNewer(src, dest, manual);
        }
      }

      // Step 6: Copy translation toolkit to workspace
      const toolkitDir = path.join(bundledDir, 'translation-toolkit');
      for (const fileName of TRANSLATION_TOOLKIT_FILES) {
        const src = path.join(toolkitDir, fileName);
        const dest = path.join(workspaceRoot, fileName);
        if (fs.existsSync(src)) {
          copyFileIfNewer(src, dest, manual);
        }
      }

      // Step 7: Generate .mcp.json
      progress.report({ message: 'Generating .mcp.json...' });
      const mcpConfig = buildMcpConfig({
        enableFabricCore: fabricCoreOk,
        powerbiExePath,
        auditPythonPath,
      });
      writeMcpConfig(workspaceRoot, mcpConfig);
      outputChannel.appendLine('.mcp.json generated');

      // Step 8: Ensure Claude settings
      ensureClaudeSettings();

      // Step 9: Add .fabric-mcp to .gitignore (not needed since servers are global, but keep CLAUDE.md etc)

      // Step 10: Mark setup complete
      await context.globalState.update(SETUP_VERSION, CURRENT_VERSION);

      // Summary
      const serverCount = Object.keys(mcpConfig.mcpServers).length;
      const summary = `Setup complete. ${serverCount} MCP server(s) configured. Restart Claude Code to load.`;
      outputChannel.appendLine(summary);
      outputChannel.appendLine('Details:\n  ' + results.join('\n  '));

      if (manual) {
        vscode.window.showInformationMessage(
          summary,
          'Show Details'
        ).then(action => {
          if (action === 'Show Details') {
            outputChannel.show();
          }
        });
      }
    }
  );
}

async function runPrereqCheck(): Promise<void> {
  outputChannel.clear();
  outputChannel.show();

  const checks = [
    { name: 'Python 3.12+', result: checkPython() },
    { name: 'uv', result: checkUv() },
    { name: 'Azure CLI', result: checkAzureCli() },
    { name: 'Azure Auth', result: checkAzureAuth() },
    { name: 'ODBC Driver 18', result: checkOdbc() },
    { name: 'Power BI Modeling MCP', result: { ok: !!findPowerBIMcpExtension(), message: findPowerBIMcpExtension() ? 'Found' : 'Not found' } },
  ];

  outputChannel.appendLine('=== Fabric & Power BI Prerequisite Check ===\n');
  let allOk = true;
  for (const check of checks) {
    const status = check.result.ok ? 'PASS' : 'FAIL';
    if (!check.result.ok) { allOk = false; }
    outputChannel.appendLine(`[${status}] ${check.name}: ${check.result.message}`);
    if (check.result.detail) {
      outputChannel.appendLine(`       ${check.result.detail}`);
    }
  }
  outputChannel.appendLine(`\n${allOk ? 'All checks passed.' : 'Some checks failed. See above.'}`);
}

async function regenerateMcpJson(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  const fabricCoreOk = fs.existsSync(path.join(FABRIC_CORE_DIR, 'fabric_mcp_stdio.py'));
  const powerbiExePath = findPowerBIMcpExtension();

  // Check for audit venv
  const auditPython = process.platform === 'win32'
    ? path.join(TRANSLATION_AUDIT_DIR, '.venv', 'Scripts', 'python.exe')
    : path.join(TRANSLATION_AUDIT_DIR, '.venv', 'bin', 'python');
  const auditPythonPath = fs.existsSync(auditPython) ? auditPython : null;

  const mcpConfig = buildMcpConfig({
    enableFabricCore: fabricCoreOk,
    powerbiExePath,
    auditPythonPath,
  });

  writeMcpConfig(workspaceFolder.uri.fsPath, mcpConfig);
  const serverCount = Object.keys(mcpConfig.mcpServers).length;
  vscode.window.showInformationMessage(
    `.mcp.json regenerated with ${serverCount} server(s). Restart Claude Code to reload.`
  );
}

/**
 * Copy file if source is newer than destination or dest doesn't exist.
 */
function copyFileIfNewer(src: string, dest: string, overwrite: boolean): boolean {
  if (fs.existsSync(dest)) {
    if (!overwrite) {
      const srcStat = fs.statSync(src);
      const destStat = fs.statSync(dest);
      if (srcStat.mtimeMs <= destStat.mtimeMs) {
        return false;
      }
    }
  }
  fs.copyFileSync(src, dest);
  return true;
}
