import * as vscode from 'vscode';
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
    vscode.commands.registerCommand('fabricPowerbi.quickMenu', () =>
      launchSetupCli(context)
    ),
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

  const terminal = vscode.window.createTerminal({ name: 'Fabric & Power BI Setup' });
  terminal.show();

  // Quote paths for shell safety
  const ws = workspaceFolder.uri.fsPath.replace(/\\/g, '/');
  const ext = context.extensionPath.replace(/\\/g, '/');
  const cli = cliPath.replace(/\\/g, '/');
  // Clear screen first so the raw command isn't visible, then run CLI
  terminal.sendText(`clear 2>/dev/null; node "${cli}" --workspace "${ws}" --extension-path "${ext}"`);
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

