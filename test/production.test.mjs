import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDataset} from '../lib/data.mjs';
import {validateReport} from '../lib/validation.mjs';

const dataset=await loadDataset();
test('the active site contains real reports and the requested watchlist',()=>{
  assert.equal(dataset.mode,'production');
  assert.deepEqual(dataset.companies.map(c=>c.ticker),['NVDA','MSFT','AAPL','AMZN','GOOGL','META','TSLA','SPCX','AMD','INTC','MU','ASML','GM','PLTR','ORCL']);
  for(const company of dataset.companies)assert.ok(dataset.reports.some(r=>r.company.id===company.id));
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
  const report=structuredClone(dataset.reports.find(report=>report.guidance.length));
  report.guidance[0].period_end=null;assert.deepEqual(validateReport(report),[]);
  report.guidance[0].period_end=report.period.end;
  assert.ok(validateReport(report).some(error=>/future reporting period/.test(error)));
});
test('Microsoft keeps cash PPE separate from investment capex and GAAP EPS separate from adjusted EPS',()=>{
  const report=dataset.reports.find(r=>r.report_id==='0000789019-FY2027-Q1'&&r.revision===1);
  assert.ok(report);const metric=key=>report.metrics.find(m=>m.key===key);
  assert.equal(report.period.start,'2026-07-01');assert.equal(report.period.end,'2026-09-30');
  assert.equal(metric('cash_capex').value,39367000000);
  assert.equal(metric('free_cash_flow').value,58000000000-39367000000);
  assert.equal(metric('diluted_eps').value,4.92);assert.equal(metric('diluted_eps').basis,'GAAP');
  assert.equal(metric('adjusted_eps').value,4.89);assert.equal(metric('adjusted_eps').basis,'non-GAAP');
  assert.deepEqual(report.segments.map(s=>s.name),['Agents and Infra','Devices and Consumer']);
  assert.equal(report.coverage.transcript,'available');
});
test('Apple Q4 cash flow is quarter-only and retains the cumulative-source evidence',()=>{
  const report=dataset.reports.find(r=>r.report_id==='0000320193-FY2026-Q4'&&r.revision===1);
  assert.ok(report);const metric=key=>report.metrics.find(m=>m.key===key);
  assert.equal(report.period.start,'2026-06-28');assert.equal(report.period.end,'2026-09-26');
  assert.equal(metric('revenue').value,114477000000);
  assert.equal(metric('operating_cash_flow').value,145097000000-116996000000);
  assert.equal(metric('free_cash_flow').value,(145097000000-116996000000)-(9041000000-6799000000));
  assert.equal(metric('free_cash_flow').basis,'derived');
  assert.ok(metric('operating_cash_flow').evidence_ids.includes('previous-ytd'));
  assert.equal(metric('operating_cash_flow').comparisons.find(c=>c.type==='yoy').baseline_value,29728000000);
  assert.equal(report.guidance.length,0);assert.equal(report.coverage.transcript,'pending');
});
test('expanded coverage preserves issuer cash definitions, currency and loss baselines',()=>{
 const metric=(ticker,key)=>dataset.reports.find(r=>r.company.ticker===ticker).metrics.find(m=>m.key===key);
 assert.equal(metric('AMZN','free_cash_flow').value,42422e6-77259e6+1381e6);
 assert.notEqual(metric('AMZN','free_cash_flow').value,-42400e6);
 assert.equal(metric('META','free_cash_flow').value,32786e6-33942e6-964e6);
 assert.equal(metric('MU','free_cash_flow').value,43973e6-11110e6+9e6+327e6);
 assert.equal(metric('ASML','free_cash_flow').value,11797.6e6-413.3e6-33.9e6);
 assert.equal(metric('ASML','revenue').currency,'EUR');
 assert.equal(metric('GM','free_cash_flow').basis,'non-GAAP');
 assert.match(metric('GM','free_cash_flow').label,/汽车/);
 const negative=metric('SPCX','diluted_eps').comparisons.find(c=>c.type==='yoy');assert.ok(negative.baseline_value<0);assert.equal(negative.change_pct,null);
 assert.equal(metric('AMD','free_cash_flow').comparisons[0].baseline_value,1530e6);
 assert.equal(metric('ORCL','free_cash_flow').value,-5396e6);
 assert.equal(metric('PLTR','revenue').value,2313411000);
});
