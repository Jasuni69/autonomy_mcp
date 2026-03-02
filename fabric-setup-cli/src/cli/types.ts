export type { InstallPaths } from '../constants';

export interface ServerSelection {
  fabricCore: boolean;
  powerbiModeling: boolean;
  translationAudit: boolean;
}

export type ConfigScope = 'project' | 'global';
