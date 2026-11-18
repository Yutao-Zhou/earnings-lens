export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
export function serializeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
export function renderSite(data, css, javascript) {
  const first = [...data.reports].sort((a,b) => b.period.end.localeCompare(a.period.end) || b.revision-a.revision)[0];
  const notice = data.mode === 'demo' ? '演示工作区 · 所有公司、数据与原文摘录均为虚构，不代表真实披露。' : data.mode === 'empty' ? '暂无可展示的已验证财报。' : '静态研究快照 · 信息截至时间见各份报告。';
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Earnings Lens 财报透镜：有原文依据的季度经营研究。">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231a3540'/%3E%3Ctext x='9' y='24' fill='%23fff' font-size='23' font-family='serif'%3EE%3C/text%3E%3C/svg%3E">
<title>Earnings Lens · 财报透镜</title>
<style>${css}</style>
</head>
<body>
<a href="#workspace" class="skip-link">跳到财报内容</a>
<div class="shell">
 <aside class="sidebar" aria-label="关注公司">
  <a class="brand" href="#"><span class="brand-mark" aria-hidden="true">E<span>·</span></span><span>EARNINGS LENS<small>财报透镜 / 季度研究</small></span></a>
  <div class="sidebar-heading"><span>我的关注</span><span id="company-count">${data.companies.length}</span></div>
  <label class="search"><span class="sr-only">搜索公司或代码</span><input id="company-search" type="search" placeholder="搜索公司或代码" autocomplete="off"></label>
  <nav id="company-list" aria-label="公司列表">${data.companies.map(company => `<button type="button" class="company-button" data-company="${escapeHtml(company.id)}"><span>${escapeHtml(company.name)}</span><small>${escapeHtml(company.ticker)}</small></button>`).join('')}</nav>
  <div class="sidebar-footer"><span class="status-dot" aria-hidden="true"></span>离线可读的研究快照<p>数据、分析与依据随页面保存。</p></div>
 </aside>
 <div class="main-shell">
  <header class="topbar"><span>公司研究 <span class="topbar-slash">/</span> 财报档案</span><span class="topbar-right">${data.mode === 'demo' ? 'DEMO EDITION' : 'RESEARCH EDITION'} <span aria-hidden="true">↗</span></span></header>
  <div class="notice" id="dataset-notice">${escapeHtml(notice)}</div>
  <main id="workspace" tabindex="-1"><div class="report-heading"><p class="eyebrow">QUARTERLY RESEARCH</p><h1>${escapeHtml(first?.company.name ?? '财报研究档案')}</h1><p>${escapeHtml(first?.summary.text ?? '暂无可展示的财报。')}</p></div><noscript><p>请启用 JavaScript 以切换公司、财季并展开详细依据；页面交互不需要联网。</p></noscript></main>
  <footer class="site-footer"><span>EARNINGS LENS</span><span>以事实为起点，持续跟踪经营变化。</span></footer>
 </div>
</div>
<script type="application/json" id="earnings-data">${serializeJson(data)}</script>
<script>${javascript}</script>
</body>
</html>\n`;
}
