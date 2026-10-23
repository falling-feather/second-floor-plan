import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync,existsSync,readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const compiler = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const result = spawnSync(process.execPath, [compiler], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const name of ['index.html', 'style.css']) {
  copyFileSync(path.join(root, name), path.join(root, 'dist', name));
}
const bundle = await build({ entryPoints:[path.join(root,'src','main.ts')], bundle:true, write:false, format:'iife', target:'es2022', minify:true, legalComments:'inline' });
writeFileSync(path.join(root,'dist','app.js'),bundle.outputFiles[0].text,'utf8');
writeFileSync(path.join(root,'dist','index.html'),readFileSync(path.join(root,'index.html'),'utf8').replace('./src/main.js','./app.js'),'utf8');
console.log('Built: dist/index.html');
const code = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(path.join(root,'index.html'),'utf8')
  .replace('<link rel="stylesheet" href="./style.css" />', () => `<style>${readFileSync(path.join(root,'style.css'),'utf8')}</style>`)
  .replace('<script type="module" src="./src/main.js"></script>', () => `<script>${code}</script>`);
writeFileSync(path.join(root,'dist','second-floor-plan.html'),html,'utf8');
console.log('Offline: dist/second-floor-plan.html');
const sourceAssets=path.join(root,'output','design');
if(existsSync(sourceAssets)){
  mkdirSync(path.join(root,'dist','assets'),{recursive:true});
  for(const file of readdirSync(sourceAssets,{withFileTypes:true}))if(file.isFile())copyFileSync(path.join(sourceAssets,file.name),path.join(root,'dist','assets',file.name));
  const renders=path.join(sourceAssets,'renders');
  if(existsSync(renders)){
    const target=path.join(root,'dist','assets','renders');mkdirSync(target,{recursive:true});
    for(const file of readdirSync(renders,{withFileTypes:true}))if(file.isFile()&&file.name.startsWith('blender-')&&file.name.endsWith('.png'))copyFileSync(path.join(renders,file.name),path.join(target,file.name));
  }
}
