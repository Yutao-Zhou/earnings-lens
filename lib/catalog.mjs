export function periodsFor(reports, companyId) {
  const periods = new Map();
  for (const report of reports.filter(item => item.company.id === companyId)) periods.set(report.report_id, report);
  return [...periods.values()].sort((a,b) => b.period.end.localeCompare(a.period.end));
}
export function revisionsFor(reports, reportId) {
  return reports.filter(report => report.report_id === reportId).sort((a,b) => b.revision-a.revision);
}
export function historyFor(reports, selected) {
  const snapshots = new Map();
  for (const report of reports) {
    if (report.company.id !== selected.company.id || report.period.end > selected.period.end || Date.parse(report.as_of) > Date.parse(selected.as_of)) continue;
    const prior = snapshots.get(report.report_id);
    if (!prior || prior.revision < report.revision) snapshots.set(report.report_id, report);
  }
  return [...snapshots.values()].sort((a,b) => a.period.end.localeCompare(b.period.end));
}
