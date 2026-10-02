import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {learnerAPI,photoInfo,recommendCourses} from '../server/learners.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),db=new DatabaseSync(':memory:');
for(const f of fs.readdirSync(root+'/drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync(root+'/drizzle/'+f,'utf8'));
let hook=null;
function statement(sql,args=[]){const stmt=db.prepare(sql);function before(){if(hook&&hook.re.test(sql)){const h=hook;hook=null;h.change();}}return{bind(...a){return statement(sql,a)},async first(){before();return stmt.get(...args)||null},async all(){before();return{results:stmt.all(...args)}},async run(){before();if(/\bRETURNING\b/i.test(sql))return{results:stmt.all(...args),meta:{changes:db.prepare('SELECT changes() n').get().n}};const r=stmt.run(...args);return{results:[],meta:{changes:r.changes,last_row_id:r.lastInsertRowid}}}}}
let putHook=null;const bucket=new Map();const env={DB:{prepare:statement,async batch(qs){db.exec('BEGIN');try{const out=[];for(const q of qs)out.push(await q.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}},FILES:{async put(k,b){bucket.set(k,b.slice());if(putHook)await putHook(k);},async get(k){return bucket.has(k)?{body:bucket.get(k).slice()}:null;},async delete(k){bucket.delete(k);}}};
const failures=[];let checks=0;
function check(name,got,want){checks++;const pass=Array.isArray(want)?want.includes(got):got===want;if(!pass)failures.push({name,got,want});console.log(`${pass?'PASS':'FAIL'} ${name}${pass?'':': '+JSON.stringify({got,want})}`)}
async function token(u){return Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('codetrail-community-v1|'+u))).toString('hex')}
const A='A_PRIVATE_AUTH',B='B_PRIVATE_AUTH',C='C_PRIVATE_AUTH',D='D_PRIVATE_AUTH';const tokens=Object.fromEntries(await Promise.all([A,B,C,D].map(async u=>[u,await token(u)])));
const courses=JSON.parse(fs.readFileSync(root+'/dist/academy-courses.json','utf8'));
async function api(u,body,path='/api/learner',options={}){const headers={...(u?{'oai-authenticated-user-id':u}:{}),...(body?{'content-type':'application/json',origin:'https://local.test'}:{}),...options.headers};if(options.noOrigin)delete headers.origin;const r=await learnerAPI(new Request('https://local.test'+path,{method:options.method||((body===undefined||body===null)?'GET':'POST'),headers,...(body===undefined||body===null?{}:{body:typeof body==='string'?body:JSON.stringify({self:tokens[u],...(body.action==='signal'?{epoch:db.prepare('SELECT rec_epoch FROM learner_preferences WHERE user_id=?').get(u)?.rec_epoch||0}:{}),...(['photo','removePhoto'].includes(body.action)?{photoRevision:db.prepare('SELECT photo_rev FROM learner_preferences WHERE user_id=?').get(u)?.photo_rev||0}:{}),...(body.action==='preferences'?{preferenceRevision:db.prepare('SELECT preference_rev FROM learner_preferences WHERE user_id=?').get(u)?.preference_rev||0}:{}),...body})})}),env,courses,'java-variables');const text=await r.text();let value;try{value=JSON.parse(text)}catch{value={binary:text}}return{status:r.status,headers:r.headers,...value}}
const prefs={publicName:'',location:'',discoverable:false,shareLocation:false,sharePhoto:false,personalize:false};
async function save(u,p){return api(u,{action:'preferences',preferences:{...prefs,...p}})}
function signalCount(u){return db.prepare('SELECT count(*) n FROM recommendation_signals WHERE user_id=?').get(u).n}
const ids={};
for(const path of ['/api/learner','/api/learners','/api/recommendations','/api/avatar?id=x'])check('Anonymous denied '+path,(await api(null,null,path)).status,401);
check('Defaults all off',JSON.stringify((await api(A)).preferences),JSON.stringify(prefs));
check('Blank public name cannot discover',(await save(A,{discoverable:true})).status,400);
check('Wrong session token rejected',(await api(A,{self:tokens[B],action:'personalize',enabled:true})).status,409);
check('Cross-origin rejected',(await api(A,{action:'personalize',enabled:true},undefined,{headers:{origin:'https://evil.test'}})).status,403);
check('Missing origin rejected',(await api(A,{action:'personalize',enabled:true},undefined,{noOrigin:true})).status,403);
check('Wrong content type rejected',(await api(A,{action:'personalize',enabled:true},undefined,{headers:{'content-type':'text/plain'}})).status,415);
for(const [u,p]of [[A,{publicName:'Alice',discoverable:true,personalize:true}],[B,{publicName:'Bob',location:'Secretville',discoverable:true}],[C,{publicName:'Carol',location:'Publicville',discoverable:true,shareLocation:true}],[D,{publicName:'Dana',location:'Hiddenville',discoverable:false,shareLocation:true}]]){const r=await save(u,p);check('Save preferences '+u,r.status,200);ids[u]=r.publicId;}
let directory=await api(A,null,'/api/learners');check('Directory excludes self and non-opt-in',directory.learners.map(x=>x.name).join(','),'Bob,Carol');check('Location omitted when hidden',directory.learners.find(x=>x.name==='Bob').location,'');check('Visible location returned',directory.learners.find(x=>x.name==='Carol').location,'Publicville');
for(const term of ['Secretville','secret','Secret','%','_'])check('Hidden/literal location excluded '+term,(await api(A,null,'/api/learners?location='+encodeURIComponent(term))).learners.length,0);
check('Name match works',(await api(A,null,'/api/learners?q=BOB')).learners[0].name,'Bob');check('Query does not match visible location',(await api(A,null,'/api/learners?q=Publicville')).learners.length,0);check('Visible location filter works',(await api(A,null,'/api/learners?location=PUBLIC')).learners[0].name,'Carol');check('Hidden user name not searchable',(await api(A,null,'/api/learners?q=Dana')).learners.length,0);check('Directory no auth IDs or secret location',JSON.stringify(directory).includes('PRIVATE_AUTH')||JSON.stringify(directory).includes('Secretville'),false);
for(const u of [A,B,C]){db.prepare('INSERT INTO community_profiles VALUES (?,?,?)').run(u,'community-'+u,'Community '+u[0]);db.prepare('INSERT INTO course_enrollments VALUES (?,?,?,?,?)').run('python-dsa|'+u,'python-dsa',u,u===C?0:1,1);}
directory=await api(A,null,'/api/learners');check('Common course exists for visible target',directory.learners.find(x=>x.name==='Bob').commonCourses.join(','),'python-dsa');check('No course link for hidden target',directory.learners.find(x=>x.name==='Carol').commonCourses.length,0);check('No community ID for hidden target',directory.learners.find(x=>x.name==='Carol').communityId,null);db.prepare('DELETE FROM course_enrollments WHERE user_id=?').run(A);check('No common course without viewer membership',(await api(A,null,'/api/learners')).learners.find(x=>x.name==='Bob').commonCourses.length,0);
for(const pair of [[A,B],[B,A]]){db.prepare('INSERT INTO community_blocks VALUES (?,?,?)').run(pair.join('|'),...pair);check('Block excludes target '+pair[0][0],(await api(A,null,'/api/learners')).learners.some(x=>x.name==='Bob'),false);db.exec('DELETE FROM community_blocks');}
check('Personalized status reflects own toggle',(await api(A,null,'/api/recommendations')).personalized,true);check('Other account recommendations not enabled',(await api(B,null,'/api/recommendations')).personalized,false);
for(let i=0;i<35;i++)await api(A,{action:'signal',kind:'search',courseId:'',query:'python '+i});check('Signals bounded to 30',signalCount(A),30);check('Other accounts not touched',signalCount(B),0);await api(B,{action:'signal',kind:'view',courseId:'java-basics',query:''});check('Disabled signal not recorded',signalCount(B),0);
let n=signalCount(A);for(const q of ['secret password','sk-token','a@example.com','12345678'])await api(A,{action:'signal',kind:'search',courseId:'',query:q});check('Obvious secret-like searches ignored',signalCount(A),n);
check('Invalid course rejected',(await api(A,{action:'signal',kind:'view',courseId:'private-course',query:''})).status,400);check('Unknown signal kind rejected',(await api(A,{action:'signal',kind:'learner-search',courseId:'',query:'Bob'})).status,400);
await api(A,{action:'personalize',enabled:false});check('Disable clears history',signalCount(A),0);await api(A,{action:'personalize',enabled:true});await api(A,{action:'signal',kind:'search',courseId:'',query:'python'});await api(A,{action:'clearSignals'});check('Clear removes history',signalCount(A),0);
hook={re:/^INSERT INTO recommendation_signals/,change:()=>db.prepare('UPDATE learner_preferences SET personalize=0 WHERE user_id=?').run(A)};await api(A,{action:'signal',kind:'search',courseId:'',query:'java'});check('Write-time opt-out race respected',signalCount(A),0);check('Disable race hook consumed',hook,null);
// Clear racing a signal: a request already passed front-end consent and reaches INSERT after clear.
await api(A,{action:'personalize',enabled:true});hook={re:/^INSERT INTO recommendation_signals/,change:()=>{db.prepare('UPDATE learner_preferences SET rec_epoch=rec_epoch+1 WHERE user_id=?').run(A);db.prepare('DELETE FROM recommendation_signals WHERE user_id=?').run(A)}};await api(A,{action:'signal',kind:'search',courseId:'',query:'python before clear'});check('Clear epoch prevents stale pending signal',signalCount(A),0);
// Use a real tiny PNG from a known fixture generated in memory, no third-party photo.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
check('Valid PNG dimensions',photoInfo(png,'image/png').width,1);
const upload=await api(B,{action:'photo',dataUrl:'data:image/png;base64,'+png.toString('base64')});check('Photo upload succeeds',upload.status,200);check('Photo URL not raw bucket URL',upload.photoUrl.startsWith('/api/avatar?id='),true);check('Photo response no raw key/auth ID',JSON.stringify(upload).includes('profile-photos')||JSON.stringify(upload).includes('PRIVATE_AUTH'),false);
check('Private own photo readable',(await api(B,null,upload.photoUrl)).status,200);check('Private photo hidden from other account',(await api(A,null,upload.photoUrl)).status,404);
await save(B,{publicName:'Bob',location:'Secretville',discoverable:true,sharePhoto:true});for(const path of [upload.photoUrl,'/api/avatar?community=community-'+B]){const r=await api(A,null,path);check('Visible photo readable '+path,r.status,200);check('Photo no-store cache',r.headers.get('cache-control'),'private, no-store');check('HEAD allowed '+path,(await api(A,null,path,{method:'HEAD'})).status,200);}
for(const pair of [[A,B],[B,A]]){db.prepare('INSERT INTO community_blocks VALUES (?,?,?)').run(pair.join('|'),...pair);check('Blocked old URL denied '+pair[0][0],(await api(A,null,upload.photoUrl)).status,404);check('Blocked HEAD denied '+pair[0][0],(await api(A,null,upload.photoUrl,{method:'HEAD'})).status,404);db.exec('DELETE FROM community_blocks');}
await save(B,{publicName:'Bob',discoverable:true,sharePhoto:false});check('Visibility revoked denies old URL',(await api(A,null,upload.photoUrl)).status,404);await save(B,{publicName:'Bob',discoverable:false,sharePhoto:true});check('Directory opt-out hides photo',(await api(A,null,upload.photoUrl)).status,404);await api(B,{action:'removePhoto'});check('Photo removed from bucket',bucket.size,0);check('Removed own photo unavailable',(await api(B,null,upload.photoUrl)).status,404);
check('Invalid image rejected',(await api(B,{action:'photo',dataUrl:'data:image/png;base64,'+Buffer.from('this is not a photo but more than thirty characters').toString('base64')})).status,400);
check('Oversized JSON rejected',(await api(B,'{"self":"'+tokens[B]+'","x":"'+'a'.repeat(270000)+'"}')).status,413);
for(const p of ['/api/learner','/api/learners','/api/recommendations'])check('Private JSON no-store '+p,(await api(A,null,p)).headers.get('cache-control'),'private, no-store');

// Adversarial image metadata and dimension fixtures.
function rejects(f){try{f();return false}catch{return true}}
const bigPng=Buffer.from(png);bigPng.writeUInt32BE(513,16);check('Oversized PNG dimensions rejected',rejects(()=>photoInfo(bigPng,'image/png')),true);
const pngMetadata=Buffer.concat([png.subarray(0,png.length-12),Buffer.from([0,0,0,4]),Buffer.from('tEXt'),Buffer.from('GPS!'),Buffer.alloc(4),png.subarray(png.length-12)]);check('PNG metadata chunks rejected',rejects(()=>photoInfo(pngMetadata,'image/png')),true);
const webp=Buffer.alloc(34);webp.write('RIFF');webp.writeUInt32LE(26,4);webp.write('WEBP',8);webp.write('VP8L',12);webp.writeUInt32LE(5,16);webp[20]=47;webp.write('ALPH',26);
check('Bounded WebP header accepted',photoInfo(webp,'image/webp').width,1);
const webpMetadata=Buffer.concat([webp,Buffer.from('EXIF'),Buffer.alloc(4)]);webpMetadata.writeUInt32LE(webpMetadata.length-8,4);check('WebP EXIF rejected',rejects(()=>photoInfo(webpMetadata,'image/webp')),true);
const bigWebp=Buffer.from(webp);bigWebp.writeUInt32LE(512,21);check('Oversized WebP dimensions rejected',rejects(()=>photoInfo(bigWebp,'image/webp')),true);
const mismatch=Buffer.from(webp);mismatch.writeUInt32LE(12,4);check('Mismatched RIFF length rejected',rejects(()=>photoInfo(mismatch,'image/webp')),true);
// A real overlapping upload/remove request; bucket PUT pauses before D1 attachment.
let releaseUpload,noticeUpload;let seen=new Promise(r=>noticeUpload=r),pause=new Promise(r=>releaseUpload=r);
putHook=async()=>{noticeUpload();await pause};
let pending=api(B,{action:'photo',dataUrl:'data:image/png;base64,'+png.toString('base64')});await seen;
const removed=await api(B,{action:'removePhoto'});check('Concurrent removal returns success',removed.status,200);releaseUpload();await pending;putHook=null;
check('Delayed upload cannot restore removed photo',(await api(B)).photoUrl,null);
// Two replacement requests begun against the same metadata must not leak objects.
await api(B,{action:'removePhoto'});bucket.clear();seen=new Promise(r=>noticeUpload=r);pause=new Promise(r=>releaseUpload=r);let puts=0;putHook=async()=>{puts++;if(puts===1){noticeUpload();await pause}};
pending=api(B,{action:'photo',dataUrl:'data:image/png;base64,'+png.toString('base64')});await seen;await api(B,{action:'photo',dataUrl:'data:image/png;base64,'+png.toString('base64')});releaseUpload();await pending;putHook=null;
check('Parallel replacements retain only one R2 object',bucket.size,1);

// An old settings form must never restore consent revoked by a newer tab.
const stalePreferences=await api(A);await save(A,{publicName:'Alice',discoverable:false,sharePhoto:false,shareLocation:false});
const staleSave=await api(A,{action:'preferences',preferenceRevision:stalePreferences.preferenceRevision,preferences:{...stalePreferences.preferences,publicName:'Alice renamed'}});check('Stale privacy form rejected',staleSave.status,409);check('Stale form did not restore directory discovery',(await api(A)).preferences.discoverable,false);
const oldRevision=(await api(A)).preferenceRevision;await api(A,{action:'personalize',enabled:false});check('Personalization toggle invalidates old form',(await api(A,{action:'preferences',preferenceRevision:oldRevision,preferences:{...prefs,publicName:'Alice',personalize:true}})).status,409);
check('Photo mutation missing revision rejected',(await api(B,{action:'removePhoto',photoRevision:null})).status,409);

await save(B,{publicName:'Élodie',location:'ZÜRICH',discoverable:true,shareLocation:true});
check('Exact Unicode learner name search works',(await api(A,null,'/api/learners?q='+encodeURIComponent('Élodie'))).learners.length,1);
check('Unicode visible location search works',(await api(A,null,'/api/learners?location='+encodeURIComponent('Zürich'))).learners.length,1);
console.log('\n'+JSON.stringify({checks,passed:checks-failures.length,failures},null,2));process.exitCode=failures.length?1:0;


// Metadata normalization integration checks, real encodable fixture bytes.
const fixtureRoot=fileURLToPath(new URL('./fixtures',import.meta.url));
const manifest=JSON.parse(fs.readFileSync(fixtureRoot+'/fixtures.json','utf8'));
for(const [name,expect] of Object.entries(manifest)){
 const image=fs.readFileSync(fixtureRoot+'/'+name),type=name.endsWith('.png')?'image/png':'image/webp';
 const result=await api(B,{action:'photo',dataUrl:'data:'+type+';base64,'+image.toString('base64')});
 check('Fixture API '+name,result.status,expect.should_accept_after_sanitize?200:400);
 if(result.status===200){
  const key=db.prepare('SELECT photo_key FROM learner_preferences WHERE user_id=?').get(B).photo_key;
  const saved=Buffer.from(bucket.get(key));
  check('Stored size bounded '+name,saved.length<=180000,true);
  check('Stored private sentinel removed '+name,saved.includes(Buffer.from('PRIVATE-DO-NOT-STORE')),false);
  const chunks=[];let pos=type==='image/png'?8:12;
  while(pos<saved.length){let len,tag;if(type==='image/png'){len=saved.readUInt32BE(pos);tag=saved.toString('ascii',pos+4,pos+8);pos+=len+12;}else{tag=saved.toString('ascii',pos,pos+4);len=saved.readUInt32LE(pos+4);pos+=8+len+(len%2);}chunks.push(tag);}
  check('Stored personal metadata chunks removed '+name,chunks.some(c=>['iCCP','tEXt','zTXt','iTXt','eXIf','tIME','ICCP','EXIF','XMP '].includes(c)),false);
  if(type==='image/webp'&&chunks.includes('VP8X'))check('Removed WebP metadata flags cleared '+name,(saved[20]&0x2c)===0,true);
 }
}
check('PNG mislabeled as WebP rejected',(await api(B,{action:'photo',dataUrl:'data:image/webp;base64,'+png.toString('base64')})).status,400);
console.log('\nFINAL '+JSON.stringify({checks,passed:checks-failures.length,failures},null,2));process.exitCode=failures.length?1:0;
