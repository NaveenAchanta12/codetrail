import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const {communityAPI}=await import(pathToFileURL(path.join(root,'server/community.mjs')));
const db=new DatabaseSync(':memory:');
for(const file of fs.readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync(path.join(root,'drizzle',file),'utf8'));
let hook=null;
function statement(sql,args=[]){const stmt=db.prepare(sql);function before(){if(hook&&hook.re.test(sql)){const h=hook;hook=null;h.change();}}return{bind(...a){return statement(sql,a)},async first(){before();return stmt.get(...args)||null},async all(){before();return{results:stmt.all(...args)}},async run(){before();if(/\bRETURNING\b/i.test(sql))return{results:stmt.all(...args),meta:{changes:db.prepare('SELECT changes() n').get().n}};const r=stmt.run(...args);return{results:[],meta:{changes:r.changes,last_row_id:r.lastInsertRowid}}}}}
const env={DB:{prepare:statement,async batch(qs){db.exec('BEGIN');try{const out=[];for(const q of qs)out.push(await q.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}}};
const failures=[];let checks=0;
function check(name,got,want){checks++;const pass=Array.isArray(want)?want.includes(got):got===want;if(!pass)failures.push({name,got,want});console.log(`${pass?'PASS':'FAIL'} ${name}${pass?'':': '+JSON.stringify({got,want})}`)}
async function identity(u){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('codetrail-community-v1|'+u)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
const tokens={};for(const u of ['AliceSecretAuth','BobSecretAuth','CarolSecretAuth','A','B','C'])tokens[u]=await identity(u);
async function api(u,body,params='course=python-dsa',origin=true){const h={};if(u)h['oai-authenticated-user-id']=u;if(body){h['content-type']='application/json';if(origin)h.origin='https://local.test'}const r=await communityAPI(new Request('https://local.test/api/community?'+params,{method:body?'POST':'GET',headers:h,...(body?{body:JSON.stringify({self:tokens[u],courseId:'python-dsa',...body})}:{})}),env,[]);return {status:r.status,...await r.json()}}
function clear(){hook=null;for(const t of ['community_blocks','community_messages','community_reports','study_members','study_connections','study_rooms','course_enrollments','community_profiles'])db.exec('DELETE FROM '+t)}
check('Anonymous API denied',(await api(null)).status,401);
const A='AliceSecretAuth',B='BobSecretAuth',C='CarolSecretAuth',ids={};
for(const u of [A,B,C]){check('Join '+u,(await api(u,{action:'join',handle:u.slice(0,5),discoverable:true})).status,200);ids[u]=(await api(u)).me.id}
check('Cross-origin POST denied',(await api(A,{action:'message',body:'csrf'},undefined,false)).status,403);
await api(A,{action:'connect',learnerId:ids[B]});const con=(await api(B)).connections[0].id;
check('Requester cannot accept',(await api(A,{action:'connectionReply',connectionId:con,status:'accepted'})).status,[403,404,409]);
check('Recipient can accept',(await api(B,{action:'connectionReply',connectionId:con,status:'accepted'})).status,200);
const room=(await api(A,{action:'createRoom',title:'Private test room',language:'python',code:'PRIVATE_SHARED_CODE'})).roomId,rp='course=python-dsa&room='+room;
check('No room read before invitation',(await api(B,null,rp)).status,[403,404]);
check('Owner can invite',(await api(A,{action:'invite',roomId:room,learnerId:ids[B]})).status,200);
check('Viewer can read',(await api(B,null,rp)).status,200);
check('Viewer cannot edit',(await api(B,{action:'saveCode',roomId:room,code:'bad',revision:1})).status,403);
check('Owner can grant editor',(await api(A,{action:'role',roomId:room,learnerId:ids[B],role:'editor'})).status,200);
check('Editor can save',(await api(B,{action:'saveCode',roomId:room,code:'updated',revision:1})).status,200);
check('Stale revision cannot overwrite',(await api(A,{action:'saveCode',roomId:room,code:'stale',revision:1})).status,409);
check('Nonmember room read denied',(await api(C,null,rp)).status,[403,404]);
check('Editor cannot grant',(await api(B,{action:'invite',roomId:room,learnerId:ids[C]})).status,403);
await api(A,{action:'message',roomId:room,body:'PRIVATE_ROOM_COMMENT'});const roomData=await api(A,null,rp);
check('Room comments absent from course feed',JSON.stringify(await api(C)).includes('PRIVATE_ROOM_COMMENT'),false);
check('Raw auth IDs absent from shared JSON',JSON.stringify(roomData).includes('SecretAuth'),false);
check('Other author cannot delete',(await api(B,{action:'deleteMessage',messageId:roomData.messages[0].id})).status,403);
check('Block succeeds',(await api(A,{action:'block',learnerId:ids[B]})).status,200);
check('Blocked peer room denied',(await api(B,null,rp)).status,[403,404]);
check('Owner may remove blocked member',(await api(A,{action:'role',roomId:room,learnerId:ids[B],role:'remove'})).status,200);
await api(A,{action:'unblock',learnerId:ids[B]});
check('Unblock does not restore old room grant',(await api(B,null,rp)).status,[403,404]);
function fixture(){clear();for(const u of ['A','B','C']){db.prepare('INSERT INTO community_profiles VALUES (?,?,?)').run(u,'public-'+u,'Learner '+u);db.prepare('INSERT INTO course_enrollments VALUES (?,?,?,?,?)').run('python-dsa|'+u,'python-dsa',u,1,1)}db.exec("INSERT INTO study_connections VALUES ('conn','pair','python-dsa','A','B','accepted',1);INSERT INTO study_rooms VALUES ('room','python-dsa','A','Room title','python','initial',1,1,0);INSERT INTO study_members VALUES ('room|B','room','B','editor')")}
async function race(name,re,change,u,body,want=[403,404,409]){fixture();hook={re,change};const r=await api(u,body);check(name+' hook triggered',hook===null,true);check(name,r.status,want);hook=null}
await race('Save races member revocation',/^UPDATE study_rooms SET code/,()=>db.exec("DELETE FROM study_members WHERE user_id='B'"),'B',{action:'saveCode',roomId:'room',revision:1,code:'unauthorized'});
await race('Save races owner unenrollment',/^UPDATE study_rooms SET code/,()=>db.exec("DELETE FROM course_enrollments WHERE user_id='A'"),'B',{action:'saveCode',roomId:'room',revision:1,code:'unauthorized'});
await race('Comment races member revocation',/^INSERT INTO community_messages/,()=>db.exec("DELETE FROM study_members WHERE user_id='B'"),'B',{action:'message',roomId:'room',body:'unauthorized'});
await race('Invite races block',/^INSERT INTO study_members/,()=>db.exec("INSERT INTO community_blocks VALUES ('A|B','A','B')"),'A',{action:'invite',roomId:'room',learnerId:'public-B'});
await race('Editor grant races block',/^UPDATE study_members SET role/,()=>db.exec("INSERT INTO community_blocks VALUES ('A|B','A','B')"),'A',{action:'role',roomId:'room',learnerId:'public-B',role:'editor'});
fixture();db.exec('DELETE FROM study_connections');hook={re:/^INSERT INTO study_connections/,change:()=>db.exec("UPDATE course_enrollments SET discoverable=0 WHERE user_id='B'")};check('Connection respects concurrent discovery opt-out',(await api('A',{action:'connect',learnerId:'public-B'})).status,[403,404,409]);check('Connect race hook triggered',hook===null,true);hook=null;
// Build in memory; never changes the Site checkout.
let output='';const prev=process.cwd();process.chdir(root);const shim={readdirSync:fs.readdirSync,readFileSync:fs.readFileSync,existsSync:fs.existsSync,mkdirSync(){},writeFileSync(p,body){output=body}};new Function('fs',fs.readFileSync('build.mjs','utf8').replace("import fs from 'node:fs';",''))(shim);process.chdir(prev);const worker=new Function(output.replace('export default {','return {'))();
const pages=['/learn','/learn.html','/hub.html','/dashboard','/catalog','/profile','/progress','/academy','/academy.html','/tasks','/achievements','/memory','/community','/community.html'],data=['/course-python.json','/curriculum.json','/academy-courses.json'];
for(const p of ['/',...pages,...data])for(const signedIn of [false,true]){const r=await worker.fetch(new Request('https://local.test'+p,{headers:signedIn?{'oai-authenticated-user-id':'user'}:{}}),{});check(`Route ${p} ${signedIn?'signed-in':'anonymous'}`,r.status,signedIn||p==='/'?200:pages.includes(p)?302:401)}
// Minimal DOM regression tests target the state transitions, not browser layout.
const source=fs.readFileSync(path.join(root,'dist/community.js'),'utf8').replace(/;start\(\);/,`;globalThis.__ct_test={poll,bind,refresh,markDirty:g=>dirty.add(g),setContext(s,who,rid=''){state=s;self=who;roomId=rid;revision=s.room?.revision||0;},getDrafts:()=>sharedDrafts};`);
function uiHarness(payloads,elementIds){const elements=new Map(elementIds.map(id=>[id,{id,value:'',checked:false,hidden:false,disabled:false,readOnly:false,textContent:'',innerHTML:'',dataset:{},querySelector(){return{disabled:false}},focus(){},select(){}}]));let i=0;const c={window:{},console,URLSearchParams,TextEncoder,Uint8Array,AbortController,crypto,setTimeout,clearTimeout,setInterval(){},addEventListener(){},location:{search:'',pathname:'/community',hash:''},history:{replaceState(){}},confirm:()=>true,prompt:()=>null,navigator:{},document:{hidden:false,getElementById:id=>elements.get(id)||null,querySelectorAll:selector=>selector==='#hub-content button'?[...elements.values()].filter(e=>['save-shared','post-comment','copy-shared','load-drafts'].includes(e.id)):selector==='#hub-content textarea,#hub-content input'?[...elements.values()].filter(e=>['shared-code','room-code','comment-body'].includes(e.id)):[],addEventListener(){}},fetch:async()=>({ok:true,status:200,json:async()=>payloads[Math.min(i++,payloads.length-1)]})};vm.createContext(c);vm.runInContext(source,c);if(!c.__ct_test)throw Error('UI test instrumentation marker changed; review test harness');return{c,e:elements,t:c.__ct_test}}
const pollUI=uiHarness([{self:tokens.A,enrolled:false,me:{id:'public-A',handle:'A'}}],['hub-content','breadcrumb','hub-account','community-course','community-feedback','shared-code','save-shared','post-comment','poll-status']);pollUI.e.get('hub-content').innerHTML='ORIGINAL_EDITOR_DOM';pollUI.e.get('shared-code').value='UNSAVED_LOCAL_CODE';pollUI.t.setContext({enrolled:true,room:{code:'saved',revision:1,role:'editor',closed:false},messages:[]},tokens.A,'room');await pollUI.t.poll();check('Unenrollment poll keeps unsaved editor DOM',pollUI.e.get('hub-content').innerHTML,'ORIGINAL_EDITOR_DOM');check('Unenrollment poll disables save',pollUI.e.get('save-shared').disabled,true);
const draftUI=uiHarness([{account:'B',state:{drafts:{py01:'PRIVATE_B_DRAFT'}}},{account:'B',state:{codeDrafts:{}}}],['community-feedback','room-form','load-drafts','saved-drafts','room-code','room-language']);draftUI.t.setContext({enrolled:true,room:null},tokens.A);draftUI.t.bind();await draftUI.e.get('load-drafts').onclick();check('Draft loader rejects switched account',draftUI.t.getDrafts().length,0);

const remoteRoom=(code,revision)=>({id:'room',title:'Test room',language:'python',code,revision,updatedAt:1,closed:false,role:'owner',owner:{id:'public-A',handle:'A'},members:[]});
const completeState=(code,revision)=>({self:tokens.A,enrolled:true,discoverable:true,me:{id:'public-A',handle:'A'},room:remoteRoom(code,revision),messages:[],connections:[],members:[],rooms:[],blocks:[]});
const roomElements=['hub-content','breadcrumb','hub-account','community-course','community-feedback','shared-code','save-shared','copy-shared','reload-shared','room-revision','remote-update','room-status','post-comment','poll-status'];
const staleUI=uiHarness([completeState('OLD_REMOTE_CODE',1)],roomElements);staleUI.t.setContext(completeState('NEW_SAVED_CODE',2),tokens.A,'room');staleUI.e.get('shared-code').value='NEW_SAVED_CODE';await staleUI.t.poll();check('Older poll cannot replace newer saved code',staleUI.e.get('shared-code').value,'NEW_SAVED_CODE');
const refreshUI=uiHarness([completeState('remote',1)],roomElements);refreshUI.t.setContext(completeState('remote',1),tokens.A,'room');refreshUI.t.markDirty('code');refreshUI.e.get('shared-code').value='TYPED_BEFORE_REFRESH';let release;const gate=new Promise(r=>release=r);refreshUI.c.fetch=async()=>{await gate;return{ok:true,status:200,json:async()=>completeState('remote',1)}};const pending=refreshUI.t.refresh();refreshUI.e.get('shared-code').value='TYPED_DURING_REFRESH';release();await pending;check('Refresh preserves edits typed while request pending',refreshUI.e.get('shared-code').value,'TYPED_DURING_REFRESH');
console.log('\n'+JSON.stringify({checks,passed:checks-failures.length,failures},null,2));process.exitCode=failures.length?1:0;
