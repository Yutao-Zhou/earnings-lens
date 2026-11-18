import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDataset} from '../lib/data.mjs';
import {validateReport} from '../lib/validation.mjs';

const dataset=await loadDataset();
test('the active site contains real reports and the requested watchlist',()=>{
  assert.equal(dataset.mode,'production');
  assert.deepEqual(dataset.companies.map(c=>c.ticker),['NVDA','MSFT','AAPL']);
  assert.ok(dataset.reports.length>=1);
  assert.ok(dataset.reports.every(report=>report.data_kind==='production'));
});
test('NVIDIA pilot preserves the standalone quarter and company cash-flow definition',()=>{
  const report=dataset.reports.find(r=>r.report_id==='0001045810-FY2027-Q3'&&r.revision===1);
  assert.ok(report);assert.equal(report.period.start,'2026-07-27');assert.equal(report.period.end,'2026-10-25');
  const metric=key=>report.metrics.find(m=>m.key===key);
  assert.equal(metric('revenue').value,115844000000);
  assert.equal(metric('free_cash_flow').value,48253000000-4422000000-54000000);
  assert.notEqual(metric('free_cash_flow').value,48253000000-4422000000);
  assert.equal(metric('revenue').comparisons.find(c=>c.type==='yoy').baseline_value,57006000000);
  assert.equal(report.coverage.regulatory_filing,'pending');assert.equal(report.coverage.transcript,'pending');
  assert.ok(report.sources.some(s=>s.published_at_precision==='date'));
  assert.deepEqual(validateReport(report),[]);
});
test('unknown guidance dates remain unknown and known dates must be future dates',()=>{
  const report=structuredClone(dataset.reports[0]);
  report.guidance[0].period_end=null;assert.deepEqual(validateReport(report),[]);
  report.guidance[0].period_end=report.period.end;
  assert.ok(validateReport(report).some(error=>/future reporting period/.test(error)));
});
