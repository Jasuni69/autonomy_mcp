import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MCP_SERVER_KEYS } from './constants';
import type { InstallPaths } from './constants';
import { findUvPath } from './prereqs';

export interface McpConfigOptions {
  enableFabricCore: boolean;
  powerbiExePath: string | null;
  auditPythonPath: string | null;
  paths: InstallPaths;
}

export function buildMcpConfig(options: McpConfigOptions): Record<string, any> {
  const servers: Record<string, any> = {};

  if (options.enableFabricCore) {
    const uvPath = findUvPath();
    const fabricDir = options.paths.fabricCoreDir.replace(/\\/g, '/');
    servers[MCP_SERVER_KEYS.fabricCore] = {
      command: uvPath,
      args: ['--directory', fabricDir, 'run', 'fabric_mcp_stdio.py'],
    };
  }

  if (options.powerbiExePath) {
    servers[MCP_SERVER_KEYS.powerbiModeling] = {
      type: 'stdio',
      command: options.powerbiExePath.replace(/\//g, '\\'),
      args: ['--start'],
    };
  }

  if (options.auditPythonPath) {
    const serverPath = path.join(options.paths.translationAuditDir, 'server.py');
    servers[MCP_SERVER_KEYS.translationAudit] = {
      command: options.auditPythonPath,
      args: [serverPath],
    };
  }

  return { mcpServers: servers };
}

/**
 * Write .mcp.json, merging with existing config.
 */
export function writeMcpConfig(configDir: string, newConfig: Record<string, any>): void {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  const mcpJsonPath = path.join(configDir, '.mcp.json');
  let existing: Record<string, any> = {};

  if (fs.existsSync(mcpJsonPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
    } catch {
      existing = {};
    }
  }

  if (!existing.mcpServers) {
    existing.mcpServers = {};
  }

  for (const [key, value] of Object.entries(newConfig.mcpServers || {})) {
    existing.mcpServers[key] = value;
  }

  fs.writeFileSync(mcpJsonPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
}

/**
 * Ensure global ~/.claude/settings.json has enableAllProjectMcpServers: true.
 */
export function ensureClaudeSettings(): void {
  const claudeDir = path.join(os.homedir(), '.claude');
  mergeSettings(claudeDir, {
    enableAllProjectMcpServers: true,
  });
}

/** Deep-merge `patch` into settings.json at `claudeDir`, creating if needed. */
function mergeSettings(claudeDir: string, patch: Record<string, any>): void {
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  const settingsPath = path.join(claudeDir, 'settings.json');
  let settings: Record<string, any> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  // Shallow merge top-level, deep merge objects like `env`
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      settings[key] = { ...(settings[key] || {}), ...value };
    } else {
      settings[key] = value;
    }
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}
