import {review} from './review.mjs';
import http from 'node:http';
import {createReadStream,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const files=new Map(['index.html','style.css','app.js'].map(f=>['/'+f,path.join(root,f)]));
for(const f of ['OpenPlatform-IDE-Brand-Snap.mp4','Openplatform-IDE-explainer.mp4','intro.mp3','final.mp3'])
  files.set('/media/'+f,path.join(process.env.CODEX_EDITOR_MEDIA_DIR || path.join(root,'media'),f));
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
http.createServer(async(req,res)=>{
  const url=req.url.split('?')[0];
  try{if(await review(req,res,url,root,files))return}catch(e){res.writeHead(500).end('Project unavailable');return}
  const file=files.get(url==='/'?'/index.html':url);
  if(!file || !['GET','HEAD'].includes(req.method)){res.writeHead(404).end();return}
  try{
    const size=statSync(file).size,range=req.headers.range;
    let start=0,end=size-1,status=200;
    if(range){const m=/^bytes=(\d+)-(\d*)$/.exec(range);
      if(!m || +m[1]>=size || (m[2] && +m[2]<+m[1])){res.writeHead(416,{'Content-Range':'bytes */'+size}).end();return}
      start=+m[1];end=m[2]?Math.min(+m[2],end):end;status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`)}
    res.writeHead(status,{'Content-Type':types[path.extname(file)],'Content-Length':end-start+1,'Accept-Ranges':'bytes'});
    if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res)
  }catch{res.writeHead(404).end()}
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Codex Editor listening on localhost'));
