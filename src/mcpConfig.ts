import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MCP_SERVER_KEYS, FABRIC_CORE_DIR, TRANSLATION_AUDIT_DIR } from './constants';
import { findUvPath } from './prereqs';

export interface McpConfigOptions {
  enableFabricCore: boolean;
  powerbiExePath: string | null;
  auditPythonPath: string | null;
}

export function buildMcpConfig(options: McpConfigOptions): Record<string, any> {
  const servers: Record<string, any> = {};

  if (options.enableFabricCore) {
    const uvPath = findUvPath();
    const fabricDir = FABRIC_CORE_DIR.replace(/\\/g, '/');
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
    const serverPath = path.join(TRANSLATION_AUDIT_DIR, 'server.py');
    servers[MCP_SERVER_KEYS.translationAudit] = {
      command: options.auditPythonPath,
      args: [serverPath],
    };
  }

  return { mcpServers: servers };
}

/**
 * Write .mcp.json to workspace, merging with existing config.
 * Preserves any servers not managed by this extension.
 */
export function writeMcpConfig(workspaceRoot: string, newConfig: Record<string, any>): void {
  const mcpJsonPath = path.join(workspaceRoot, '.mcp.json');
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

  // Merge our servers into existing, preserving user's other servers
  const ourKeys = Object.values(MCP_SERVER_KEYS);
  for (const [key, value] of Object.entries(newConfig.mcpServers || {})) {
    existing.mcpServers[key] = value;
  }

  fs.writeFileSync(mcpJsonPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
}

/**
 * Ensure ~/.claude/settings.json has enableAllProjectMcpServers: true
 */
export function ensureClaudeSettings(): void {
  const claudeDir = path.join(os.homedir(), '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  let settings: Record<string, any> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  if (!settings.enableAllProjectMcpServers) {
    settings.enableAllProjectMcpServers = true;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  }
}
