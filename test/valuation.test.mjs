import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset } from '../lib/data.mjs';
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
