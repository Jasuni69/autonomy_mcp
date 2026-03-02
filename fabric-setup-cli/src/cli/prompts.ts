import * as p from '@clack/prompts';
import type { ConfigScope, ServerSelection } from './types';

export { promptCompanyConfig } from './company';
export type { ConfigScope, ServerSelection } from './types';

export async function promptConfigScope(): Promise<ConfigScope> {
  const scope = await p.select({
    message: 'Install scope',
    options: [
      {
        value: 'project' as const,
        label: 'Project (mcp/)',
        hint: 'everything in this workspace — portable, self-contained',
      },
      {
        value: 'global' as const,
        label: 'Global (~/.fabric-mcp/)',
        hint: 'shared across all workspaces',
      },
    ],
  });

  if (p.isCancel(scope)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  return scope;
}

export async function promptServerSelection(): Promise<ServerSelection> {
  const selected = await p.multiselect({
    message: 'Which MCP servers to configure?',
    options: [
      { value: 'fabricCore', label: 'Fabric Core', hint: '138+ tools', selected: true },
      { value: 'powerbiModeling', label: 'Power BI Modeling', hint: 'live semantic model editing', selected: true },
      { value: 'translationAudit', label: 'Translation Audit', hint: 'PBIP translation validation', selected: true },
    ],
    required: true,
  });

  if (p.isCancel(selected)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const set = new Set(selected);
  return {
    fabricCore: set.has('fabricCore'),
    powerbiModeling: set.has('powerbiModeling'),
    translationAudit: set.has('translationAudit'),
  };
}
