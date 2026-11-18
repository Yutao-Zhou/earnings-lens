import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const schema = name => JSON.parse(readFileSync(new URL(`../schema/${name}.schema.json`, import.meta.url), 'utf8'));
const reportSchema = ajv.compile(schema('earnings-report'));
const watchlistSchema = ajv.compile(schema('watchlist'));
const structuralErrors = validator => (validator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`);
const day = date => Date.parse(date) / 86400000;
const near = (actual, expected) => actual !== null && Math.abs(actual - expected) <= 0.02;

export function validateWatchlist(watchlist) {
  if (!watchlistSchema(watchlist)) return structuralErrors(watchlistSchema);
  const errors = [];
  for (const field of ['id', 'ticker']) {
    const values = watchlist.companies.map(company => company[field]);
    if (new Set(values).size !== values.length) errors.push(`Duplicate watchlist ${field}`);
  }
  return errors;
}

export function validateReport(report) {
  if (!reportSchema(report)) return structuralErrors(reportSchema);
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const unique = (items, key, label) => check(new Set(items.map(item => item[key])).size === items.length, `Duplicate ${label}`);
  unique(report.sources, 'id', 'source ID');
  unique(report.evidence, 'id', 'evidence ID');
  unique(report.metrics, 'key', 'metric key');
  unique(report.follow_ups, 'id', 'follow-up ID');
  const sources = new Map(report.sources.map(item => [item.id, item]));
  const evidence = new Set(report.evidence.map(item => item.id));
  const refs = (ids, label) => ids.forEach(id => check(evidence.has(id), `${label}: unknown evidence ${id}`));
  const currency = (item, label) => check(['currency', 'currency_per_share'].includes(item.unit) ? item.currency !== null : item.currency === null, `${label}: currency does not match unit`);
  check(report.period.start <= report.period.end, 'Report period is reversed');
  const duration=day(report.period.end)-day(report.period.start)+1;
  check(report.period.fiscal_period==='FY'?duration>=300&&duration<=400:duration>=45&&duration<=130, 'Report duration requires review; cumulative periods cannot be labeled as a standalone quarter');
  check(Date.parse(report.period.end) <= Date.parse(report.published_at), 'Report period ends after disclosure');
  check(Date.parse(report.published_at) <= Date.parse(report.as_of), 'Disclosure is after information cutoff');
  check(Date.parse(report.as_of) <= Date.parse(report.analyzed_at), 'Analysis precedes information cutoff');
  check(report.revision === 1 ? report.supersedes_revision === null && report.revision_reason === 'initial' : report.supersedes_revision !== null && report.supersedes_revision < report.revision && report.revision_reason !== 'initial', 'Invalid revision ancestry');
  if (report.data_kind === 'production') check(report.company.cik !== null && report.company.id === report.company.cik, 'Production company ID must equal its verified CIK');
  for (const source of report.sources) {
    const url = new URL(source.url);
    check(!url.username && !url.password, `Source ${source.id}: credentials in URL`);
    check(Date.parse(source.published_at) <= Date.parse(source.fetched_at), `Source ${source.id}: fetched before publication`);
    check(Date.parse(source.fetched_at) <= Date.parse(report.as_of), `Source ${source.id}: obtained after cutoff`);
    check(Date.parse(source.published_at) <= Date.parse(report.as_of), `Source ${source.id}: published after cutoff`);
    if (report.data_kind === 'production') check(!/(^|\.)example\.(com|org|net)$/i.test(url.hostname), `Source ${source.id}: placeholder URL in production`);
  }
  for (const item of report.evidence) check(sources.has(item.source_id), `Evidence ${item.id}: unknown source`);
  for (const [type, state] of Object.entries(report.coverage)) {
    const exists = report.sources.some(source => source.type === type);
    check((state === 'available') === exists, `Coverage ${type} does not match source set`);
  }
  refs(report.summary.evidence_ids, 'Summary');
  for (const item of [...report.findings, ...report.segments, ...report.follow_ups]) refs(item.evidence_ids, 'Narrative');
  for (const item of report.guidance) {
    refs(item.evidence_ids, 'Guidance'); currency(item, 'Guidance');
    check(item.low <= item.high, 'Guidance range is reversed');
    check(item.period_start === null || item.period_start > report.period.end, 'Guidance start must follow the report period');
    check(item.period_end === null || item.period_end > report.period.end, 'Guidance target must include a future reporting period');
    check(item.period_start === null || item.period_end === null || item.period_start <= item.period_end, 'Guidance reporting period is reversed');
  }
  for (const metric of report.metrics) {
    const label = `Metric ${metric.key}`;
    refs(metric.evidence_ids, label); currency(metric, label);
    check(metric.value === null ? Boolean(metric.missing_reason) : metric.missing_reason === null, `${label}: missing-value explanation mismatch`);
    check(metric.period_end === report.period.end, `${label}: period end differs from report`);
    check(metric.period_type === 'instant' ? metric.period_start === null : metric.period_start === report.period.start, `${label}: period start differs from report`);
    if (metric.basis === 'derived') check(Boolean(metric.definition), `${label}: derived measure requires a definition`);
    unique(metric.comparisons, 'type', `${label} comparison`);
    for (const comparison of metric.comparisons) {
      refs(comparison.baseline_evidence_ids, label);
      check(comparison.baseline_end < (metric.period_start ?? metric.period_end), `${label}: baseline overlaps current period`);
      check(metric.period_type === 'instant' ? comparison.baseline_start === null : comparison.baseline_start !== null && comparison.baseline_start <= comparison.baseline_end, `${label}: invalid baseline interval`);
      if (comparison.type === 'yoy') {
        const gap = day(metric.period_end) - day(comparison.baseline_end);
        check(gap >= 330 && gap <= 400, `${label}: year-over-year baseline is not the prior fiscal year`);
        if (metric.period_start && comparison.baseline_start) check(Math.abs((day(metric.period_end) - day(metric.period_start)) - (day(comparison.baseline_end) - day(comparison.baseline_start))) <= 15, `${label}: incomparable duration`);
      } else {
        check(report.period.fiscal_period !== 'FY' && day(metric.period_end) - day(comparison.baseline_end) <= 130, `${label}: invalid quarter-over-quarter baseline`);
      }
      if (metric.value === null || comparison.baseline_value === null || (metric.unit !== 'percent' && comparison.baseline_value <= 0)) {
        check(comparison.change_pct === null && comparison.change_pp === null && Boolean(comparison.unavailable_reason), `${label}: unsupported comparison must be unavailable with a reason`);
      } else if (metric.unit === 'percent') {
        check(comparison.change_pct === null && near(comparison.change_pp, metric.value - comparison.baseline_value) && comparison.unavailable_reason === null, `${label}: margin change must use correctly calculated percentage points`);
      } else {
        const expected = (metric.value / comparison.baseline_value - 1) * 100;
        check(near(comparison.change_pct, expected) && comparison.change_pp === null && comparison.unavailable_reason === null, `${label}: incorrect growth rate`);
      }
    }
  }
  return errors;
}

export function validateDataset(watchlist, reports) {
  const errors = validateWatchlist(watchlist);
  if (errors.length) return errors;
  const companies = new Map(watchlist.companies.map(company => [company.id, company]));
  const versions = new Map();
  const kinds = new Set();
  for (const report of reports) {
    const reportErrors = validateReport(report);
    errors.push(...reportErrors.map(error => `${report.report_id ?? '?'} v${report.revision ?? '?'}: ${error}`));
    if (reportErrors.length) continue;
    const company = companies.get(report.company.id);
    if (!company || company.ticker !== report.company.ticker || company.cik !== report.company.cik || company.name !== report.company.name) errors.push(`${report.report_id}: watchlist identity mismatch`);
    const key = `${report.report_id}@${report.revision}`;
    if (versions.has(key)) errors.push(`Duplicate report revision ${key}`);
    versions.set(key, report);
    kinds.add(report.data_kind);
  }
  if (kinds.size > 1) errors.push('Do not mix demonstration and production reports in one artifact');
  const periodOwners = new Map();
  for (const report of versions.values()) {
    const periodKey = `${report.company.id}:${report.period.fiscal_year}:${report.period.fiscal_period}`;
    const identity = JSON.stringify([report.report_id, report.period]);
    if (periodOwners.has(periodKey) && periodOwners.get(periodKey) !== identity) errors.push(`${report.report_id}: inconsistent identity or period across revisions`);
    periodOwners.set(periodKey, identity);
    if (report.supersedes_revision !== null) {
      const prior = versions.get(`${report.report_id}@${report.supersedes_revision}`);
      if (!prior || prior.company.id !== report.company.id || Date.parse(prior.as_of) > Date.parse(report.as_of)) errors.push(`${report.report_id}: missing or inconsistent prior revision`);
    }
  }
  return errors;
}
