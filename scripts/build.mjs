import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadDataset, projectRoot } from '../lib/data.mjs';
import { renderSite } from '../lib/render.mjs';

export async function build({ root = projectRoot, dataRoot = root, output = path.join(root, 'dist/index.html') } = {}) {
  const data = await loadDataset(dataRoot);
  const [css, catalog, app] = await Promise.all(['src/styles.css', 'lib/catalog.mjs', 'src/app.js'].map(file => readFile(path.join(root,file),'utf8')));
  const javascript = `(() => {\n'use strict';\n${catalog.replace(/^export /gm,'')}\n${app}\n})();`;
  if (/<\/script/i.test(javascript) || /<\/style/i.test(css)) throw new Error('An application asset terminates its inline HTML container');
  const html = renderSite(data, css, javascript);
  await mkdir(path.dirname(output), { recursive:true });
  const temporary = `${output}.${process.pid}.tmp`;
  try { await writeFile(temporary,html,'utf8'); await rename(temporary,output); }
  finally { await rm(temporary,{force:true}); }
  return {output,bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex'),reports:data.reports.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await build())); }
  catch(error) { console.error(error.message); process.exitCode=1; }
}
