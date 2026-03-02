import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { findPowerBIMcpExtension } from './utils';
import {
  checkPython, checkUv, checkAzureCli, checkAzureAuth, checkOdbc, checkDotnet,
} from './prereqs';
import { buildMcpConfig, writeMcpConfig } from './mcpConfig';
import { SETUP_VERSION, CURRENT_VERSION, FABRIC_CORE_DIR, TRANSLATION_AUDIT_DIR } from './constants';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Fabric & Power BI Toolkit');

  context.subscriptions.push(
    vscode.commands.registerCommand('fabricPowerbi.setupWorkspace', () =>
      launchSetupCli(context)
    ),
    vscode.commands.registerCommand('fabricPowerbi.checkPrereqs', () =>
      runPrereqCheck()
    ),
    vscode.commands.registerCommand('fabricPowerbi.regenerateMcpJson', () =>
      regenerateMcpJson()
    ),
  );

  // On first install, prompt user to run setup
  const lastVersion = context.globalState.get<string>(SETUP_VERSION, '');
  if (lastVersion !== CURRENT_VERSION) {
    context.globalState.update(SETUP_VERSION, CURRENT_VERSION);
    if (lastVersion === '') {
      // First install — suggest running setup
      vscode.window.showInformationMessage(
        'Fabric & Power BI Toolkit installed. Run Full Setup to configure MCP servers.',
        'Run Full Setup'
      ).then(action => {
        if (action === 'Run Full Setup') {
          launchSetupCli(context);
        }
      });
    }
  }
}

export function deactivate() {}

/**
 * Launch interactive CLI in a VS Code terminal for manual "Full Setup".
 */
function launchSetupCli(context: vscode.ExtensionContext): void {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  const cliPath = path.join(context.extensionPath, 'fabric-setup-cli', 'dist', 'cli.js');
  if (!fs.existsSync(cliPath)) {
    vscode.window.showErrorMessage('CLI not found. Extension may be corrupted.');
    return;
  }

  // Find Node: prefer PATH, fall back to VS Code's bundled Node
  let nodePath = 'node';
  try {
    cp.execSync('node --version', { stdio: 'pipe' });
  } catch {
    // Node not on PATH — try VS Code's bundled electron/node
    const vsCodeNode = process.execPath; // VS Code's own Node
    if (fs.existsSync(vsCodeNode)) {
      nodePath = vsCodeNode;
    }
  }

  const terminal = vscode.window.createTerminal({
    name: 'Fabric & Power BI Setup',
    shellPath: nodePath,
    shellArgs: [
      cliPath,
      '--workspace', workspaceFolder.uri.fsPath,
      '--extension-path', context.extensionPath,
    ],
    env: { FORCE_COLOR: '1', ELECTRON_RUN_AS_NODE: '1' },
  });
  terminal.show();
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
    { name: '.NET 9.x Runtime', result: checkDotnet() },
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

