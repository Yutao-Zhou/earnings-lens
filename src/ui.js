const uiEnglish={
 '研究总览':'Overview','财务数据':'Financials','历史趋势':'History','原文依据':'Sources','已披露事实':'Reported fact','管理层预期':'Management outlook','分析推断':'Interpretation','关注风险':'Risk to watch',
 '业绩公告':'Earnings release','正式申报文件':'Regulatory filing','电话会材料':'Earnings call','CFO 业绩解读':'CFO commentary','补充财务数据':'Financial statements','已取得':'Collected','待补充':'Pending','未取得':'Not collected','不适用':'Not applicable',
 '经营指标':'Operating metric','计算指标':'Calculated','暂无数据':'Not available','暂无可比数据':'No comparable data','暂无报告':'No report','没有匹配的公司':'No matching companies',
 '选择财季':'Select fiscal period','选择分析版本':'Select report revision','公告初版':'Initial release','补充更新':'Material update','更正':'Correction','重新分析':'Reanalysis','QUARTERLY RESEARCH / 季度经营研究':'QUARTERLY RESEARCH',
 '财报期间':'Fiscal period','分析版本':'Revision','关键财务指标':'Key financial metrics','依据 ↗':'Evidence ↗','THE QUARTER IN FOCUS / 本季观察':'THE QUARTER IN FOCUS','经营变化':'What changed','业务拆解':'Business drivers','管理层指引':'Management guidance','起始日期未明确':'Start date unspecified','期末日期未明确':'End date unspecified',
 '当前材料中没有可展示的已验证指引。':'No verified numerical guidance in the collected materials.','继续跟踪':'What to follow','财务数据与口径':'Financial data and definitions','本期核心财务指标、上年同季与比较口径':'Quarterly metrics and comparable baselines',
 '指标 / 口径':'Metric / basis','本期':'Current','上年同季':'Year-ago quarter','上季':'Prior quarter','同比':'YoY','环比':'QoQ','依据':'Evidence','时点':'Period end','单期':'Standalone period',
 '金额保留披露币种；利润率差值使用百分点。缺失值不按零处理。':'Amounts retain the reported currency. Margin changes use percentage points. Missing values are never treated as zero.',
 '历史趋势指标':'History metric','历季经营轨迹':'Quarterly operating history','暂无口径可比的历史数据。':'No comparable historical observations yet.','财季':'Fiscal period','期末日期':'Period end','版本':'Revision','缺失或不可比':'Missing or incomparable','历史数据':'Historical observations',
 '材料与原文依据':'Source documents and evidence','查看演示链接':'Open example link','打开官方原文':'Open official source','材料状态与原文依据':'Material coverage and evidence','本版材料范围':'Materials in this revision','回到原文':'Check the source','阅读边界':'Scope and limitations','财报档案':'Earnings archive',
 '虚构材料，仅用于验证页面与数据结构。':'Fictional material used to test the interface and contract.','暂无已验证的财报分析。生成并通过校验的报告会在下次页面更新时出现在这里。':'No verified analysis is available yet. A report will appear after collection, validation and publication.','财报视图':'Report views'
};
function ui(value){if(language==='zh'||typeof value!=='string')return value;if(uiEnglish[value])return uiEnglish[value];if(value.startsWith('✓ '))return`✓ ${ui(value.slice(2))}`;if(value.endsWith(' ↗'))return ui(value.slice(0,-2))+' ↗';
  let result=value.replace(/^查看原文依据 /,'View evidence ').replace(/^依据 /,'Evidence ').replace(/^报告期 /,'Period ').replace(/^披露 /,'Published ').replace(/^信息截至 /,'As of ').replace(/ · 采集 /g,' · Collected ').replace(/ · 管理层预期，尚未实现/g,' · Management expectation, not realized').replace(/^下次验证：/,'Next check: ').replace(/，查看依据$/,' — view evidence').replace(/^分析 v/,'Analysis v').replace(/ · 完成于 /,' · Analyzed ').replace('（仅披露日期）',' (date only)').replace('按实际报告期末日期排列。仅展示当时已知的历史版本。','Ordered by actual period-end dates; only revisions known at the selected information cutoff are shown.').replace('历史趋势，仅使用当前报告信息截至时间之前的数据',' history, using only data known by the selected report cutoff');
  for(const[from,to]of Object.entries(uiEnglish))if(from.length>=4||['单期','时点'].includes(from))result=result.replaceAll(from,to);return result;
}
function renderChrome(){
  document.documentElement.lang=language==='zh'?'zh-CN':'en';
  for(const node of document.querySelectorAll('[data-en][data-zh]'))node.textContent=tx(node.dataset.en,node.dataset.zh);
  search.placeholder=tx('Search company or ticker','搜索公司或代码');search.setAttribute('aria-label',search.placeholder);
  const controls=document.getElementById('site-controls');
  if(controls)controls.replaceChildren(el('button',{type:'button',id:'language-en',class:'preference-button','aria-pressed':language==='en',onclick:()=>setLanguage('en')},'EN'),el('button',{type:'button',id:'language-zh',class:'preference-button','aria-pressed':language==='zh',onclick:()=>setLanguage('zh')},'中文'),el('label',{class:'theme-control'},el('span',{class:'sr-only'},tx('Color theme','颜色主题')),el('select',{id:'theme-select','aria-label':tx('Color theme','颜色主题'),onChange:event=>{themePreference=event.target.value;rememberPreference('earnings-lens.theme',themePreference);applyTheme();}},['auto','light','dark'].map(mode=>el('option',{value:mode,selected:themePreference===mode},({auto:tx('Auto theme','自动主题'),light:tx('Light','白天'),dark:tx('Dark','黑夜')})[mode])))));
  const notice=document.getElementById('dataset-notice');if(notice)notice.textContent=dataset.mode==='demo'?tx('Demo workspace · all companies and financial data are fictional.','演示工作区 · 所有公司和财务数据均为虚构。'):tx('A saved research snapshot · see each report for its information cutoff.','静态研究快照 · 信息截至时间见各份报告。');
  renderAnnouncements();
}
function setLanguage(next){language=next;rememberPreference('earnings-lens.language',language);render();document.getElementById(`language-${next}`)?.focus();}
function renderAnnouncements(){
  const root=document.getElementById('announcements');if(!root)return;const latest=dataset.announcements?.[0];if(!latest||storedPreference('earnings-lens.dismissed-announcement','')===latest.id){root.replaceChildren();return;}
  const copy=language==='zh'?latest.zh:latest.en;
  root.replaceChildren(el('div',{class:'announcement-bar',role:'region','aria-label':tx('Announcements','公告')},el('div',{},el('span',{class:'announcement-date'},latest.date),el('strong',{},copy.title),el('p',{},copy.text),el('details',{},el('summary',{},tx('Release notes','更新记录')),dataset.announcements.map(item=>el('article',{},el('strong',{},`${item.date} · ${(language==='zh'?item.zh:item.en).title}`),el('p',{},(language==='zh'?item.zh:item.en).text))))),el('button',{type:'button',class:'announcement-dismiss','aria-label':tx('Dismiss this announcement','关闭本条公告'),onclick:()=>{rememberPreference('earnings-lens.dismissed-announcement',latest.id);root.replaceChildren();}},'×')));
}
