import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataset } from './validation.mjs';
import {loadTranslations,loadAnnouncements} from './localization.mjs';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
async function json(file) {
  if ((await stat(file)).size > 2_000_000) throw new Error(`JSON exceeds 2 MB: ${file}`);
  return JSON.parse(await readFile(file, 'utf8'));
}
async function reportFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not report inputs: ${file}`);
    if (entry.isDirectory()) files.push(...await reportFiles(file));
    else if (entry.name.endsWith('.json')) files.push(file);
  }
  return files.sort();
}
export async function loadDataset(root = projectRoot) {
  const watchlist = await json(path.join(root, 'config/watchlist.json'));
  const files = await reportFiles(path.join(root, 'data/reports'));
  const reports = await Promise.all(files.map(json));
  const errors = validateDataset(watchlist, reports);
  if (errors.length) throw new Error(`Report validation failed:\n${errors.join('\n')}`);
  const enabled = new Set(watchlist.companies.filter(company => company.enabled).map(company => company.id));
  const eligible = reports.filter(report => report.validation_status === 'passed' && enabled.has(report.company.id));
  return {
    schema_version: '1.0',
    mode: eligible[0]?.data_kind ?? 'empty',
    as_of: eligible.map(report => report.as_of).sort((a,b) => Date.parse(b)-Date.parse(a))[0] ?? null,
    companies: watchlist.companies.filter(company => company.enabled),
    reports: eligible.sort((a,b) => a.report_id.localeCompare(b.report_id) || a.revision-b.revision),
    translations: await loadTranslations(root,eligible),
    announcements: await loadAnnouncements(root),
  };
}
