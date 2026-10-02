import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/learner-features.js',import.meta.url),'utf8').replace('window.LearnerFeatures={','window.__preparePhoto=preparePhoto;window.LearnerFeatures={');
const fakePng=fs.readFileSync(new URL('./fixtures/clean.png',import.meta.url));
const fakeJpg=Buffer.from([255,216,255,224,0,16,74,70,73,70,0]);
const fakeWebp=fs.readFileSync(new URL('./fixtures/clean.webp',import.meta.url));
function file({name='photo.jpg',type='image/jpeg',size=100000,bytes=fakeJpg}={}) {
 const body=new Blob([bytes],{type});return {name,type,size,arrayBuffer:()=>body.arrayBuffer(),slice:(...a)=>body.slice(...a)};
}
async function run({input={},width=4000,height=3000,decodeError=false,pngFallback=false,largeFirstBlob=false}={}) {
 const calls=[];let revoked=false;
 const c={window:{},document:{getElementById(){return null},createElement(tag){const canvas={width:0,height:0,getContext(){return{drawImage(...args){calls.push(args.slice(1))}}},toBlob(cb,type,q){const bytes=pngFallback?fakePng:fakeWebp; const blob=new Blob([bytes],{type:pngFallback?'image/png':'image/webp'});if(largeFirstBlob&&calls.length===1)Object.defineProperty(blob,'size',{value:176000});cb(blob)}};return canvas;}},console,AbortController,setTimeout,clearTimeout,addEventListener(){},URL:{createObjectURL(){return'blob:test'},revokeObjectURL(){revoked=true}},Image:class{naturalWidth=width;naturalHeight=height;set src(v){queueMicrotask(()=>decodeError?this.onerror():this.onload())}},FileReader:class{readAsDataURL(blob){blob.arrayBuffer().then(a=>{this.result='data:'+blob.type+';base64,'+Buffer.from(a).toString('base64');this.onload()}).catch(()=>this.onerror())}},fetch:async()=>{throw Error('No initial API in isolated test')},Uint8Array,DataView,Blob};vm.createContext(c);vm.runInContext(source,c);
 try{const result=await c.window.__preparePhoto(file(input));return{ok:true,type:result.split(';')[0],revoked,calls};}catch(e){return{ok:false,error:e.message,revoked,calls};}
}
const cases=[
 ['Standard JPEG',{},true],
 ['JPEG above former 5 MiB limit',{input:{size:6*1024*1024}},true],
 ['JPEG exactly 20 MiB',{input:{size:20*1024*1024}},true],
 ['JPEG over 20 MiB',{input:{size:20*1024*1024+1}},false],
 ['JPEG with empty MIME',{input:{type:''}},true],
 ['JPEG legacy MIME',{input:{type:'image/jpg'}},true],
 ['PNG generic MIME',{input:{name:'photo.png',type:'application/octet-stream',bytes:fakePng}},true],
 ['Native HEIC decode',{input:{name:'photo.heic',type:'image/heic',bytes:Buffer.from('0000ftypheic')}},true],
 ['8064-pixel phone JPEG',{width:8064,height:6048},true],
 ['Extreme dimensions',{width:20000,height:10000},false],
 ['Browser PNG fallback',{pngFallback:true},true],
 ['Second thumbnail resize',{largeFirstBlob:true},true],
 ['Unreadable JPEG',{decodeError:true},false]
];
let failed=0;for(const [name,opts,want]of cases){const got=await run(opts);const pass=got.ok===want;if(!pass)failed++;console.log(JSON.stringify({case:name,pass,want,got}));}
console.log(JSON.stringify({cases:cases.length,passed:cases.length-failed,failed}));process.exitCode=failed?1:0;
