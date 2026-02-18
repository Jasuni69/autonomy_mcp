import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export interface PlatformInfo {
  suffix: string;
  exeName: string;
}

export function getPlatformInfo(): PlatformInfo | null {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32') {
    const suffix = arch === 'arm64' ? 'win32-arm64' : 'win32-x64';
    return { suffix, exeName: 'powerbi-modeling-mcp.exe' };
  }

  if (platform === 'darwin') {
    const suffix = arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
    return { suffix, exeName: 'powerbi-modeling-mcp' };
  }

  if (platform === 'linux') {
    const suffix = arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
    return { suffix, exeName: 'powerbi-modeling-mcp' };
  }

  return null;
}

/**
 * Scan ~/.vscode/extensions/ for the Power BI Modeling MCP extension.
 * Returns path to the server exe, or null if not found.
 */
export function findPowerBIMcpExtension(): string | null {
  const platformInfo = getPlatformInfo();
  if (!platformInfo) {
    return null;
  }

  const extensionsDir = path.join(os.homedir(), '.vscode', 'extensions');
  if (!fs.existsSync(extensionsDir)) {
    return null;
  }

  const prefix = 'analysis-services.powerbi-modeling-mcp-';

  let entries: string[];
  try {
    entries = fs.readdirSync(extensionsDir);
  } catch {
    return null;
  }

  const matches = entries
    .filter(name =>
      name.startsWith(prefix) && name.endsWith(`-${platformInfo.suffix}`)
    )
    .sort();

  if (matches.length === 0) {
    return null;
  }

  const latest = matches[matches.length - 1];
  const exePath = path.join(extensionsDir, latest, 'server', platformInfo.exeName);

  if (!fs.existsSync(exePath)) {
    return null;
  }

  return exePath;
}
