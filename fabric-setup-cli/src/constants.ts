import * as os from 'os';
import * as path from 'path';

export const SETUP_FLAG = 'fabricPowerbi.setupComplete';
export const SETUP_VERSION = 'fabricPowerbi.setupVersion';
export const CURRENT_VERSION = '3.1.0';

/** Global install directory for MCP servers */
export const GLOBAL_MCP_DIR = path.join(os.homedir(), '.fabric-mcp');
export const FABRIC_CORE_DIR = path.join(GLOBAL_MCP_DIR, 'fabric-core');
export const TRANSLATION_AUDIT_DIR = path.join(GLOBAL_MCP_DIR, 'translation-audit');

/** Resolved install paths — varies by scope (project vs global) */
export interface InstallPaths {
  /** Root dir for all MCP stuff */
  mcpRoot: string;
  /** fabric-core server install dir */
  fabricCoreDir: string;
  /** translation-audit server install dir */
  translationAuditDir: string;
  /** Where .mcp.json goes */
  configDir: string;
  /** Where CLAUDE.md, agents, skills go */
  kbDir: string;
  /** Where .claude/agents/, .claude/skills/ go */
  claudeDir: string;
}

/** Build paths for project-local install: everything under <workspace>/mcp/ */
export function projectPaths(workspaceRoot: string): InstallPaths {
  const mcpRoot = path.join(workspaceRoot, 'mcp');
  return {
    mcpRoot,
    fabricCoreDir: path.join(mcpRoot, '.servers', 'fabric-core'),
    translationAuditDir: path.join(mcpRoot, '.servers', 'translation-audit'),
    configDir: mcpRoot,
    kbDir: mcpRoot,
    claudeDir: path.join(mcpRoot, '.claude'),
  };
}

/** Build paths for global install: servers in ~/.fabric-mcp, config in ~/.claude */
export function globalPaths(): InstallPaths {
  return {
    mcpRoot: GLOBAL_MCP_DIR,
    fabricCoreDir: FABRIC_CORE_DIR,
    translationAuditDir: TRANSLATION_AUDIT_DIR,
    configDir: path.join(os.homedir(), '.claude'),
    kbDir: path.join(os.homedir()),
    claudeDir: path.join(os.homedir(), '.claude'),
  };
}

export const MCP_SERVER_KEYS = {
  fabricCore: 'fabric-core',
  powerbiModeling: 'powerbi-modeling',
  translationAudit: 'powerbi-translation-audit',
} as const;

/** Files copied to workspace root */
export const WORKSPACE_FILES = [
  'CLAUDE.md',
];

/** Agent files copied to .claude/agents/ */
export const AGENT_FILES = [
  '_operational-discipline.md',
  'data-engineer.md',
  'dax-analyst.md',
  'translator.md',
  'sql-analyst.md',
  'cicd-engineer.md',
];

/** Skill directories copied to .claude/skills/ */
export const SKILL_DIR = 'skills/fabric-toolkit';
export const DEPLOY_AGENTS_SKILL_DIR = 'skills/deploy-agents';

/** raw_api_call documentation directory — copied recursively to kbDir */
export const RAW_API_DIR = 'raw-api';

/** Files within the fabric-toolkit skill directory to copy */
export const SKILL_FILES = [
  'SKILL.md',
  'TOOL_REFERENCE.md',
  'TRANSLATION_GUIDE.md',
  'CICD_GUIDE.md',
  'API_REFERENCE.md',
];

/** Files within the deploy-agents skill directory to copy */
export const DEPLOY_AGENTS_SKILL_FILES = [
  'SKILL.md',
];

/** Translation toolkit files copied to workspace root */
export const TRANSLATION_TOOLKIT_FILES = [
  'TRANSLATION_PLAYBOOK.md',
  'pbip_translate_display_names.py',
  'pbip_fix_visual_titles.py',
  'translation_map_sv-SE.json',
];
