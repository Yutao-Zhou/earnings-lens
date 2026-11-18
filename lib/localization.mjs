import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const text=value=>typeof value==='string'&&value.trim()&&value.length<=12000;
export function validateTranslation(report,translation){
  const errors=[],check=(condition,message)=>{if(!condition)errors.push(message);};
  check(translation?.report_id===report.report_id&&translation?.revision===report.revision,'Translation identity mismatch');
  const en=translation?.en;if(!en){errors.push('English translation is required');return errors;}
  check(text(en.summary),'English summary is missing');
  for(const key of ['findings','segments','guidance','follow_ups','limitations','metrics'])check(Array.isArray(en[key])&&en[key].length===report[key].length,`English ${key} must match the report`);
  if(errors.length)return errors;
  for(const key of ['findings','guidance','limitations'])check(en[key].every(text),`Invalid English ${key}`);
  check(en.segments.every(item=>text(item.name)&&text(item.text)),'Invalid English segments');
  check(en.follow_ups.every(item=>text(item.question)&&text(item.update)&&text(item.next_check)),'Invalid English follow-ups');
  check(en.metrics.every(item=>report.metrics.some(m=>m.key===item.key)&&text(item.label)&&Object.keys(item).every(key=>['key','label','definition','missing_reason'].includes(key))),'Translations may not override financial metric values');
  check(new Set(en.metrics.map(item=>item.key)).size===report.metrics.length,'Duplicate translated metric key');
  return errors;
}
export async function loadTranslations(root,reports){
  const folder=path.join(root,'data/translations');let files=[];try{files=await readdir(folder);}catch(error){if(error.code!=='ENOENT')throw error;}
  const result={};for(const report of reports){const name=`${report.report_id}-v${report.revision}.json`;
    if(!files.includes(name)){if(report.data_kind==='production')throw new Error(`English translation missing: ${name}`);continue;}
    const translation=JSON.parse(await readFile(path.join(folder,name),'utf8'));const errors=validateTranslation(report,translation);if(errors.length)throw new Error(`${name}: ${errors.join('; ')}`);result[`${report.report_id}@${report.revision}`]={en:translation.en};
  }return result;
}
export async function loadAnnouncements(root){try{const announcements=JSON.parse(await readFile(path.join(root,'config/announcements.json'),'utf8'));if(!Array.isArray(announcements)||announcements.some(a=>!text(a.id)||!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||!text(a.en?.title)||!text(a.en?.text)||!text(a.zh?.title)||!text(a.zh?.text)))throw new Error('Invalid bilingual announcements');return announcements.sort((a,b)=>b.date.localeCompare(a.date));}catch(error){if(error.code==='ENOENT')return[];throw error;}}
