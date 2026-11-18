function storedPreference(key,fallback){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
let language=storedPreference('earnings-lens.language','en')==='zh'?'zh':'en';
let themePreference=storedPreference('earnings-lens.theme','auto');
if(!['auto','light','dark'].includes(themePreference))themePreference='auto';
function rememberPreference(key,value){try{localStorage.setItem(key,value);}catch{}}
function applyTheme(){const hour=new Date().getHours();document.documentElement.dataset.theme=themePreference==='auto'?(hour>=19||hour<7?'dark':'light'):themePreference;document.documentElement.dataset.themePreference=themePreference;}
function tx(en,zh){return language==='zh'?zh:en;}
function locale(){return language==='zh'?'zh-CN':'en-US';}
applyTheme();document.documentElement.lang=language==='zh'?'zh-CN':'en';
setInterval(()=>{if(themePreference==='auto')applyTheme();},60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')applyTheme();});

function localizedReport(report){
  if(language==='zh'||!report)return report;
  const edition=dataset.translations?.[`${report.report_id}@${report.revision}`]?.en;
  if(!edition)return report;
  return{...report,summary:{...report.summary,text:edition.summary},findings:report.findings.map((item,i)=>({...item,text:edition.findings[i]})),segments:report.segments.map((item,i)=>({...item,...edition.segments[i]})),guidance:report.guidance.map((item,i)=>({...item,label:edition.guidance[i]})),follow_ups:report.follow_ups.map((item,i)=>({...item,...edition.follow_ups[i]})),limitations:edition.limitations,metrics:report.metrics.map(item=>({...item,...edition.metrics.find(value=>value.key===item.key)}))};
}
