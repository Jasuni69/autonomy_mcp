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

/** Common install paths for tools that may not be on PATH yet (fresh install, no shell restart). */
const FALLBACK_PATHS: Record<string, string[]> = process.platform === 'win32'
  ? {
    uv: [
      path.join(process.env.USERPROFILE || '', '.local', 'bin', 'uv.exe'),
      path.join(process.env.USERPROFILE || '', '.cargo', 'bin', 'uv.exe'),
    ],
    az: [
      'C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\wbin\\az.cmd',
      'C:\\Program Files (x86)\\Microsoft SDKs\\Azure\\CLI2\\wbin\\az.cmd',
    ],
  }
  : {
    uv: [
      path.join(process.env.HOME || '', '.local', 'bin', 'uv'),
      path.join(process.env.HOME || '', '.cargo', 'bin', 'uv'),
    ],
    az: ['/usr/local/bin/az', '/usr/bin/az'],
  };

/** Try to find a tool by checking fallback paths when it's not on PATH. */
function findFallback(tool: string): string | null {
  const candidates = FALLBACK_PATHS[tool] || [];
  for (const p of candidates) {
    if (fs.existsSync(p)) { return p; }
  }
  return null;
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
  // PATH may not include uv yet (fresh install, no shell restart)
  const fallback = findFallback('uv');
  if (fallback) {
    const fbOut = runCmd(`"${fallback}" --version`);
    if (fbOut) {
      return { ok: true, message: `uv found (fallback): ${fbOut}` };
    }
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
  // Fallback: check common install paths
  const fallback = findFallback('uv');
  if (fallback) { return fallback; }
  return 'uv';
}

export function checkAzureCli(): PrereqResult {
  let out = runCmd('az version --output json');
  // PATH may not include az yet (fresh install, no shell restart)
  if (!out) {
    const fallback = findFallback('az');
    if (fallback) {
      out = runCmd(`"${fallback}" version --output json`);
    }
  }
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
  let azCmd = 'az';
  if (!runCmd('az --version')) {
    const fallback = findFallback('az');
    if (fallback) { azCmd = `"${fallback}"`; }
  }
  const out = runCmd(`${azCmd} account get-access-token --resource https://api.fabric.microsoft.com/ --output json`, 20000);
  if (out) {
    return { ok: true, message: 'Azure authentication active' };
  }
  return { ok: false, message: 'Not logged in. Run: az login' };
}

export function checkDotnet(): PrereqResult {
  const out = runCmd('dotnet --list-runtimes');
  if (out) {
    // Look for .NET 9.x+ runtime (9.x or newer work for Power BI Modeling MCP)
    const match = out.match(/Microsoft\.NETCore\.App (\d+)\.\d+/);
    const hasCompatible = out.split('\n').some(line =>
      /Microsoft\.NETCore\.App (9|1[0-9])\.\d+/.test(line) ||
      /Microsoft\.AspNetCore\.App (9|1[0-9])\.\d+/.test(line)
    );
    if (hasCompatible && match) {
      return { ok: true, message: `.NET ${match[1]}.x runtime found` };
    }
    // Check if any .NET is installed but wrong version
    const versions = out.match(/Microsoft\.NETCore\.App (\d+\.\d+)/g);
    if (versions) {
      return { ok: false, message: `.NET found but need 9.x+ for Power BI Modeling MCP (have: ${versions.join(', ')})` };
    }
  }
  // Fallback: check common install paths
  const dotnetPaths = process.platform === 'win32'
    ? ['C:\\Program Files\\dotnet\\dotnet.exe']
    : ['/usr/local/share/dotnet/dotnet', '/usr/share/dotnet/dotnet'];
  for (const p of dotnetPaths) {
    if (fs.existsSync(p)) {
      const fbOut = runCmd(`"${p}" --list-runtimes`);
      if (fbOut && /Microsoft\.NETCore\.App (9|1[0-9])\.\d+/.test(fbOut)) {
        return { ok: true, message: '.NET 9.x+ runtime found (fallback path)' };
      }
    }
  }
  return {
    ok: false,
    message: '.NET 9.x+ runtime not found (required for Power BI Modeling MCP)',
    detail: 'https://dotnet.microsoft.com/en-us/download/dotnet/9.0',
  };
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

export interface SmokeTestResult {
  server: string;
  ok: boolean;
  message: string;
}

/**
 * Quick smoke test: verify each configured MCP server can start.
 * Doesn't do a full handshake — just checks the process launches without immediate crash.
 */
export function smokeTestServers(mcpConfig: Record<string, any>): SmokeTestResult[] {
  const results: SmokeTestResult[] = [];
  const servers = mcpConfig.mcpServers || {};

  for (const [name, config] of Object.entries(servers) as [string, any][]) {
    const cmd = config.command;
    const args: string[] = config.args || [];

    // Basic check: command binary exists
    if (!cmd) {
      results.push({ server: name, ok: false, message: 'No command configured' });
      continue;
    }

    // For file-based commands, check the binary/script exists
    if (fs.existsSync(cmd)) {
      // Good — file exists. Now try a quick launch test.
      results.push(smokeTestProcess(name, cmd, args));
    } else {
      // Command might be on PATH (e.g., "uv") — try which/where
      const whichCmd = process.platform === 'win32' ? 'where' : 'which';
      const resolved = runCmd(`${whichCmd} ${cmd}`);
      if (resolved) {
        results.push(smokeTestProcess(name, cmd, args));
      } else {
        results.push({ server: name, ok: false, message: `Command not found: ${cmd}` });
      }
    }
  }

  return results;
}

function smokeTestProcess(name: string, cmd: string, args: string[]): SmokeTestResult {
  try {
    // Spawn process, give it 5s to start, then kill it.
    // We're just checking it doesn't immediately crash with a bad exit code.
    const proc = cp.spawnSync(`"${cmd}"`, args, {
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      // Don't inherit env stdin — server will block waiting for JSON-RPC input,
      // which is fine. We just want to see it doesn't crash on launch.
    });

    // Exit code null = process was still running (killed by timeout). That's good — it started.
    // Exit code 0 = exited cleanly (some servers exit if no stdin). Also good.
    // Exit code non-zero = crashed.
    if (proc.status === null || proc.status === 0) {
      return { server: name, ok: true, message: 'Server starts OK' };
    }

    const stderr = proc.stderr?.toString().trim().slice(0, 200) || '';
    return { server: name, ok: false, message: `Exit code ${proc.status}${stderr ? ': ' + stderr : ''}` };
  } catch (err: any) {
    return { server: name, ok: false, message: `Launch failed: ${err.message}` };
  }
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
