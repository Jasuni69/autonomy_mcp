import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface PrereqResult {
  ok: boolean;
  message: string;
  detail?: string;
}

function runCmd(cmd: string, timeoutMs = 15000): string | null {
  try {
    return cp.execSync(cmd, {
      timeout: timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString().trim();
  } catch {
    return null;
  }
}

export function checkPython(): PrereqResult {
  const candidates = process.platform === 'win32'
    ? ['python.exe', 'python3.exe', 'py.exe']
    : ['python3', 'python'];

  for (const cmd of candidates) {
    const out = runCmd(`${cmd} --version`);
    if (!out) { continue; }
    const match = out.match(/Python (\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      if (major >= 3 && minor >= 12) {
        return { ok: true, message: `Python ${major}.${minor} found` };
      }
      return { ok: false, message: `Python ${major}.${minor} found but need 3.12+` };
    }
  }
  return { ok: false, message: 'Python not found. Install Python 3.12+.' };
}

export function checkUv(): PrereqResult {
  const out = runCmd('uv --version');
  if (out) {
    return { ok: true, message: `uv found: ${out}` };
  }
  return { ok: false, message: 'uv not found. Install: https://docs.astral.sh/uv/getting-started/installation/' };
}

export function findUvPath(): string {
  if (process.platform === 'win32') {
    const out = runCmd('where uv');
    if (out) { return out.split('\n')[0].trim(); }
  } else {
    const out = runCmd('which uv');
    if (out) { return out; }
  }
  return 'uv';
}

export function checkAzureCli(): PrereqResult {
  const out = runCmd('az version --output json');
  if (out) {
    try {
      const data = JSON.parse(out);
      const ver = data['azure-cli'] || 'unknown';
      return { ok: true, message: `Azure CLI ${ver} found` };
    } catch {
      return { ok: true, message: 'Azure CLI found' };
    }
  }
  return { ok: false, message: 'Azure CLI not found. Install: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli' };
}

export function checkAzureAuth(): PrereqResult {
  const out = runCmd('az account get-access-token --resource https://api.fabric.microsoft.com/ --output json', 20000);
  if (out) {
    return { ok: true, message: 'Azure authentication active' };
  }
  return { ok: false, message: 'Not logged in. Run: az login' };
}

export function checkOdbc(): PrereqResult {
  if (process.platform === 'win32') {
    // Check Windows registry for ODBC Driver 18
    const out = runCmd('reg query "HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\ODBC Driver 18 for SQL Server" /v Driver 2>nul');
    if (out && out.includes('Driver')) {
      return { ok: true, message: 'ODBC Driver 18 found' };
    }
  } else {
    const out = runCmd('odbcinst -q -d');
    if (out && out.includes('ODBC Driver 18')) {
      return { ok: true, message: 'ODBC Driver 18 found' };
    }
  }
  return {
    ok: false,
    message: 'ODBC Driver 18 not found (optional, needed for SQL queries)',
    detail: 'https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server',
  };
}

/**
 * Copy bundled fabric-core to global ~/.fabric-mcp/fabric-core/ and run uv sync.
 */
export async function installFabricCore(
  bundledDir: string,
  destDir: string,
  outputChannel: vscode.OutputChannel
): Promise<PrereqResult> {
  try {
    // Copy source files
    copyDirRecursive(bundledDir, destDir);
    outputChannel.appendLine(`Copied fabric-core to ${destDir}`);

    // Run uv sync
    outputChannel.appendLine('Running uv sync...');
    const uvPath = findUvPath();
    cp.execSync(`"${uvPath}" sync`, {
      cwd: destDir,
      timeout: 300000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    outputChannel.appendLine('uv sync complete');
    return { ok: true, message: 'fabric-core installed and dependencies synced' };
  } catch (err: any) {
    return { ok: false, message: `fabric-core install failed: ${err.message}` };
  }
}

/**
 * Set up Python venv for translation audit server.
 */
export async function setupAuditVenv(
  auditDir: string,
  outputChannel: vscode.OutputChannel
): Promise<{ ok: boolean; pythonPath: string | null; message: string }> {
  const venvDir = path.join(auditDir, '.venv');
  const venvPython = process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python');

  // If venv already works, skip
  if (fs.existsSync(venvPython)) {
    try {
      cp.execSync(`"${venvPython}" -c "from mcp.server.fastmcp import FastMCP"`, {
        timeout: 15000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { ok: true, pythonPath: venvPython, message: 'Audit venv already set up' };
    } catch {
      // venv exists but mcp not installed
    }
  }

  // Find system Python
  const systemPython = findSystemPython();
  if (!systemPython) {
    return { ok: false, pythonPath: null, message: 'Python 3.10+ not found for audit venv' };
  }

  try {
    outputChannel.appendLine(`Creating audit venv with ${systemPython}...`);
    cp.execSync(`"${systemPython}" -m venv "${venvDir}"`, {
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: auditDir,
    });

    outputChannel.appendLine('Installing mcp[cli] in audit venv...');
    cp.execSync(`"${venvPython}" -m pip install "mcp[cli]" --quiet`, {
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: auditDir,
    });

    return { ok: true, pythonPath: venvPython, message: 'Audit venv created' };
  } catch (err: any) {
    return { ok: false, pythonPath: null, message: `Audit venv failed: ${err.message}` };
  }
}

function findSystemPython(): string | null {
  const candidates = process.platform === 'win32'
    ? ['python.exe', 'python3.exe', 'py.exe']
    : ['python3', 'python'];

  for (const cmd of candidates) {
    const out = runCmd(`${cmd} --version`);
    if (!out) { continue; }
    const match = out.match(/Python (\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      if (major >= 3 && minor >= 10) {
        // Get full path
        const whereCmd = process.platform === 'win32' ? 'where' : 'which';
        const fullPath = runCmd(`${whereCmd} ${cmd}`);
        return fullPath ? fullPath.split('\n')[0].trim() : cmd;
      }
    }
  }
  return null;
}

/** Recursively copy directory, skipping __pycache__ and .venv */
export function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.name === '__pycache__' || entry.name === '.venv' || entry.name === 'node_modules') {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
