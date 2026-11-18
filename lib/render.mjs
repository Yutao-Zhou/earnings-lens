export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
export function serializeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
export function renderSite(data, css, javascript) {
  const first = [...data.reports].sort((a,b) => b.period.end.localeCompare(a.period.end) || b.revision-a.revision)[0];
  const notice = data.mode === 'demo' ? 'Demo workspace · all companies and financial data are fictional.' : 'A saved research snapshot · see each report for its information cutoff.';
  const firstSummary = first ? data.translations?.[`${first.report_id}@${first.revision}`]?.en?.summary : null;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Earnings Lens: source-backed quarterly business analysis in English and Chinese.">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://yutaozhou.com/js/site-analytics.js https://cloud.umami.is/script.js; style-src 'unsafe-inline'; img-src data:; connect-src https://gateway.umami.is; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231a3540'/%3E%3Ctext x='9' y='24' fill='%23fff' font-size='23' font-family='serif'%3EE%3C/text%3E%3C/svg%3E">
<title>Earnings Lens · Quarterly Research</title>
<script>(()=>{let t='auto';try{t=localStorage.getItem('earnings-lens.theme')||t;}catch{}const h=new Date().getHours();document.documentElement.dataset.theme=['light','dark'].includes(t)?t:(h>=19||h<7?'dark':'light');})();</script>
<style>${css}</style>
</head>
<body>
<a href="#workspace" class="skip-link" data-en="Skip to report" data-zh="跳到财报内容">Skip to report</a>
<div class="shell">
 <aside class="sidebar" aria-label="Watchlist">
  <a class="brand" href="#"><span class="brand-mark" aria-hidden="true">E<span>·</span></span><span>EARNINGS LENS<small data-en="QUARTERLY RESEARCH" data-zh="财报透镜 / 季度研究">QUARTERLY RESEARCH</small></span></a>
  <div class="sidebar-heading"><span data-en="WATCHLIST" data-zh="我的关注">WATCHLIST</span><span id="company-count">${data.companies.length}</span></div>
  <label class="search"><input id="company-search" type="search" placeholder="Search company or ticker" aria-label="Search company or ticker" autocomplete="off"></label>
  <nav id="company-list" aria-label="Companies">${data.companies.map(company => `<button type="button" class="company-button" data-company="${escapeHtml(company.id)}"><span>${escapeHtml(company.name)}</span><small>${escapeHtml(company.ticker)}</small></button>`).join('')}</nav>
  <div class="sidebar-footer"><span class="status-dot" aria-hidden="true"></span><span data-en="Research you can read offline" data-zh="离线可读的研究快照">Research you can read offline</span><p data-en="Data, analysis and evidence are saved in this page." data-zh="数据、分析与依据随页面保存。">Data, analysis and evidence are saved in this page.</p></div>
 </aside>
 <div class="main-shell">
  <header class="topbar"><span data-en="Company research / Earnings archive" data-zh="公司研究 / 财报档案">Company research / Earnings archive</span><div id="site-controls"></div></header>
  <div id="announcements"></div>
  <div class="notice" id="dataset-notice">${escapeHtml(notice)}</div>
  <main id="workspace" tabindex="-1"><div class="report-heading"><p class="eyebrow">QUARTERLY RESEARCH</p><h1>${escapeHtml(first?.company.name ?? 'Earnings archive')}</h1><p>${escapeHtml(firstSummary ?? 'Enable JavaScript to explore the saved reports.')}</p></div><noscript><p>Enable JavaScript to switch companies and inspect evidence. Report data is embedded in this page.</p></noscript></main>
  <footer class="site-footer"><span>EARNINGS LENS</span><span data-en="Start with the facts. Follow the business." data-zh="以事实为起点，持续跟踪经营变化。">Start with the facts. Follow the business.</span><a href="https://yutaozhou.com/analytics-settings.html" target="_blank" rel="noopener noreferrer" data-en="Anonymous analytics settings" data-zh="匿名统计设置">Anonymous analytics settings</a></footer>
 </div>
</div>
<script type="application/json" id="earnings-data">${serializeJson(data)}</script>
<script>${javascript}</script>
</body>
</html>\n`;
}
