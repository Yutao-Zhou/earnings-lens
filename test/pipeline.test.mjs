import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { loadDataset, projectRoot } from '../lib/data.mjs';
import { validateReport, validateDataset } from '../lib/validation.mjs';
import { historyFor } from '../lib/catalog.mjs';
import { renderSite, serializeJson } from '../lib/render.mjs';
import { build } from '../scripts/build.mjs';

const fixtureRoot=path.join(projectRoot,'test/fixtures/demo');
const dataset=await loadDataset(fixtureRoot);
const latest=dataset.reports.find(report=>report.report_id==='DEMO-FY2026-Q3'&&report.revision===2);
const clone=()=>structuredClone(latest);
const matches=(report,pattern)=>assert.ok(validateReport(report).some(message=>pattern.test(message)),validateReport(report).join('\n'));

test('fictional reports cover partial materials, supplemental revisions, and an empty company',()=>{
  assert.equal(dataset.reports.length,6);
  assert.equal(dataset.companies.length,3);
  assert.equal(dataset.mode,'demo');
  assert.ok(dataset.reports.some(report=>report.coverage.transcript==='pending'));
  assert.ok(dataset.reports.some(report=>report.coverage.transcript==='available'));
});
test('rejects dangling evidence and duplicate source identifiers',()=>{
  let report=clone();report.summary.evidence_ids=['does-not-exist'];matches(report,/unknown evidence/);
  report=clone();report.sources.push(report.sources[0]);matches(report,/Duplicate source/);
});
test('rejects invented growth rates and percentage growth on a margin',()=>{
  let report=clone();report.metrics[0].comparisons[0].change_pct=90;matches(report,/incorrect growth/);
  report=clone();report.metrics[1].comparisons[0].change_pct=1;matches(report,/percentage points/);
});
test('requires missing-value reasons and does not manufacture growth from a loss baseline',()=>{
  let report=clone();report.metrics[0].value=null;matches(report,/missing-value/);
  report=clone();const item=report.metrics[2].comparisons[0];item.baseline_value=-1;matches(report,/unsupported comparison/);
  item.change_pct=null;item.unavailable_reason='Negative baseline; ordinary growth is not meaningful.';assert.deepEqual(validateReport(report),[]);
});
test('rejects cumulative or mismatched reporting intervals and future knowledge',()=>{
  let report=clone();report.metrics[0].period_start='2026-01-01';matches(report,/period start/);
  report=clone();report.period.start='2026-01-01';report.metrics.forEach(metric=>metric.period_start=report.period.start);matches(report,/cumulative periods/);
  report=clone();report.sources[0].fetched_at='2026-12-01T00:00:00Z';matches(report,/after cutoff/);
  report=clone();report.metrics[0].comparisons[0].baseline_end='2024-09-30';matches(report,/prior fiscal year/);
});
test('rejects placeholder production identities, unsafe URLs, and mixed data modes',()=>{
  let report=clone();report.data_kind='production';matches(report,/verified CIK/);matches(report,/placeholder/);
  report=clone();report.sources[0].url='javascript:alert(1)';assert.ok(validateReport(report).length);
  const watchlist={schema_version:'1.0',companies:dataset.companies};
  report=clone();report.data_kind='production';report.company.id='0000123456';report.company.cik='0000123456';report.company.ticker='PROD';report.sources.forEach(source=>source.url='https://www.sec.gov/example');
  watchlist.companies=[...watchlist.companies,{...report.company,enabled:true,research_questions:[]}];
  assert.ok(validateDataset(watchlist,[dataset.reports[0],report]).some(message=>message.includes('mix demonstration')));
});
test('requires real revision ancestry and consistent period identity',()=>{
  const watchlist={schema_version:'1.0',companies:dataset.companies};
  assert.ok(validateDataset(watchlist,[clone()]).some(message=>message.includes('prior revision')));
  const report=clone();report.period.start='2026-07-02';report.metrics.forEach(metric=>metric.period_start=report.period.start);
  assert.ok(validateDataset(watchlist,[...dataset.reports.filter(item=>item!==latest),report]).some(message=>message.includes('inconsistent identity')));
});
test('historical selection cannot leak a later revision into the initial analysis',()=>{
  const initial=dataset.reports.find(report=>report.report_id===latest.report_id&&report.revision===1);
  assert.equal(historyFor(dataset.reports,initial).at(-1).revision,1);
  assert.equal(historyFor(dataset.reports,latest).at(-1).revision,2);
});
test('embedded source text cannot terminate script containers',()=>{
  const payload={quote:'</script><script>alert("injected")</script> & \u2028 \u2029'};
  const encoded=serializeJson(payload);
  assert.ok(!encoded.includes('<'));
  assert.deepEqual(JSON.parse(encoded),payload);
  const poisoned=structuredClone(dataset);poisoned.reports[0].evidence[0].quote=payload.quote;
  const html=renderSite(poisoned,'','');
  assert.equal((html.match(/<\/script>/g)??[]).length,2);
  assert.ok(!html.includes(payload.quote));
});
test('build is deterministic, self-contained, and does not replace a good artifact after validation fails',async()=>{
  const runtime=path.join(projectRoot,'.runtime');await mkdir(runtime,{recursive:true});
  const temp=await mkdtemp(path.join(runtime,'pipeline-'));
  try{
    const output=path.join(temp,'index.html');
    const first=await build({dataRoot:fixtureRoot,output});const second=await build({dataRoot:fixtureRoot,output});assert.equal(first.sha256,second.sha256);
    const html=await readFile(output,'utf8');
    assert.match(html,/connect-src 'none'/);
    assert.ok(!/<script[^>]+src=|<link[^>]+rel="stylesheet"|\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\/fonts\./i.test(html));
    const embedded=html.match(/<script type="application\/json" id="earnings-data">([\s\S]*?)<\/script>/)[1];
    assert.equal(JSON.parse(embedded).reports.length,6);
    const badRoot=path.join(temp,'invalid');await mkdir(path.join(badRoot,'config'),{recursive:true});await mkdir(path.join(badRoot,'data/reports'),{recursive:true});
    await writeFile(path.join(badRoot,'config/watchlist.json'),JSON.stringify({schema_version:'1.0',companies:dataset.companies}));
    const bad=clone();bad.metrics[0].comparisons[0].change_pct=777;
    await writeFile(path.join(badRoot,'data/reports/bad.json'),JSON.stringify(bad));
    await assert.rejects(build({root:badRoot,output}),/incorrect growth/);
    assert.equal(await readFile(output,'utf8'),html);
  }finally{
    const relative=path.relative(path.resolve(runtime),path.resolve(temp));
    if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Refusing to remove a path outside the test workspace');
    await rm(temp,{recursive:true,force:true});
  }
});
