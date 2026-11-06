import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const jobs=new Map();
const mediaTypes={'.mp3':'audio','.wav':'audio','.m4a':'audio','.png':'image','.jpg':'image','.jpeg':'image'};
function run(program,args,options,input){
 return new Promise((resolve,reject)=>{
  const child=spawn(program,args,{...options,stdio:['pipe','pipe','pipe'],timeout:240000});
  let tail='';
  for(const stream of [child.stdout,child.stderr])stream.on('data',s=>tail=(tail+s).slice(-2500));
  child.stdin.on('error',()=>{});child.stdin.end(input);
  child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(tail||'Process stopped')));
 });
}
function apply(m,changes,approved){
 const elements=new Map(m.scenes.flatMap(s=>s.els.map(e=>[e.id,{e,s}])));
 for(const [key,v] of Object.entries(changes)){
  const [id,field]=key.split('.'), entry=elements.get(id);
  if(entry){
   const {e,s}=entry;if(approved.includes(s.id))throw Error('Unlock '+s.name+' before editing it.');
   if(field==='copy' && typeof v==='string' && v.length<=500)e.props.copy.v=v;
   else if(field==='size' && Number.isFinite(v)&&v>=10&&v<=140)e.props.size.v=v;
   else if(field==='@time' && Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)&&v[0]>=0&&v[1]<=m.duration&&v[1]-v[0]>=1/30)e.t=v;
   else if(field==='@box' && Array.isArray(v)&&v.length===4&&v.every(n=>Number.isFinite(n)&&n>=0&&n<=100)&&v[2]>0&&v[3]>0)e.box=v;
   else throw Error('Unsupported value for '+key);
  }else if(key.startsWith('brand.color.') && /^#[0-9a-f]{6}$/i.test(v)){m.brand.colors.find(c=>c.id===key.slice(12)).v=v}
  else if(key==='brand.font.body' && typeof v==='string')m.brand.fonts[0].v=v;
  else if(key==='audio.music'&&(v===null||m.assets.some(a=>a.type==='audio'&&a.id===v)))m.audio.music=v;
  else if(key==='brand.logo' && (v===null||m.assets.some(a=>a.id===v&&a.type==='image')))m.brand.logo=v;
  else if(key==='audio.sfxVol'&&Number.isFinite(v)&&v>=0&&v<=1)m.audio.sfxVol=v;
  else if(key==='audio.musicVol'&&Number.isFinite(v)&&v>=0&&v<=1)m.audio.musicVol=v;
  else throw Error('Unsupported edit: '+key);
 }
}
export async function review(req,res,url,root,files){
 const match=/^\/review\/(snap|first)\/(.*)$/.exec(url);
 if(!match)return false;
 const [,id,route]=match,dir=path.join(root,id),active=path.join(dir,'current.json');
 const load=()=>JSON.parse(fs.readFileSync(fs.existsSync(active)?active:path.join(dir,'base.json')));
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));return true};
 const m=load();
 const assets=path.join(root,'assets');fs.mkdirSync(assets,{recursive:true});
 for(const item of fs.readdirSync(assets,{withFileTypes:true})){
  const type=mediaTypes[path.extname(item.name).toLowerCase()];if(!item.isFile()||!type)continue;
  const asset='/assets/'+encodeURIComponent(item.name);files.set(asset,path.join(assets,item.name));if(!m.assets.some(a=>a.id===asset))m.assets.push({id:asset,type,name:item.name,mine:true});
 }
 if(m.version>1)files.set(m.src,path.join(dir,path.basename(m.src)));
 if(route==='asset'&&req.method==='POST'){
  if(req.headers.origin!=='http://'+req.headers.host || !['localhost','127.0.0.1'].includes(req.headers.host.split(':')[0]))return json({error:'Local editor required'},403);
  const name=path.basename(decodeURIComponent(req.headers['x-asset-name']||''));
  if(!name||!mediaTypes[path.extname(name).toLowerCase()])return json({error:'Choose PNG, JPG, MP3, WAV or M4A.'},400);
  const chunks=[];let size=0;
  for await(const c of req){size+=c.length;if(size>32*1024*1024)return json({error:'32 MB file limit'},413);chunks.push(c)}
  const target=path.join(assets,name);
  try{fs.writeFileSync(target,Buffer.concat(chunks),{flag:'wx'})}catch{return json({error:'File name already exists'},409)}
  return json({saved:true})
 }
 if(!route){files.set(url,path.join(root,'review.html'));return false}
 if(route==='reel.json')return json(m);
 if(route==='job'&&req.method==='GET')return json(jobs.get(id)||{state:'idle'});
 if(route!=='generate'||req.method!=='POST')return json({error:'Unknown route'},404);
 if(req.headers.origin!=='http://'+req.headers.host||!['127.0.0.1','localhost'].includes(req.headers.host.split(':')[0])||req.headers['content-type']!=='application/json')return json({error:'Local editor request required'},403);
 try{
  let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)return json({error:'Review too large'},413)}
  const {version,changes={},approved=[],feedback=''}=JSON.parse(body);
  if(jobs.get(id)?.state==='running'||version!==load().version)return json({error:'A generation is running or the revision has changed.'},409);
  apply(m,changes,approved);
  const uid=randomUUID(), output=path.join(dir,uid+'.mp4'),draft=path.join(dir,uid+'.json');
  const job={state:'running',line:feedback?'Codex is interpreting your notes':'Rendering the edit'};jobs.set(id,job);
  (async()=>{
   try{
    if(feedback){
     const response=path.join(dir,uid+'.reply');
     await run('codex',['exec','--ephemeral','--skip-git-repo-check','--sandbox','read-only','-o',response,'-'],{cwd:dir},'Translate the review into JSON only: {"changes":{"element-id.copy":"new text","element-id.size":30,"element-id.@time":[0,3],"element-id.@box":[x,y,width,height],"brand.color.primary":"#abcdef"},"unsupported":""}. Use existing ids only. Do not use tools. For any request you cannot represent, explain in unsupported. All box coordinates are percentages. Manifest: '+JSON.stringify(m)+'\nReview: '+feedback);
     const result=JSON.parse(fs.readFileSync(response,'utf8').replace(/^\s*```(?:json)?|```\s*$/g,''));fs.unlinkSync(response);
     if(result.unsupported||!Object.keys(result.changes||{}).length)throw Error(result.unsupported||'No applicable changes from Codex');
     apply(m,result.changes,approved);
    }
    job.line='Rendering MP4';m.version++;m.src='/renders/'+id+'/'+uid+'.mp4';fs.writeFileSync(draft,JSON.stringify(m,null,2));
    const music=m.audio.music?files.get(m.audio.music):'-';
    await run('swift',['-suppress-warnings',path.join(dir,'render.swift'),path.resolve(process.env.CODEX_EDITOR_MEDIA_DIR || path.join(root,'media')),output,draft,music,m.brand.logo?files.get(m.brand.logo):'-'],{cwd:dir});
    if(fs.statSync(output).size<1000)throw Error('Empty export');
    fs.renameSync(draft,active);files.set(m.src,output);job.state='done';job.line='Version '+m.version+' ready';
   }catch(error){job.state='error';job.line=error.message;fs.rmSync(draft,{force:true});fs.rmSync(output,{force:true})}
  })();
  return json(job,202);
 }catch(error){return json({error:error.message},400)}
}
