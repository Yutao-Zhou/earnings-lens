import { loadDataset } from '../lib/data.mjs';
try {
  const data = await loadDataset();
  console.log(`Validated ${data.reports.length} eligible report revisions for ${data.companies.length} companies (${data.mode}).`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
