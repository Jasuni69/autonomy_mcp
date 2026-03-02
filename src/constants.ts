import * as os from 'os';
import * as path from 'path';

export const SETUP_FLAG = 'fabricPowerbi.setupComplete';
export const SETUP_VERSION = 'fabricPowerbi.setupVersion';
export const CURRENT_VERSION = '2.2.1';

/** Global install directory for MCP servers */
export const GLOBAL_MCP_DIR = path.join(os.homedir(), '.fabric-mcp');
export const FABRIC_CORE_DIR = path.join(GLOBAL_MCP_DIR, 'fabric-core');
export const TRANSLATION_AUDIT_DIR = path.join(GLOBAL_MCP_DIR, 'translation-audit');

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
