import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { InstallPaths } from './types';
import { formatElapsed } from './animations';

export interface CompanyConfig {
  mode: 'bundled' | 'repo' | 'local';
  repoUrl?: string;
  companyName?: string;
  localPath?: string;
}

const CONFIG_FILE = path.join(os.homedir(), '.fabric-mcp-cli.json');

interface SavedConfig {
  repoUrl?: string;
  claudeMdPath?: string;
  agentsDir?: string;
  skillsDir?: string;
}

function loadSavedConfig(): SavedConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveConfig(config: Partial<SavedConfig>): void {
  const existing = loadSavedConfig();
  const merged = { ...existing, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
}

/**
 * Prompt for company config during Full Setup.
 */
export async function promptCompanyConfig(): Promise<CompanyConfig> {
  const saved = loadSavedConfig();

  const options: { value: string; label: string; hint: string }[] = [
    { value: 'bundled', label: 'Use bundled defaults', hint: 'ships with extension' },
    { value: 'repo', label: 'Sync from git repo', hint: saved.repoUrl ? `last: ${shortenUrl(saved.repoUrl)}` : 'paste repo URL' },
    { value: 'local', label: 'Use local files', hint: 'pick CLAUDE.md, agents/, skills/ separately' },
  ];

  const mode = await p.select({ message: 'Knowledge base source', options });

  if (p.isCancel(mode)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  if (mode === 'bundled') return { mode: 'bundled' };

  if (mode === 'local') {
    const result = await pickLocalFiles();
    return result ?? { mode: 'bundled' };
  }

  // repo mode
  const result = await cloneAndPickCompany();
  return result ?? { mode: 'bundled' };
}

/**
 * Standalone company sync — used from main menu.
 */
export async function runCompanySync(paths: InstallPaths): Promise<void> {
  const saved = loadSavedConfig();

  const options: { value: string; label: string; hint: string }[] = [
    { value: 'repo', label: 'Sync from git repo', hint: saved.repoUrl ? `last: ${shortenUrl(saved.repoUrl)}` : 'paste repo URL' },
    { value: 'local', label: 'Use local files', hint: 'pick CLAUDE.md, agents/, skills/ separately' },
  ];

  const mode = await p.select({ message: 'Knowledge base source', options });
  if (p.isCancel(mode)) return;

  if (mode === 'local') {
    const result = await pickLocalFiles();
    if (!result || result.mode !== 'local') return;
    syncLocalFiles(paths);
    return;
  }

  const result = await cloneAndPickCompany();
  if (!result || result.mode !== 'repo') return;
  await syncCompanyFiles(result.repoUrl!, result.companyName!, paths);
}

// ─── Git Repo Flow ───

async function cloneAndPickCompany(): Promise<CompanyConfig | null> {
  const saved = loadSavedConfig();

  const repoUrl = await p.text({
    message: 'Git repo URL',
    placeholder: 'https://github.com/org/fabric-configs',
    defaultValue: saved.repoUrl,
    validate: (val) => {
      if (!val.trim()) return 'URL required';
      return undefined;
    },
  });

  if (p.isCancel(repoUrl)) return null;

  const t0 = Date.now();
  const s = p.spinner();
  s.start('Fetching company list...');

  const tmpDir = path.join(os.tmpdir(), 'fabric-company-configs-' + Date.now());
  try {
    cp.execSync(`git clone --depth 1 "${repoUrl}" "${tmpDir}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });
  } catch (err: any) {
    s.stop(pc.red('Clone failed') + formatElapsed(Date.now() - t0));
    p.log.error(pc.red(`Could not clone repo: ${err.message?.split('\n')[0]}`));
    cleanupTmp(tmpDir);
    return null;
  }

  // Scan for company folders
  const companiesDir = path.join(tmpDir, 'companies');
  if (!fs.existsSync(companiesDir)) {
    s.stop(pc.red('No companies/ folder found in repo') + formatElapsed(Date.now() - t0));
    cleanupTmp(tmpDir);
    return null;
  }

  const companies = fs.readdirSync(companiesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  if (companies.length === 0) {
    s.stop(pc.red('No company folders found in companies/') + formatElapsed(Date.now() - t0));
    cleanupTmp(tmpDir);
    return null;
  }

  s.stop(pc.green(`Found ${companies.length} company config(s)`) + formatElapsed(Date.now() - t0));

  const companyName = await p.select({
    message: 'Select company',
    options: companies.map(name => ({
      value: name,
      label: name,
      hint: describeCompanyFolder(path.join(companiesDir, name)),
    })),
  });

  if (p.isCancel(companyName)) {
    cleanupTmp(tmpDir);
    return null;
  }

  saveConfig({ repoUrl: repoUrl as string });
  (globalThis as any).__companyTmpDir = tmpDir;

  return {
    mode: 'repo',
    repoUrl: repoUrl as string,
    companyName: companyName as string,
  };
}

/**
 * Mirror company files from cloned repo into mcp/ paths.
 */
export async function syncCompanyFiles(
  repoUrl: string,
  companyName: string,
  paths: InstallPaths
): Promise<void> {
  let tmpDir = (globalThis as any).__companyTmpDir;
  let needsCleanup = false;

  if (!tmpDir || !fs.existsSync(tmpDir)) {
    const t0 = Date.now();
    const s = p.spinner();
    s.start('Pulling latest from repo...');
    tmpDir = path.join(os.tmpdir(), 'fabric-company-configs-' + Date.now());
    try {
      cp.execSync(`git clone --depth 1 "${repoUrl}" "${tmpDir}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      });
      s.stop(pc.green('Repo cloned') + formatElapsed(Date.now() - t0));
      needsCleanup = true;
    } catch (err: any) {
      s.stop(pc.red('Clone failed') + formatElapsed(Date.now() - t0));
      p.log.error(pc.red(err.message?.split('\n')[0]));
      return;
    }
  } else {
    needsCleanup = true;
  }

  const companyDir = path.join(tmpDir, 'companies', companyName);
  if (!fs.existsSync(companyDir)) {
    p.log.error(pc.red(`Company folder not found: companies/${companyName}`));
    cleanupTmp(tmpDir);
    return;
  }

  // CLAUDE.md
  const srcClaudeMd = path.join(companyDir, 'CLAUDE.md');
  if (fs.existsSync(srcClaudeMd)) {
    copyFileSafe(srcClaudeMd, path.join(paths.kbDir, 'CLAUDE.md'));
    p.log.message(`${pc.green('✓')} CLAUDE.md updated`);
  }

  // agents/
  const srcAgents = path.join(companyDir, 'agents');
  const destAgents = path.join(paths.claudeDir, 'agents');
  if (fs.existsSync(srcAgents)) {
    mirrorDir(srcAgents, destAgents);
    const count = fs.readdirSync(destAgents).filter(f => f.endsWith('.md')).length;
    p.log.message(`${pc.green('✓')} agents/ synced (${count} files)`);
  }

  // skills/
  const srcSkills = path.join(companyDir, 'skills');
  const destSkills = path.join(paths.claudeDir, 'skills');
  if (fs.existsSync(srcSkills)) {
    mirrorDir(srcSkills, destSkills);
    const count = countFiles(destSkills);
    p.log.message(`${pc.green('✓')} skills/ synced (${count} files)`);
  }

  // Other root files
  const rootFiles = fs.readdirSync(companyDir)
    .filter(f => f !== 'CLAUDE.md' && !fs.statSync(path.join(companyDir, f)).isDirectory());
  for (const file of rootFiles) {
    copyFileSafe(path.join(companyDir, file), path.join(paths.kbDir, file));
    p.log.message(`${pc.green('✓')} ${file} updated`);
  }

  p.log.success(`Company "${companyName}" config synced`);

  if (needsCleanup) cleanupTmp(tmpDir);
  delete (globalThis as any).__companyTmpDir;
}

// ─── Local File Picker Flow ───

interface LocalPicks {
  claudeMdPath?: string;
  agentsDir?: string;
  skillsDir?: string;
}

async function pickLocalFiles(): Promise<CompanyConfig | null> {
  const saved = loadSavedConfig();

  p.log.info(pc.dim('Pick files individually. Press Enter to skip any.'));

  // CLAUDE.md
  const claudeMd = await p.text({
    message: 'Path to CLAUDE.md',
    placeholder: '/path/to/CLAUDE.md (Enter to skip)',
    defaultValue: saved.claudeMdPath || '',
    validate: (val) => {
      if (!val.trim()) return undefined; // skip is ok
      const resolved = path.resolve(val.trim());
      if (!fs.existsSync(resolved)) return `File not found: ${resolved}`;
      if (fs.statSync(resolved).isDirectory()) return 'Expected a file, not a directory';
      return undefined;
    },
  });
  if (p.isCancel(claudeMd)) return null;

  // agents/
  const agentsDir = await p.text({
    message: 'Path to agents/ folder',
    placeholder: '/path/to/agents (Enter to skip)',
    defaultValue: saved.agentsDir || '',
    validate: (val) => {
      if (!val.trim()) return undefined;
      const resolved = path.resolve(val.trim());
      if (!fs.existsSync(resolved)) return `Folder not found: ${resolved}`;
      if (!fs.statSync(resolved).isDirectory()) return 'Expected a directory';
      return undefined;
    },
  });
  if (p.isCancel(agentsDir)) return null;

  // skills/
  const skillsDir = await p.text({
    message: 'Path to skills/ folder',
    placeholder: '/path/to/skills (Enter to skip)',
    defaultValue: saved.skillsDir || '',
    validate: (val) => {
      if (!val.trim()) return undefined;
      const resolved = path.resolve(val.trim());
      if (!fs.existsSync(resolved)) return `Folder not found: ${resolved}`;
      if (!fs.statSync(resolved).isDirectory()) return 'Expected a directory';
      return undefined;
    },
  });
  if (p.isCancel(skillsDir)) return null;

  const picks: LocalPicks = {};
  if ((claudeMd as string).trim()) picks.claudeMdPath = path.resolve((claudeMd as string).trim());
  if ((agentsDir as string).trim()) picks.agentsDir = path.resolve((agentsDir as string).trim());
  if ((skillsDir as string).trim()) picks.skillsDir = path.resolve((skillsDir as string).trim());

  if (!picks.claudeMdPath && !picks.agentsDir && !picks.skillsDir) {
    p.log.warn('Nothing selected.');
    return null;
  }

  // Save paths for next time
  saveConfig({
    claudeMdPath: picks.claudeMdPath,
    agentsDir: picks.agentsDir,
    skillsDir: picks.skillsDir,
  });

  // Stash picks so syncLocalFiles can use them
  (globalThis as any).__localPicks = picks;

  return { mode: 'local' };
}

const LOCAL_MARKER = '\n\n<!-- LOCAL OVERRIDES -->\n';

/**
 * Standalone local sync — used from main menu "Local Overrides".
 */
export async function runLocalSync(paths: InstallPaths): Promise<void> {
  const result = await pickLocalFiles();
  if (!result || result.mode !== 'local') return;
  syncLocalFilesAppend(paths);
}

/**
 * Sync local files with CLAUDE.md append logic (no overwrite).
 */
function syncLocalFilesAppend(paths: InstallPaths): void {
  const picks: LocalPicks | undefined = (globalThis as any).__localPicks;
  if (!picks) return;

  if (picks.claudeMdPath && fs.existsSync(picks.claudeMdPath)) {
    appendClaudeMd(picks.claudeMdPath, path.join(paths.kbDir, 'CLAUDE.md'));
    p.log.message(`${pc.green('✓')} CLAUDE.md appended ← ${pc.dim(picks.claudeMdPath)}`);
  }

  if (picks.agentsDir && fs.existsSync(picks.agentsDir)) {
    const destAgents = path.join(paths.claudeDir, 'agents');
    mirrorDir(picks.agentsDir, destAgents);
    const count = fs.readdirSync(destAgents).filter(f => f.endsWith('.md')).length;
    p.log.message(`${pc.green('✓')} agents/ synced (${count} files) ← ${pc.dim(picks.agentsDir)}`);
  }

  if (picks.skillsDir && fs.existsSync(picks.skillsDir)) {
    const destSkills = path.join(paths.claudeDir, 'skills');
    mirrorDir(picks.skillsDir, destSkills);
    const count = countFiles(destSkills);
    p.log.message(`${pc.green('✓')} skills/ synced (${count} files) ← ${pc.dim(picks.skillsDir)}`);
  }

  p.log.success('Local overrides synced');
  delete (globalThis as any).__localPicks;
}

function appendClaudeMd(localPath: string, destPath: string): void {
  const localContent = fs.readFileSync(localPath, 'utf-8');
  let existing = fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf-8') : '';

  const markerIdx = existing.indexOf(LOCAL_MARKER);
  if (markerIdx !== -1) {
    existing = existing.slice(0, markerIdx);
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, existing + LOCAL_MARKER + localContent + '\n', 'utf-8');
}

/**
 * Sync individually picked local files into mcp/ paths (overwrites CLAUDE.md — used by Full Setup).
 */
export function syncLocalFiles(paths: InstallPaths): void {
  const picks: LocalPicks | undefined = (globalThis as any).__localPicks;
  if (!picks) return;

  if (picks.claudeMdPath && fs.existsSync(picks.claudeMdPath)) {
    copyFileSafe(picks.claudeMdPath, path.join(paths.kbDir, 'CLAUDE.md'));
    p.log.message(`${pc.green('✓')} CLAUDE.md ← ${pc.dim(picks.claudeMdPath)}`);
  }

  if (picks.agentsDir && fs.existsSync(picks.agentsDir)) {
    const destAgents = path.join(paths.claudeDir, 'agents');
    mirrorDir(picks.agentsDir, destAgents);
    const count = fs.readdirSync(destAgents).filter(f => f.endsWith('.md')).length;
    p.log.message(`${pc.green('✓')} agents/ synced (${count} files) ← ${pc.dim(picks.agentsDir)}`);
  }

  if (picks.skillsDir && fs.existsSync(picks.skillsDir)) {
    const destSkills = path.join(paths.claudeDir, 'skills');
    mirrorDir(picks.skillsDir, destSkills);
    const count = countFiles(destSkills);
    p.log.message(`${pc.green('✓')} skills/ synced (${count} files) ← ${pc.dim(picks.skillsDir)}`);
  }

  p.log.success('Local config synced');
  delete (globalThis as any).__localPicks;
}

// ─── Helpers ───

function describeCompanyFolder(dir: string): string {
  const items: string[] = [];
  if (fs.existsSync(path.join(dir, 'CLAUDE.md'))) items.push('CLAUDE.md');
  if (fs.existsSync(path.join(dir, 'agents'))) {
    const count = fs.readdirSync(path.join(dir, 'agents')).filter(f => f.endsWith('.md')).length;
    items.push(`${count} agents`);
  }
  if (fs.existsSync(path.join(dir, 'skills'))) {
    items.push('skills');
  }
  return items.join(', ') || 'empty';
}

function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\.git$/, '');
}

function shortenPath(p: string): string {
  const home = os.homedir();
  if (p.startsWith(home)) return '~' + p.slice(home.length);
  return p;
}

function mirrorDir(srcDir: string, destDir: string): void {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  copyDirRecursive(srcDir, destDir);
  removeStaleFiles(srcDir, destDir);
}

function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeStaleFiles(srcDir: string, destDir: string): void {
  if (!fs.existsSync(destDir)) return;
  for (const entry of fs.readdirSync(destDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (!fs.existsSync(srcPath)) {
      if (entry.isDirectory()) {
        fs.rmSync(destPath, { recursive: true });
      } else {
        fs.unlinkSync(destPath);
      }
    } else if (entry.isDirectory()) {
      removeStaleFiles(srcPath, destPath);
    }
  }
}

function copyFileSafe(src: string, dest: string): void {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function countFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

function cleanupTmp(dir: string): void {
  try { fs.rmSync(dir, { recursive: true }); } catch {}
}
