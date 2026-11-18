// Reuse the site's existing shared anonymous tracker. Report identity is encoded
// in its allowlisted path property; no search terms, query strings or hashes.
(function(){
  if(window.earningsAnalytics)return;
  function disabled(){try{return !['yutaozhou.com','www.yutaozhou.com'].includes(location.hostname)||localStorage.getItem('umami.disabled')==='1'||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;}catch{return true;}}
  const queue=[];let active=null,last=performance.now(),lastVisible=document.visibilityState!=='hidden';const reports=new Map();
  function send(name,data){if(disabled())return;if(window.yzAnalytics?.track)window.yzAnalytics.track(name,data);else if(queue.length<50)queue.push([name,data]);}
  function properties(selection){return{path:`/earnings-lens/${selection.ticker}/${selection.period}/v${selection.revision}`,report_date:selection.end,entry:'navigation'};}
  function tick(checkEnd=true){const now=performance.now();if(active&&lastVisible&&active.tab==='overview')active.state.elapsed+=Math.max(0,now-last);last=now;lastVisible=document.visibilityState!=='hidden';if(!active||!lastVisible||active.tab!=='overview')return;
    const state=active.state;if(state.elapsed>=30000&&!state.engaged){state.engaged=true;send('report_engaged',active.properties);}
    const end=checkEnd&&document.querySelector('[data-analytics-reading-end]');if(!state.complete&&state.elapsed>=3000&&window.scrollY>80&&end&&end.getBoundingClientRect().top<=window.innerHeight){state.complete=true;send('report_complete',active.properties);}
  }
  window.earningsAnalytics={selection(selection){tick(false);if(!selection){active=null;return;}const key=`${selection.report_id}@${selection.revision}`,changed=active?.key!==key;
      if(!reports.has(key))reports.set(key,{elapsed:0,read:false,engaged:false,complete:false});const state=reports.get(key),data=properties(selection);
      if(changed)send('report_open',{...data,entry:active?'navigation':'initial'});
      active={key,tab:selection.tab,state,properties:data};if(selection.tab==='overview'&&!state.read){state.read=true;send('report_read',data);}
    }};
  if(disabled())return;
  if(!window.yzAnalytics){const script=document.createElement('script');script.src='https://yutaozhou.com/js/site-analytics.js';script.defer=true;script.dataset.project='earnings-lens';script.addEventListener('load',()=>{for(const[name,data]of queue.splice(0))send(name,data);});document.head.append(script);}
  setInterval(tick,1000);document.addEventListener('visibilitychange',()=>tick(false));window.addEventListener('scroll',()=>tick(),{passive:true});
  document.addEventListener('click',event=>{const link=event.target.closest?.('a.external-source');if(!link||!active)return;try{const url=new URL(link.href);send('source_click',{...active.properties,destination:url.hostname});}catch{}},true);
})();
