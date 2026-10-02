import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('..',import.meta.url));
function run(args){
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
function files(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(['node_modules','.git','.wrangler'].includes(entry.name))return[];
    const target=path.join(dir,entry.name);
    return entry.isDirectory()?files(target):[target];
  });
}
const all=files(root);
let syntax=0,json=0;
for(const file of all){
  if(/\.(?:js|mjs)$/.test(file)){run(['--check',file]);syntax++;}
  if(file.endsWith('.json')){JSON.parse(fs.readFileSync(file,'utf8'));json++;}
}
console.log(`PASS syntax: ${syntax} JavaScript modules; JSON: ${json} files`);
const bundle=path.join(root,'dist/server/index.js');
const before=fs.readFileSync(bundle);
run(['build.mjs']);
assert.deepEqual(fs.readFileSync(bundle),before,'Generated Worker differs from checked-in bundle. Run npm run build and review the result.');
console.log('PASS generated Worker matches checked-in bundle');
for(const name of ['community-security','study-buffers','room-focus','learner-photos','prepare-photo']){
  console.log(`\nRunning ${name}`);
  run([`tests/${name}.mjs`]);
}
console.log('\nAll offline regression suites passed.');
