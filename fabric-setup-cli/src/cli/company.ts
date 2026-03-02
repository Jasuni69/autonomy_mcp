import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { InstallPaths } from './types';

export interface CompanyConfig {
  mode: 'bundled' | 'repo';
  repoUrl?: string;
  companyName?: string;
}

const CONFIG_FILE = path.join(os.homedir(), '.fabric-mcp-cli.json');

/** Load saved repo URL from disk */
function loadSavedConfig(): { repoUrl?: string } {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

/** Save repo URL to disk for next time */
function saveConfig(config: { repoUrl: string }): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Prompt for company config during Full Setup.
 * Returns config but doesn't sync files (that happens in syncCompanyFiles).
 */
export async function promptCompanyConfig(): Promise<CompanyConfig> {
  const mode = await p.select({
    message: 'Knowledge base configuration',
    options: [
      { value: 'bundled', label: 'Use bundled defaults', hint: 'ships with extension' },
      { value: 'repo', label: 'Sync from company repo', hint: 'GitHub → picks company' },
    ],
  });

  if (p.isCancel(mode)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  if (mode === 'bundled') {
    return { mode: 'bundled' };
  }

  // Get repo URL
  const result = await promptRepoAndCompany();
  return result ?? { mode: 'bundled' };
}

/**
 * Standalone company sync — used from main menu.
 * Clones repo, shows companies, user picks, mirrors files into mcp/.
 */
export async function runCompanySync(paths: InstallPaths): Promise<void> {
  const result = await promptRepoAndCompany();
  if (!result || result.mode === 'bundled') return;

  await syncCompanyFiles(result.repoUrl!, result.companyName!, paths);
}

/**
 * Prompt for repo URL → clone → list companies → user picks.
 */
async function promptRepoAndCompany(): Promise<CompanyConfig | null> {
  const saved = loadSavedConfig();

  const repoUrl = await p.text({
    message: 'Company config repo URL',
    placeholder: 'https://github.com/org/fabric-configs',
    defaultValue: saved.repoUrl,
    validate: (val) => {
      if (!val.trim()) return 'URL required';
      return undefined;
    },
  });

  if (p.isCancel(repoUrl)) return null;

  // Clone and discover companies
  const s = p.spinner();
  s.start('Fetching company list...');

  const tmpDir = path.join(os.tmpdir(), 'fabric-company-configs-' + Date.now());
  try {
    cp.execSync(`git clone --depth 1 "${repoUrl}" "${tmpDir}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });
  } catch (err: any) {
    s.stop(pc.red('Clone failed'));
    p.log.error(pc.red(`Could not clone repo: ${err.message?.split('\n')[0]}`));
    cleanupTmp(tmpDir);
    return null;
  }

  // Scan for company folders
  const companiesDir = path.join(tmpDir, 'companies');
  if (!fs.existsSync(companiesDir)) {
    s.stop(pc.red('No companies/ folder found in repo'));
    cleanupTmp(tmpDir);
    return null;
  }

  const companies = fs.readdirSync(companiesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  if (companies.length === 0) {
    s.stop(pc.red('No company folders found in companies/'));
    cleanupTmp(tmpDir);
    return null;
  }

  s.stop(pc.green(`Found ${companies.length} company config(s)`));

  // Let user pick
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

  // Save repo URL for next time
  saveConfig({ repoUrl: repoUrl as string });

  // Stash tmpDir path on the result so syncCompanyFiles can use it
  (globalThis as any).__companyTmpDir = tmpDir;

  return {
    mode: 'repo',
    repoUrl: repoUrl as string,
    companyName: companyName as string,
  };
}

/**
 * Mirror company files from cloned repo into mcp/ paths.
 * Adds new files, updates changed ones, removes files not in repo.
 */
export async function syncCompanyFiles(
  repoUrl: string,
  companyName: string,
  paths: InstallPaths
): Promise<void> {
  // Use already-cloned tmpDir if available, otherwise re-clone
  let tmpDir = (globalThis as any).__companyTmpDir;
  let needsCleanup = false;

  if (!tmpDir || !fs.existsSync(tmpDir)) {
    const s = p.spinner();
    s.start('Pulling latest from repo...');
    tmpDir = path.join(os.tmpdir(), 'fabric-company-configs-' + Date.now());
    try {
      cp.execSync(`git clone --depth 1 "${repoUrl}" "${tmpDir}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      });
      s.stop(pc.green('Repo cloned'));
      needsCleanup = true;
    } catch (err: any) {
      s.stop(pc.red('Clone failed'));
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

  // Mirror CLAUDE.md if it exists
  const srcClaudeMd = path.join(companyDir, 'CLAUDE.md');
  if (fs.existsSync(srcClaudeMd)) {
    copyFileSafe(srcClaudeMd, path.join(paths.kbDir, 'CLAUDE.md'));
    p.log.message(`${pc.green('✓')} CLAUDE.md updated`);
  }

  // Mirror agents/ — full replace
  const srcAgents = path.join(companyDir, 'agents');
  const destAgents = path.join(paths.claudeDir, 'agents');
  if (fs.existsSync(srcAgents)) {
    mirrorDir(srcAgents, destAgents);
    const count = fs.readdirSync(destAgents).filter(f => f.endsWith('.md')).length;
    p.log.message(`${pc.green('✓')} agents/ synced (${count} files)`);
  }

  // Mirror skills/ — full replace
  const srcSkills = path.join(companyDir, 'skills');
  const destSkills = path.join(paths.claudeDir, 'skills');
  if (fs.existsSync(srcSkills)) {
    mirrorDir(srcSkills, destSkills);
    const count = countFiles(destSkills);
    p.log.message(`${pc.green('✓')} skills/ synced (${count} files)`);
  }

  // Any other .md files at company root
  const rootFiles = fs.readdirSync(companyDir)
    .filter(f => f !== 'CLAUDE.md' && !fs.statSync(path.join(companyDir, f)).isDirectory());
  for (const file of rootFiles) {
    copyFileSafe(path.join(companyDir, file), path.join(paths.kbDir, file));
    p.log.message(`${pc.green('✓')} ${file} updated`);
  }

  p.log.success(`Company "${companyName}" config synced`);

  // Cleanup
  if (needsCleanup) {
    cleanupTmp(tmpDir);
  }
  delete (globalThis as any).__companyTmpDir;
}

// --- helpers ---

/** Describe what's in a company folder for the select hint */
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

/** Mirror srcDir → destDir. Removes files in dest that aren't in src. */
function mirrorDir(srcDir: string, destDir: string): void {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy all from src
  copyDirRecursive(srcDir, destDir);

  // Remove files in dest that don't exist in src
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
