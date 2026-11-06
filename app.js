const $=id=>document.getElementById(id);
const player=$('monitor'), duration=44.2;
const cuts=[['Brand Snap','OpenPlatform-IDE-Brand-Snap.mp4'],['First cut','Openplatform-IDE-explainer.mp4']];
const starts=[0,6.7,13.64,18.86,21.44,25.36,27.56,30.76,34.36,36.1,39.88,42.66];
const titles=['Meet OpenPlatform IDE','Built for flow','Home','Project files','GitHub','Libraries','Boards','Terminal + output','Debug','Settings','GitHub settings','OpenPlatform IDE'];
const scenes=starts.map((start,i)=>({start,end:starts[i+1]??duration,name:titles[i]}));
const tracks={Video:scenes.filter((_,i)=>i!==1).map((s,i)=>({...s,end:i===0?13.64:s.end})),Text:scenes,Voice:[{name:'intro.mp3',start:0,end:13.64},{name:'final.mp3',start:13.64,end:duration}],Music:[{name:'Add music',start:0,end:duration}]};
let cut=0,selected,restoreTime=0;
function time(s){return '00:'+s.toFixed(2).padStart(5,'0')}
function button(label,action,cls){const el=document.createElement('button');el.textContent=label;el.className=cls;el.onclick=action;return el}
function key(){return 'codex-editor:v1:'+cut+':'+selected.track+':'+selected.index}
function refresh(){
 $('clock').textContent=time(player.currentTime)+' / '+time(duration);
 $('needle').style.left='calc(90px + (100% - 90px) * '+Math.min(player.currentTime/duration,1)+')';
 $('play').textContent=player.paused?'▶':'Ⅱ';$('play').ariaLabel=player.paused?'Play':'Pause';
}
function select(track,index,seek=true){
 const clip=tracks[track][index];selected={track,index};
 document.querySelectorAll('.clip').forEach(b=>b.classList.toggle('selected',b.id===track+index));
 const saved=JSON.parse(localStorage.getItem(key())||'null');
 $('kind').textContent=track.toUpperCase()+' TRACK';$('title').textContent=clip.name;
 $('bounds').textContent=time(clip.start)+'  →  '+time(clip.end);
 $('valueLabel').textContent=track==='Text'?'On-screen title':track==='Music'?'Music cue':'Clip name';
 $('value').value=saved?.value??clip.name;$('notes').value=saved?.notes??'';
 $('status').textContent=saved?'Saved edit request · render pending.':'Generate opens scene review and applies your changes.';
 if(seek)player.currentTime=clip.start;
}
async function chooseCut(i){
 document.querySelector("#reviewLink").href=i?"/review/first/":"/review/snap/";cut=i;restoreTime=0;player.src='/media/'+cuts[i][1];
 [...$('cuts').children].forEach((b,j)=>b.classList.toggle('active',j===i));
 select('Video',0,false);
 const project=i?'first':'snap';
 try {const reel=await fetch('/review/'+project+'/reel.json',{cache:'no-store'}).then(r=>r.json());if(cut===i&&reel.version>1)player.src=reel.src}catch{}
}
cuts.forEach(([name],i)=>$('cuts').append(button('▣　'+name,()=>chooseCut(i),'asset')));
tracks.Voice.forEach((clip,i)=>$('audio').append(button('♫　'+clip.name,()=>select('Voice',i),'asset')));
function row(label){const r=document.createElement('div');r.className='row';const title=document.createElement('strong');title.textContent=label;const lane=document.createElement('div');lane.className='lane';r.append(title,lane);$('tracks').append(r);return lane}
const ruler=row('TIME');ruler.classList.add('ruler');
for(let i=0;i<=8;i++){const t=document.createElement('span');t.textContent=time(i*duration/8);ruler.append(t)}
ruler.onclick=e=>{const rect=ruler.getBoundingClientRect();player.currentTime=(e.clientX-rect.left)/rect.width*duration};
for(const [track,clips] of Object.entries(tracks)){
 const lane=row(track);clips.forEach((c,i)=>{const b=button(c.name,()=>select(track,i),'clip '+track);b.id=track+i;b.title=c.name+' · '+time(c.start);b.style.left=c.start/duration*100+'%';b.style.width='calc('+((c.end-c.start)/duration*100)+'% - 2px)';lane.append(b)})
}
const needle=document.createElement('div');needle.id='needle';needle.className='needle';$('tracks').append(needle);
$('generate').onclick=()=>{
 const id=cut?'first':'snap', url='/review/'+id+'/';
 const {track,index}=selected, clip=tracks[track][index];
 const request={time:clip.start,track,name:clip.name,value:$('value').value,notes:$('notes').value};
 sessionStorage.setItem('handoff:'+id,JSON.stringify(request));location.href=url+'#t='+clip.start;
};
$('play').onclick=()=>player.paused?player.play():player.pause();
for(const [id,step] of [['back',-1],['next',1]])$(id).onclick=()=>{player.pause();player.currentTime=Math.max(0,Math.min(duration,player.currentTime+step/30))};
for(const event of ['loadedmetadata','timeupdate','play','pause','seeked'])player.addEventListener(event,refresh);
chooseCut(0);refresh();
