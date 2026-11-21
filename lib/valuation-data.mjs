import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { calculateValuation } from './valuation.mjs';

const cases = ['bear', 'base', 'bull'];
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fields = (item, keys) => isObject(item) && Object.keys(item).length === keys.length && keys.every(key => Object.hasOwn(item, key));
const positive = value => Number.isFinite(value) && value > 0;
const bilingual = value => fields(value, ['en', 'zh']) && Object.values(value).every(text => typeof text === 'string' && text.trim().length >= 12);
const nonnegative = value => Number.isFinite(value) && value >= 0;

function secSource(source, report) {
  if (!fields(source, ['url', 'label']) || !bilingual(source.label)) return false;
  let url;
  try { url = new URL(source.url); } catch { return false; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || url.search) return false;
  return (url.hostname === 'data.sec.gov' && url.pathname === `/api/xbrl/companyfacts/CIK${report.company.id}.json`) ||
    (url.hostname === 'www.sec.gov' && url.pathname.startsWith(`/Archives/edgar/data/${Number(report.company.id)}/`));
}

function validateInputs(model, report) {
  const ev = model.method === 'forward_ev_sales';
  if (!fields(model, ['report_id', 'revision', 'method', 'as_of', 'currency', 'revenue_anchor', 'shares', 'capital', 'source_ids', 'additional_sources', 'method_note', 'scenarios']) ||
      (!ev && model.method !== 'forward_pe') || !fields(model.revenue_anchor, ['amount', 'kind', 'description']) ||
      !positive(model.revenue_anchor.amount) || !['ttm', 'annualized_ytd'].includes(model.revenue_anchor.kind) ||
      !bilingual(model.revenue_anchor.description) || !fields(model.shares, ['count', 'basis', 'description']) || !positive(model.shares.count) ||
      !['quarter_diluted', 'outstanding', 'pro_forma_outstanding'].includes(model.shares.basis) || !bilingual(model.shares.description) ||
      !Array.isArray(model.additional_sources) || !model.additional_sources.length || model.additional_sources.some(source => !secSource(source, report)))
    return 'Invalid reported valuation anchors or sources';
  if (ev ? !fields(model.capital, ['cash', 'debt', 'other_claims', 'description']) ||
           ![model.capital.cash, model.capital.debt, model.capital.other_claims].every(nonnegative) || !bilingual(model.capital.description)
         : model.capital !== null) return 'Invalid enterprise-to-equity bridge';
  return null;
}

export function validateValuation(model, report) {
  if (!isObject(model)) return 'Invalid valuation fields';
  if (!report || model.report_id !== report.report_id || model.revision !== report.revision) return 'Valuation must match an existing report revision';
  const pilot = Object.hasOwn(model, 'forecast_year');
  const ev = model.method === 'forward_ev_sales';
  const asOf = Date.parse(model.as_of);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(model.as_of) || !Number.isFinite(asOf) || new Date(asOf).toISOString().slice(0, 10) !== model.as_of ||
      model.as_of < report.published_at.slice(0, 10) || (pilot && model.forecast_year !== report.period.fiscal_year + 1)) return 'Invalid valuation date or forecast year';
  if (model.currency !== report.metrics.find(metric => metric.key === 'revenue')?.currency || !bilingual(model.method_note)) return 'Invalid model currency or bilingual rationale';
  if (pilot) {
    if (!fields(model, ['report_id', 'revision', 'method', 'as_of', 'forecast_year', 'currency', 'revenue_anchor', 'diluted_shares', 'source_ids', 'method_note', 'scenarios']) ||
        model.method !== 'forward_pe' || !positive(model.diluted_shares)) return 'Invalid pilot valuation fields';
    const anchor = model.revenue_anchor;
    const guidance = fields(anchor, ['reported', 'guidance_midpoint', 'description', 'guidance_evidence_id']) &&
      report.guidance.find(item => item.unit === 'currency' && item.currency === model.currency && item.evidence_ids.includes(anchor.guidance_evidence_id));
    if (!guidance || !positive(anchor.reported) || !positive(anchor.guidance_midpoint) || !bilingual(anchor.description) ||
        anchor.guidance_midpoint !== guidance.low + (guidance.high - guidance.low) / 2) return 'Revenue anchor must match the report guidance midpoint';
  } else {
    const error = validateInputs(model, report);
    if (error) return error;
  }
  if (!Array.isArray(model.source_ids) || !model.source_ids.length || new Set(model.source_ids).size !== model.source_ids.length ||
      model.source_ids.some(id => !report.sources.some(source => source.id === id))) return 'Unknown or duplicate valuation sources';
  if (!Array.isArray(model.scenarios) || model.scenarios.length !== cases.length || model.scenarios.some((item, i) =>
    !fields(item, ['case', 'revenue_growth', 'net_margin', 'multiple', 'rationale']) || item.case !== cases[i] ||
    !Number.isFinite(item.revenue_growth) || item.revenue_growth <= -1 || (ev ? item.net_margin !== null : !positive(item.net_margin) || item.net_margin > 1) ||
    !positive(item.multiple) || !bilingual(item.rationale))) return 'Incomplete or invalid bear, base and bull assumptions';
  const prices = calculateValuation(model).map(row => row.price);
  return prices.every(nonnegative) && prices[0] < prices[1] && prices[1] < prices[2] ? null : 'Valuation prices must be finite and ordered';
}

export async function loadValuations(root, reports, readJson) {
  const directory = path.join(root, 'data/valuations');
  const files = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const result = {};
  for (const file of files.filter(entry => entry.name.endsWith('.json'))) {
    if (!file.isFile()) throw new Error(`Invalid valuation input ${file.name}`);
    const model = await readJson(path.join(directory, file.name));
    const report = reports.find(item => item.report_id === model?.report_id && item.revision === model?.revision);
    const error = validateValuation(model, report);
    if (error) throw new Error(`${file.name}: ${error}`);
    if (file.name !== `${report.report_id}-v${report.revision}.json`) throw new Error(`Valuation file does not match its report: ${file.name}`);
    result[`${report.report_id}@${report.revision}`] = model;
  }
  return result;
}
