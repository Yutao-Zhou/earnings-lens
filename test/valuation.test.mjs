import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset } from '../lib/data.mjs';
import { periodsFor, revisionsFor } from '../lib/catalog.mjs';
import { calculateValuation } from '../lib/valuation.mjs';
import { validateValuation } from '../lib/valuation-data.mjs';

test('valuation recomputes prices and rejects broken anchors and scenario inputs', async () => {
  const data = await loadDataset();
  const model = data.valuations['0001045810-FY2027-Q3@2'];
  const report = data.reports.find(item => item.report_id === model.report_id && item.revision === model.revision);
  const rows = calculateValuation(model);
  assert.equal(rows[1].revenue, 423681e6 * 1.30);
  assert.equal(rows[1].price, rows[1].revenue * .50 / 24186e6 * 26);
  assert.equal(validateValuation(model, report), null);
  const wrongAnchor = structuredClone(model);
  wrongAnchor.revenue_anchor.guidance_midpoint *= 4;
  assert.match(validateValuation(wrongAnchor, report), /guidance midpoint/);
  const wrongCase = structuredClone(model);
  wrongCase.scenarios[0].net_margin = 0;
  assert.match(validateValuation(wrongCase, report), /scenario|assumptions/);
  assert.match(validateValuation({ ...model, revision: 1 }, report), /existing report revision/);
});

test('published models follow their report identity and enterprise values bridge to equity', async () => {
  const data = await loadDataset();
  for (const company of data.companies) {
    const period = periodsFor(data.reports, company.id)[0];
    const report = revisionsFor(data.reports, period.report_id)[0];
    const model = data.valuations[`${report.report_id}@${report.revision}`];
    // A new report may precede its valuation while fresh inputs are being verified.
    if (!model) continue;
    assert.equal(validateValuation(model, report), null, company.ticker);
  }
  const model = data.valuations['0002130357-FY2026-Q3@1'];
  const [, base] = calculateValuation(model);
  assert.equal(model.shares.count, 13_219_642_276);
  assert.equal(base.enterprise, 35_282e6 * 2 * 15);
  assert.equal(base.equity, base.enterprise + 232_351e6 - 109_742e6);
  assert.equal(base.price, base.equity / model.shares.count);
  const spcx = data.valuations['0001181412-FY2026-Q3@2'];
  assert.equal(spcx.shares.count, 8_246_541_218 + 5_334_522_491);
});
