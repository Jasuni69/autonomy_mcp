import pc from 'picocolors';

/** Promise-based delay */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Print banner lines one at a time with delay for dramatic reveal */
export async function printBannerAnimated(lines: string[]): Promise<void> {
  for (const line of lines) {
    console.log(line);
    await sleep(40);
  }
}

/** Print banner instantly (auto mode, no drama) */
export function printBannerInstant(lines: string[]): void {
  console.log(lines.join('\n'));
}

/**
 * Return color function based on line position.
 * Top/bottom = cyan, middle = magenta. Gives gradient feel.
 */
export function gradientColor(lineIndex: number, total: number): (s: string) => string {
  const ratio = lineIndex / (total - 1);
  // Top 30% and bottom 30% = cyan, middle = magenta
  if (ratio < 0.3 || ratio > 0.7) return pc.cyan;
  return pc.magenta;
}

/** Format elapsed milliseconds as dimmed string like (1.2s) */
export function formatElapsed(ms: number): string {
  const sec = (ms / 1000).toFixed(1);
  return pc.dim(` (${sec}s)`);
}

/** Print a styled phase divider: ──── Label ──── */
export function phaseDivider(label: string): string {
  const bar = '────';
  return pc.dim(`  ${bar} `) + pc.white(label) + pc.dim(` ${bar}`);
}

/** Return bold cyan step counter like [1/6] */
export function stepLabel(current: number, total: number): string {
  return pc.bold(pc.cyan(`[${current}/${total}]`));
}

/** Brief animated spinner for boot-up feel. Resolves after durationMs. */
export async function microSpinner(label: string, durationMs: number): Promise<void> {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const interval = 80;
  let i = 0;
  const timer = setInterval(() => {
    const frame = pc.cyan(frames[i % frames.length]);
    process.stdout.write(`\r  ${frame} ${pc.dim(label)}`);
    i++;
  }, interval);

  await sleep(durationMs);
  clearInterval(timer);
  process.stdout.write(`\r  ${pc.green('●')} ${pc.dim(label)}\n`);
}

export interface BoxLine {
  text: string;
  visibleLen: number;
}

/** Build lines for the success box */
export function successBoxLines(serverCount: number): BoxLine[] {
  return [
    { text: pc.green('✓') + pc.bold('  Setup Complete!'), visibleLen: 19 },
    { text: '', visibleLen: 0 },
    { text: `${serverCount} MCP server(s) configured.`, visibleLen: 24 + String(serverCount).length },
    { text: '', visibleLen: 0 },
    { text: pc.cyan('Ctrl+Shift+P') + ' → Reload Window', visibleLen: 30 },
    { text: 'to activate.', visibleLen: 12 },
  ];
}

/** Render full success box from server count */
export function renderSuccessBox(serverCount: number): string {
  const innerWidth = 40;
  const top = pc.green('╔' + '═'.repeat(innerWidth) + '╗');
  const bot = pc.green('╚' + '═'.repeat(innerWidth) + '╝');

  const lines = successBoxLines(serverCount);
  const rows: string[] = ['', top];

  for (const { text, visibleLen } of lines) {
    const padding = Math.max(0, innerWidth - 2 - visibleLen);
    rows.push(pc.green('║') + '  ' + text + ' '.repeat(padding) + pc.green('║'));
  }

  rows.push(bot, '');
  return rows.join('\n');
}
