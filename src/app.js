const dataset=JSON.parse(document.getElementById('earnings-data').textContent);
const workspace=document.getElementById('workspace');
const companies=document.getElementById('company-list');
const search=document.getElementById('company-search');
const tabs=[['overview','研究总览'],['metrics','财务数据'],['history','历史趋势'],['sources','原文依据']];
const kindLabels={fact:'已披露事实',management_expectation:'管理层预期',inference:'分析推断',risk:'关注风险'};
const coverageLabels={earnings_release:'业绩公告',regulatory_filing:'正式申报文件',transcript:'电话会材料',cfo_commentary:'CFO 业绩解读',supplemental_financials:'补充财务数据'};
const coverageStates={available:'已取得',pending:'待补充',unavailable:'未取得',not_applicable:'不适用'};
const state={company:dataset.companies[0]?.id,report:null,revision:null,tab:'overview',evidence:null,metric:'revenue'};

function el(tag,attributes={},...children){
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(attributes)){
    if(key==='class')node.className=value;
    else if(key.startsWith('on'))node.addEventListener(key.slice(2).toLowerCase(),value);
    else if(value!==null&&value!==undefined)node.setAttribute(key,String(value));
  }
  for(const child of children.flat(Infinity))if(child!==null&&child!==undefined)node.append(child instanceof Node?child:document.createTextNode(String(child)));
  return node;
}
function text(value){return new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(value);}
function basisLabel(value){return ({GAAP:'GAAP','non-GAAP':'non-GAAP',operational:'经营指标',derived:'计算指标'})[value];}
function valueLabel(metric,value=metric.value){
  if(value===null||value===undefined)return '暂无数据';
  if(metric.unit==='percent')return `${value.toFixed(1)}%`;
  if(metric.unit==='currency_per_share')return new Intl.NumberFormat('zh-CN',{style:'currency',currency:metric.currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
  if(metric.unit==='currency'){
    const unit=metric.currency==='USD'?'美元':metric.currency;
    return Math.abs(value)>=1e8?`${text(value/1e8)} 亿${unit}`:`${text(value)} ${unit}`;
  }
  return text(value);
}
function periodLabel(report){return `FY${report.period.fiscal_year} ${report.period.fiscal_period}`;}
function dateLabel(date,precision='second'){return new Intl.DateTimeFormat('zh-CN',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',...(precision==='date'?{}:{hour:'2-digit',minute:'2-digit',hour12:false})}).format(new Date(date))+(precision==='date'?'（仅披露日期）':' ET');}
function changeLabel(comparison){
  if(!comparison)return '暂无可比数据';
  const prefix=comparison.type==='yoy'?'同比':'环比';
  if(comparison.change_pp!==null)return `${prefix} ${comparison.change_pp>0?'+':''}${text(comparison.change_pp)} 个百分点`;
  if(comparison.change_pct!==null)return `${prefix} ${comparison.change_pct>0?'+':''}${text(comparison.change_pct)}%`;
  return comparison.unavailable_reason;
}
function evidenceButtons(ids,report){
  return el('span',{class:'source-buttons'},ids.map(id=>el('button',{type:'button',class:'source-button','aria-label':`查看原文依据 ${id}`,'aria-pressed':state.evidence===id,onclick:()=>{state.evidence=id;render();document.getElementById('evidence-inspector')?.scrollIntoView({block:'nearest',behavior:'instant'});}},`依据 ${id.replace(/^E/,'')}`)));
}
function sectionHeading(title,label){return el('div',{class:'section-title'},el('h2',{},title),label?el('span',{class:'section-label'},label):null);}
function selectedReport(){
  const periods=periodsFor(dataset.reports,state.company);
  if(!periods.some(report=>report.report_id===state.report)){state.report=periods[0]?.report_id??null;state.revision=null;}
  const revisions=revisionsFor(dataset.reports,state.report);
  const selected=revisions.find(report=>report.revision===Number(state.revision))??revisions[0];
  state.revision=selected?.revision??null;
  if(selected&&!selected.evidence.some(item=>item.id===state.evidence))state.evidence=selected.evidence[0]?.id??null;
  return selected;
}
function persist(){
  const params=new URLSearchParams({company:state.company??'',tab:state.tab});
  if(state.report){params.set('report',state.report);params.set('revision',state.revision);}
  const next=params.toString();
  if(location.hash.slice(1)!==next)location.hash=next;
}
function readHash(){
  const params=new URLSearchParams(location.hash.slice(1));
  if(dataset.companies.some(company=>company.id===params.get('company')))state.company=params.get('company');
  state.report=params.get('report');state.revision=Number(params.get('revision'))||null;
  state.tab=tabs.some(([id])=>id===params.get('tab'))?params.get('tab'):'overview';
}
function renderCompanies(){
  const term=search.value.trim().toLocaleLowerCase();
  const matches=dataset.companies.filter(company=>`${company.name} ${company.ticker}`.toLocaleLowerCase().includes(term));
  document.getElementById('company-count').textContent=`${matches.length} / ${dataset.companies.length}`;
  companies.replaceChildren(...matches.map(company=>{
    const latest=periodsFor(dataset.reports,company.id)[0];
    return el('button',{type:'button',class:'company-button','aria-current':state.company===company.id,'data-company':company.id,onclick:()=>{state.company=company.id;state.report=null;state.revision=null;state.evidence=null;render();persist();}},el('span',{},company.name),el('small',{},company.ticker,el('span',{},latest?periodLabel(latest):'暂无报告')));
  }));
  if(!matches.length)companies.append(el('p',{class:'rail-caption',role:'status'},'没有匹配的公司'));
}
function renderHeader(report){
  const periods=periodsFor(dataset.reports,state.company);
  const periodSelect=el('select',{id:'period-select','aria-label':'选择财季',onChange:event=>{state.report=event.target.value;state.revision=null;state.evidence=null;render();persist();document.getElementById('period-select').focus();}},periods.map(item=>el('option',{value:item.report_id},periodLabel(item))));
  periodSelect.value=report.report_id;
  const revisionSelect=el('select',{id:'revision-select','aria-label':'选择分析版本',onChange:event=>{state.revision=Number(event.target.value);state.evidence=null;render();persist();document.getElementById('revision-select').focus();}},revisionsFor(dataset.reports,report.report_id).map(item=>el('option',{value:item.revision},`v${item.revision} · ${({initial:'公告初版',material_update:'补充更新',correction:'更正',reanalysis:'重新分析'})[item.revision_reason]}`)));
  revisionSelect.value=report.revision;
  return el('div',{class:'report-heading'},
    el('div',{class:'heading-text'},el('div',{},el('p',{class:'eyebrow'},'QUARTERLY RESEARCH / 季度经营研究'),el('h1',{},report.company.name,el('span',{class:'company-ticker'},report.company.ticker))),el('div',{class:'meta-line'},el('span',{},`报告期 ${report.period.start} — ${report.period.end}`),el('span',{},`披露 ${dateLabel(report.published_at,report.published_at_precision)}`),el('span',{},`信息截至 ${dateLabel(report.as_of)}`))),
    el('div',{class:'selectors'},el('label',{},'财报期间',periodSelect),el('label',{},'分析版本',revisionSelect)));
}
function renderMetrics(report){
  const keys=['revenue','gross_margin','diluted_eps','free_cash_flow'];
  const chosen=[...keys.map(key=>report.metrics.find(metric=>metric.key===key)).filter(Boolean),...report.metrics.filter(metric=>!keys.includes(metric.key))].slice(0,4);
  return el('div',{class:'metrics-grid','aria-label':'关键财务指标'},chosen.map(metric=>el('button',{type:'button',class:'metric-card','aria-label':`${metric.label} ${valueLabel(metric)}，查看依据`,onclick:()=>{state.evidence=metric.evidence_ids[0];render();document.getElementById('evidence-inspector')?.scrollIntoView({block:'nearest',behavior:'instant'});}},el('span',{class:'metric-label'},metric.label),el('span',{class:'metric-value'},valueLabel(metric)),el('span',{class:'metric-bottom'},el('span',{class:`comparison${!metric.comparisons.length?' unavailable':''}`},changeLabel(metric.comparisons[0])),el('span',{class:'evidence-hint'},'依据 ↗')))));
}
function overview(report){
  return [
    el('section',{class:'summary'},el('p',{class:'section-label'},'THE QUARTER IN FOCUS / 本季观察'),el('p',{class:'summary-text'},report.summary.text),evidenceButtons(report.summary.evidence_ids,report)),
    el('section',{},sectionHeading('经营变化','FACTS & INTERPRETATION'),el('div',{class:'finding-list'},report.findings.map(item=>el('article',{class:'finding'},el('span',{class:`finding-kind ${item.kind}`},kindLabels[item.kind]),el('div',{},el('p',{class:'finding-text'},item.text),evidenceButtons(item.evidence_ids,report)))))),
    report.segments.length?el('section',{},sectionHeading('业务拆解','BUSINESS DRIVERS'),report.segments.map(item=>el('article',{class:'segment'},el('h3',{},item.name),el('p',{},item.text),evidenceButtons(item.evidence_ids,report)))):null,
    el('section',{},sectionHeading('管理层指引','FORWARD LOOK'),report.guidance.length?report.guidance.map(item=>el('article',{class:'segment'},el('h3',{},`${item.target_period} · ${item.label}`),el('p',{},`${valueLabel(item,item.low)} — ${valueLabel(item,item.high)}`),el('p',{class:'rail-caption'},`${item.basis} · ${item.period_start??'起始日期未明确'} — ${item.period_end??'期末日期未明确'} · 管理层预期，尚未实现`),evidenceButtons(item.evidence_ids,report))):el('p',{class:'rail-caption'},'当前材料中没有可展示的已验证指引。')),
    report.follow_ups.length?el('section',{},sectionHeading('继续跟踪','NEXT QUARTER'),report.follow_ups.map(item=>el('article',{class:'followup'},el('h3',{},item.question),el('p',{},item.update),el('p',{class:'next-check'},`下次验证：${item.next_check}`),evidenceButtons(item.evidence_ids,report)))):null
  ];
}
function metricsTable(report){
  return el('section',{},sectionHeading('财务数据与口径','FINANCIAL DETAILS'),el('div',{class:'table-wrap'},el('table',{},el('caption',{class:'sr-only'},'本期核心财务指标、上年同季与比较口径'),el('thead',{},el('tr',{},['指标 / 口径','本期','上年同季','同比','上季','环比','依据'].map(label=>el('th',{scope:'col'},label)))),el('tbody',{},report.metrics.map(metric=>{
    const comparison=metric.comparisons.find(item=>item.type==='yoy');const qoq=metric.comparisons.find(item=>item.type==='qoq');
    return el('tr',{},el('td',{},metric.label,el('small',{class:'definition'},`${basisLabel(metric.basis)} · ${metric.period_type==='instant'?'时点':'单期'}`),metric.definition?el('small',{class:'definition'},metric.definition):null,metric.missing_reason?el('small',{class:'definition'},metric.missing_reason):null),el('td',{},valueLabel(metric)),el('td',{},valueLabel(metric,comparison?.baseline_value??null)),el('td',{},changeLabel(comparison)),el('td',{},valueLabel(metric,qoq?.baseline_value??null)),el('td',{},changeLabel(qoq)),el('td',{},evidenceButtons([...new Set([...metric.evidence_ids,...(comparison?.baseline_evidence_ids??[]),...(qoq?.baseline_evidence_ids??[])])],report)));
  })))),el('p',{class:'chart-caption'},'金额保留披露币种；利润率差值使用百分点。缺失值不按零处理。'));
}
function svgNode(tag,attributes={},content){
  const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
  if(content!==undefined)node.textContent=content;
  return node;
}
function historyView(report){
  const history=historyFor(dataset.reports,report);
  const keys=report.metrics.map(metric=>metric.key);
  if(!keys.includes(state.metric))state.metric=keys[0];
  const metric=report.metrics.find(item=>item.key===state.metric);
  const select=el('select',{'aria-label':'历史趋势指标',onChange:event=>{state.metric=event.target.value;render();}},report.metrics.map(item=>el('option',{value:item.key},item.label)));
  select.value=metric.key;
  const section=el('section',{class:'chart-section'},el('div',{class:'section-title'},el('h2',{},'历季经营轨迹'),select));
  const observations=history.map(item=>({report:item,metric:item.metrics.find(m=>m.key===metric.key)}));
  const compatible=item=>item.metric&&item.metric.basis===metric.basis&&item.metric.currency===metric.currency&&item.metric.unit===metric.unit&&item.metric.period_type===metric.period_type&&item.metric.value!==null&&((item.report.period.fiscal_period==='FY')===(report.period.fiscal_period==='FY'));
  const valid=observations.filter(compatible);
  if(valid.length){
    const width=window.innerWidth<700?Math.max(245,Math.min(570,workspace.clientWidth-72)):570,height=240,left=75,right=23,top=22,bottom=48;
    const values=valid.map(item=>item.metric.value);let min=Math.min(...values),max=Math.max(...values);
    const pad=Math.max((max-min)*.2,Math.abs(max)*.04,0.01);min-=pad;max+=pad;
    const start=Date.parse(history[0].period.end),end=Date.parse(history.at(-1).period.end);
    const x=date=>left+(end===start?(width-left-right)/2:(Date.parse(date)-start)/(end-start)*(width-left-right));
    const y=value=>top+(max-value)/(max-min)*(height-top-bottom);
    const svg=svgNode('svg',{viewBox:`0 0 ${width} ${height}`,class:'history-chart',role:'img','aria-label':`${metric.label} 历史趋势，仅使用当前报告信息截至时间之前的数据`});
    for(let tick=0;tick<3;tick++){
      const value=min+(max-min)*tick/2,position=y(value);
      svg.append(svgNode('line',{x1:left,x2:width-right,y1:position,y2:position,stroke:'#e4e9e6','stroke-width':1}));
      const label=metric.unit==='currency'?`${text(value/1e8)} 亿`:metric.unit==='percent'?`${value.toFixed(1)}%`:text(value);
      svg.append(svgNode('text',{x:left-10,y:position+4,'text-anchor':'end',fill:'#68777b','font-size':11},label));
    }
    let previous=null;
    for(const item of observations){
      if(!compatible(item)){previous=null;continue;}
      const cx=x(item.report.period.end),cy=y(item.metric.value);
      const gap=previous?(Date.parse(item.report.period.end)-Date.parse(previous.date))/86400000:0;
      if(previous&&gap<=(report.period.fiscal_period==='FY'?400:130))svg.append(svgNode('line',{x1:previous.x,y1:previous.y,x2:cx,y2:cy,stroke:'#1e5b56','stroke-width':2.5}));
      const circle=svgNode('circle',{cx,cy,r:4.5,fill:'#1e5b56'});circle.append(svgNode('title',{},`${periodLabel(item.report)}：${valueLabel(item.metric)}`));svg.append(circle);
      svg.append(svgNode('text',{x:cx,y:height-20,'text-anchor':'middle',fill:'#68777b','font-size':11},item.report.period.fiscal_period));
      previous={x:cx,y:cy,date:item.report.period.end};
    }
    section.append(svg);
  }else section.append(el('p',{class:'rail-caption'},'暂无口径可比的历史数据。'));
  section.append(el('p',{class:'chart-caption'},`${metric.label} · ${metric.currency??metric.unit} · ${basisLabel(metric.basis)} · 按实际报告期末日期排列。仅展示当时已知的历史版本。`));
  const table=el('table',{},el('thead',{},el('tr',{},['财季','期末日期',metric.label,'版本'].map(label=>el('th',{scope:'col'},label)))),el('tbody',{},observations.map(item=>el('tr',{},el('td',{},periodLabel(item.report)),el('td',{},item.report.period.end),el('td',{},compatible(item)?valueLabel(item.metric):'缺失或不可比'),el('td',{},`v${item.report.revision}`)))));
  return [section,el('section',{},sectionHeading('历史数据','POINT-IN-TIME'),el('div',{class:'table-wrap'},table))];
}
function sourcesView(report){
  return el('section',{},sectionHeading('材料与原文依据','SOURCE LIBRARY'),report.sources.map(source=>el('article',{class:'source-item'},el('h3',{},source.title),el('p',{class:'source-caption'},`披露 ${dateLabel(source.published_at,source.published_at_precision)} · 采集 ${dateLabel(source.fetched_at)}`),report.evidence.filter(item=>item.source_id===source.id).map(item=>el('div',{},el('p',{class:'evidence-location'},`${item.id} · ${item.locator}`),el('blockquote',{},item.quote))),el('a',{href:source.url,target:'_blank',rel:'noopener noreferrer',class:'external-source'},`${dataset.mode==='demo'?'查看演示链接':'打开官方原文'} ↗`))));
}
function rightRail(report){
  const item=report.evidence.find(item=>item.id===state.evidence)??report.evidence[0];
  const source=report.sources.find(source=>source.id===item.source_id);
  return el('aside',{class:'right-rail','aria-label':'材料状态与原文依据'},
    el('section',{class:'rail-card'},el('h2',{},'本版材料范围'),el('div',{class:'coverage-list'},Object.entries(report.coverage).map(([type,status])=>el('div',{class:'coverage-row'},el('span',{},coverageLabels[type]),el('span',{class:`coverage-state ${status}`},`${status==='available'?'✓ ':''}${coverageStates[status]}`)))),el('p',{class:'rail-footnote'},`分析 v${report.revision} · 完成于 ${dateLabel(report.analyzed_at)}`)),
    el('section',{class:'rail-card evidence-card',id:'evidence-inspector','aria-live':'polite'},el('p',{class:'section-label'},`SOURCE EVIDENCE / ${item.id}`),el('h2',{},'回到原文'),el('p',{class:'source-caption'},source.title),el('blockquote',{},item.quote),el('p',{class:'evidence-location'},item.locator),el('a',{href:source.url,target:'_blank',rel:'noopener noreferrer',class:'external-source'},`${dataset.mode==='demo'?'查看演示链接':'打开官方原文'} ↗`),dataset.mode==='demo'?el('p',{class:'rail-caption'},'虚构材料，仅用于验证页面与数据结构。'):null),
    el('section',{class:'limitations'},el('h2',{},'阅读边界'),el('ul',{},report.limitations.map(item=>el('li',{},item)))));
}
function render(){
  const report=selectedReport();
  renderCompanies();
  if(!report){
    const company=dataset.companies.find(item=>item.id===state.company);
    workspace.replaceChildren(el('section',{class:'empty-state'},el('p',{class:'eyebrow'},'RESEARCH ARCHIVE'),el('h1',{},company?.name??'财报档案'),el('p',{},'暂无已验证的财报分析。生成并通过校验的报告会在下次页面更新时出现在这里。')));
    return;
  }
  const nav=el('div',{class:'tabs',role:'tablist','aria-label':'财报视图'},tabs.map(([id,label])=>el('button',{type:'button',class:'tab',role:'tab',id:`tab-${id}`,'aria-controls':'report-panel','aria-selected':state.tab===id,tabindex:state.tab===id?'0':'-1',onclick:()=>{state.tab=id;render();persist();document.getElementById(`tab-${id}`).focus();},onKeydown:event=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();let index=tabs.findIndex(([key])=>key===state.tab);
    index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    state.tab=tabs[index][0];render();persist();document.getElementById(`tab-${state.tab}`).focus();
  }},label)));
  const contents=state.tab==='metrics'?metricsTable(report):state.tab==='history'?historyView(report):state.tab==='sources'?sourcesView(report):overview(report);
  const panel=el('section',{class:'report-content',id:'report-panel',role:'tabpanel','aria-labelledby':`tab-${state.tab}`},contents);
  workspace.replaceChildren(renderHeader(report),renderMetrics(report),nav,el('div',{class:'content-grid'},panel,rightRail(report)));
}
search.addEventListener('input',renderCompanies);
window.addEventListener('hashchange',()=>{
  const before=JSON.stringify([state.company,state.report,state.revision,state.tab]);
  readHash();
  if(before!==JSON.stringify([state.company,state.report,state.revision,state.tab]))render();
});
readHash();render();
