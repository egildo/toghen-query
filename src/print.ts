/**
 * Printing: lines of plain text from what the core returned. These functions format and decide nothing.
 * They never print an empty line, because a session reads a blank line as the gap between two answers.
 */

const NOTHING = '(none)';

/** A string a session would not read back as one answer line: blank, over several lines, a comment or a query. */
const misread = (text: string) => text.trim() === '' || text.includes('\n') || /^[#>]/.test(text);

/** One value on one line when it is short, else indented over several. A string is itself, or JSON if it would be misread. */
export function valueLines(value: unknown): string[] {
  if (value === undefined) return [NOTHING];
  if (typeof value === 'string') return [misread(value) ? JSON.stringify(value) : value];
  const compact = JSON.stringify(value);
  return compact.length <= 100 ? [compact] : JSON.stringify(value, null, 2).split('\n');
}

export const listLine = (names: string[]): string => (names.length ? names.join(', ') : NOTHING);

export const linesOrNone = (lines: string[]): string[] => (lines.length ? lines : [NOTHING]);

export const indent = (lines: string[], by = '  '): string[] => lines.map((line) => `${by}${line}`);

/** Rows as columns, each padded to its widest cell; the last column is not padded. */
export function table(rows: string[][]): string[] {
  const widths = rows.reduce<number[]>((all, row) => row.map((cell, i) => Math.max(all[i] ?? 0, cell.length)), []);
  return rows.map((row) => row.map((cell, i) => (i === row.length - 1 ? cell : cell.padEnd(widths[i]))).join('  '));
}

export const messageLines = (message: string): string[] => message.split('\n').filter((line) => line.trim() !== '');
