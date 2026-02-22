// State
let AC=null;
function getAC(){
  if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();
  if(AC.state==='suspended')AC.resume();
  return AC;
}
let masterGain;
const D={
  a:{buf:null,src:null,gainNode:null,eq:{lo:null,mid:null,hi:null},filter:null,analyser:null,
     playing:false,startedAt:0,pausedAt:0,pitch:1,bpm:null,key:null,duration:0,gainVal:0.8,cuePoint:0,filename:''},
  b:{buf:null,src:null,gainNode:null,eq:{lo:null,mid:null,hi:null},filter:null,analyser:null,
     playing:false,startedAt:0,pausedAt:0,pitch:1,bpm:null,key:null,duration:0,gainVal:0.8,cuePoint:0,filename:''}
};
let platterAngle={a:0,b:0};

// Audio chain
function buildChain(deck){
  const ac=getAC();
  if(!masterGain){masterGain=ac.createGain();masterGain.gain.value=0.82;masterGain.connect(ac.destination);}
  const d=D[deck];
  d.eq.lo=ac.createBiquadFilter();d.eq.lo.type='lowshelf';d.eq.lo.frequency.value=250;d.eq.lo.gain.value=0;
  d.eq.mid=ac.createBiquadFilter();d.eq.mid.type='peaking';d.eq.mid.frequency.value=1200;d.eq.mid.Q.value=0.8;d.eq.mid.gain.value=0;
  d.eq.hi=ac.createBiquadFilter();d.eq.hi.type='highshelf';d.eq.hi.frequency.value=4000;d.eq.hi.gain.value=0;
  d.filter=ac.createBiquadFilter();d.filter.type='lowpass';d.filter.frequency.value=20000;
  d.analyser=ac.createAnalyser();d.analyser.fftSize=256;d.analyser.smoothingTimeConstant=0.8;
  d.gainNode=ac.createGain();d.gainNode.gain.value=d.gainVal;
  d.eq.lo.connect(d.eq.mid);d.eq.mid.connect(d.eq.hi);d.eq.hi.connect(d.filter);
  d.filter.connect(d.analyser);d.analyser.connect(d.gainNode);d.gainNode.connect(masterGain);
}

// BPM detection
function detectBPM(buf){
  const data=buf.getChannelData(0),sr=buf.sampleRate,hop=Math.round(sr/100);
  const rms=[];
  for(let i=0;i<data.length-hop;i+=hop){
    let s=0;for(let j=0;j<hop;j++)s+=data[i+j]*data[i+j];
    rms.push(Math.sqrt(s/hop));
  }
  const thresh=rms.reduce((a,b)=>a+b,0)/rms.length*1.4;
  const onsets=[];
  for(let i=1;i<rms.length-1;i++){
    if(rms[i]>thresh&&rms[i]>=rms[i-1]&&rms[i]>=rms[i+1]){
      if(!onsets.length||i-onsets[onsets.length-1]>10)onsets.push(i);
    }
  }
  if(onsets.length<4)return 128;
  const gaps=[];
  for(let i=1;i<Math.min(onsets.length,40);i++)gaps.push(onsets[i]-onsets[i-1]);
  gaps.sort((a,b)=>a-b);
  const med=gaps[Math.floor(gaps.length/2)]*hop/sr;
  const raw=60/med;
  // normalize to 100-180
  let bpm=raw;
  while(bpm<100)bpm*=2;
  while(bpm>180)bpm/=2;
  return Math.round(bpm);
}

// File upload
async function handleUpload(evt,deck){
  const file=evt.target.files[0];if(!file)return;
  getAC();if(!D[deck].gainNode)buildChain(deck);
  const d=D[deck];if(d.playing)stopDeck(deck);
  setBanner('&#9881; Loading <strong>'+file.name+'</strong>...');
  try{
    const ab=await file.arrayBuffer();
    d.buf=await AC.decodeAudioData(ab);
    d.duration=d.buf.duration;
    d.filename=file.name.replace(/\.[^.]+$/,'');
    d.pitch=1;d.pausedAt=0;d.bpm=null;d.key=null;
    document.getElementById('pitch-'+deck).value=0;
    document.getElementById('pval-'+deck).textContent='0%';
    document.getElementById('tname-'+deck).textContent=d.filename;
    document.getElementById('tbpm-'+deck).textContent='Detecting...';
    document.getElementById('tkey-'+deck).textContent='Key —';
    document.getElementById('bnum-'+deck).textContent='...';
    document.getElementById('wfh-'+deck).style.display='none';
    drawWave(deck);
    // BPM in background
    setTimeout(()=>{
      const bpm=detectBPM(d.buf);
      d.bpm=bpm;
      document.getElementById('tbpm-'+deck).textContent=bpm+' BPM';
      document.getElementById('bnum-'+deck).textContent=bpm;
      document.getElementById('sb-b'+deck).textContent=bpm;
      updateHarmony();
      setBanner('&#127925; <strong>'+d.filename+'</strong> &#8594; Deck '+deck.toUpperCase()+'  |  <em>'+bpm+' BPM</em> detected. Hit Play.');
    },50);
  }catch(e){setBanner('&#9888; Failed to load — try a different format.');console.error(e);}
}

function drawWave(deck){
  const d=D[deck];if(!d.buf)return;
  const cv=document.getElementById('wfc-'+deck),wrap=document.getElementById('wf-'+deck);
  cv.width=(wrap.offsetWidth||300)*window.devicePixelRatio;cv.height=88;
  cv.style.width=(wrap.offsetWidth||300)+'px';cv.style.height='44px';
  const c=cv.getContext('2d'),W=cv.width,H=cv.height,ch=d.buf.getChannelData(0);
  const n=300,bs=Math.floor(ch.length/n),data=new Float32Array(n);
  for(let i=0;i<n;i++){let s=0;for(let j=0;j<bs;j++)s+=Math.abs(ch[i*bs+j]);data[i]=s/bs;}
  const mx=Math.max(...data)||1;for(let i=0;i<n;i++)data[i]/=mx;
  c.fillStyle='#030305';c.fillRect(0,0,W,H);
  const isA=deck==='a',bW=W/n;
  data.forEach((v,i)=>{
    const bH=v*H*.88,y=(H-bH)/2;
    const g=c.createLinearGradient(0,y,0,y+bH);
    g.addColorStop(0,isA?'rgba(218,48,134,.85)':'rgba(245,197,89,.85)');
    g.addColorStop(1,isA?'rgba(86,33,101,.18)':'rgba(218,48,134,.18)');
    c.fillStyle=g;c.fillRect(i*bW+.5,y,Math.max(1,bW-.5),bH);
  });
}

// Playback
function startDeck(deck){
  const ac=getAC(),d=D[deck];if(!d.buf)return;
  if(d.src){try{d.src.stop();}catch(e){}}
  const src=ac.createBufferSource();src.buffer=d.buf;src.playbackRate.value=d.pitch;src.loop=true;
  src.connect(d.eq.lo);
  const off=(d.pausedAt%d.duration+d.duration)%d.duration;
  src.start(0,off);d.src=src;d.startedAt=ac.currentTime-off/d.pitch;d.playing=true;
}
function stopDeck(deck){
  const d=D[deck];if(d.src){d.pausedAt=getCT(deck);try{d.src.stop();}catch(e){}d.src=null;}
  d.playing=false;
}
function getCT(deck){
  const d=D[deck];if(!d.buf)return 0;
  if(d.playing)return((AC.currentTime-d.startedAt)*d.pitch)%d.duration;
  return(d.pausedAt+d.duration)%d.duration;
}
function fmt(s){const m=Math.floor(s/60),sc=Math.floor(s%60);return m+':'+(sc<10?'0':'')+sc;}

function togglePlay(deck){
  const d=D[deck];if(!d.buf){toast('Upload a track to Deck '+deck.toUpperCase()+' first.');return;}
  if(d.playing){
    stopDeck(deck);
    document.getElementById('pbtn-'+deck).textContent='\u25b6 PLAY';
    document.getElementById('pbtn-'+deck).classList.remove('playing');
  }else{
    startDeck(deck);
    document.getElementById('pbtn-'+deck).textContent='\u23f8 PAUSE';
    document.getElementById('pbtn-'+deck).classList.add('playing');
  }
}
function nudge(deck,sec){
  const d=D[deck];if(!d.buf)return;
  d.pausedAt=getCT(deck)+sec;if(d.playing)startDeck(deck);
}
function hitCue(deck){
  const d=D[deck];if(!d.buf)return;
  if(!d.playing){
    d.pausedAt=d.cuePoint;
    if(d.playing)startDeck(deck);
    toast('Deck '+deck.toUpperCase()+' jumped to cue: '+fmt(d.cuePoint));
  }else{
    d.cuePoint=getCT(deck);
    document.getElementById('cbtn-'+deck).classList.add('on');
    toast('CUE set at '+fmt(d.cuePoint));
  }
}
document.addEventListener('keydown',e=>{
  if(e.key==='1')hitCue('a');
  if(e.key==='2')hitCue('b');
  if(e.key===' '&&e.target.tagName!=='INPUT'){e.preventDefault();
    if(D.a.buf)togglePlay('a');}
});

function pitchChange(deck){
  const v=parseFloat(document.getElementById('pitch-'+deck).value);
  D[deck].pitch=1+v/100;
  if(D[deck].src&&D[deck].playing)D[deck].src.playbackRate.value=D[deck].pitch;
  document.getElementById('pval-'+deck).textContent=(v>=0?'+':'')+v.toFixed(1)+'%';
  const bpm=D[deck].bpm;
  if(bpm){const disp=(bpm*D[deck].pitch).toFixed(1);document.getElementById('bnum-'+deck).textContent=disp;document.getElementById('sb-b'+deck).textContent=disp;}
  document.getElementById('sync-btn').classList.remove('on');
  checkBeatmatch();
}

function syncDecks(){
  if(!D.a.bpm||!D.b.bpm){toast('Load both decks first.');return;}
  const ratio=D.a.bpm*D.a.pitch/D.b.bpm;
  const pct=(ratio-1)*100,cl=Math.max(-8,Math.min(8,pct));
  document.getElementById('pitch-b').value=cl;D.b.pitch=1+cl/100;
  if(D.b.src&&D.b.playing)D.b.src.playbackRate.value=D.b.pitch;
  const disp=(D.b.bpm*D.b.pitch).toFixed(1);
  document.getElementById('bnum-b').textContent=disp;document.getElementById('sb-bb').textContent=disp;
  document.getElementById('pval-b').textContent=(cl>=0?'+':'')+cl.toFixed(1)+'%';
  document.getElementById('sync-btn').classList.add('on');
  document.getElementById('sync-btn').innerHTML='&#128274;<span class="sync-sub">LOCKED</span>';
  toast('BPM Synced \u2192 Nudge to align beats');
}

function xfChange(){
  const v=parseFloat(document.getElementById('xf-range').value)/100;
  const gA=Math.cos(v*Math.PI/2),gB=Math.cos((1-v)*Math.PI/2);
  if(D.a.gainNode)D.a.gainNode.gain.value=gA*D.a.gainVal;
  if(D.b.gainNode)D.b.gainNode.gain.value=gB*D.b.gainVal;
  drawXFRing(v);
}

// EQ
function buildEQ(deck){
  const c=document.getElementById('eq-'+deck);c.innerHTML='';
  const col=deck==='a'?'var(--rose)':'var(--gold)';
  [{id:'lo',lbl:'LOW'},{id:'mid',lbl:'MID'},{id:'hi',lbl:'HIGH'}].forEach(band=>{
    const uid='eq-'+deck+'-'+band.id;
    const div=document.createElement('div');div.className='eq-band';
    div.innerHTML='<div class="eq-band-lbl">'+band.lbl+'</div><canvas class="knob-c" id="'+uid+'" width="44" height="44" title="Drag up/down"></canvas><div class="knob-val" id="'+uid+'-val">0</div><input type="range" class="eq-sl" id="'+uid+'-sl" min="-12" max="12" step=".5" value="0">';
    c.appendChild(div);
    setTimeout(()=>{
      const canvas=document.getElementById(uid);
      const sl=document.getElementById(uid+'-sl');
      const valEl=document.getElementById(uid+'-val');
      const node=D[deck].eq[band.id];
      function setG(g){
        if(node)node.gain.value=g;
        const ctx=canvas.getContext('2d');ctx.clearRect(0,0,44,44);
        const cx=22,cy=22,r=16;
        ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#0a0a10';ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1.5;ctx.stroke();
        const sa=-140*Math.PI/180-Math.PI/2,ea=g/12*280*Math.PI/180-140*Math.PI/180-Math.PI/2;
        ctx.beginPath();ctx.arc(cx,cy,r,sa,ea,g<0);
        ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.stroke();
        ctx.beginPath();ctx.arc(cx+r*Math.cos(ea),cy+r*Math.sin(ea),3,0,Math.PI*2);
        ctx.fillStyle=col;ctx.fill();
        valEl.textContent=(g>=0?'+':'')+g.toFixed(1);sl.value=g;
      }
      setG(0);
      let drag=false,sy=0,sg=0;
      canvas.addEventListener('mousedown',e=>{drag=true;sy=e.clientY;sg=node?node.gain.value:0;e.preventDefault();});
      document.addEventListener('mousemove',e=>{if(!drag)return;const g=Math.max(-12,Math.min(12,sg+(sy-e.clientY)/50*12));setG(g);});
      document.addEventListener('mouseup',()=>{drag=false;});
      canvas.addEventListener('dblclick',()=>setG(0));
      sl.addEventListener('input',()=>setG(parseFloat(sl.value)));
    },50);
  });
}
buildEQ('a');buildEQ('b');

// Gain faders
function buildGainFader(deck){
  const th=document.getElementById('gain-'+deck+'-th'),fill=document.getElementById('gain-'+deck+'-fill');
  let drag=false,sy=0,sp=0.7,p=0.7;
  th.addEventListener('mousedown',e=>{drag=true;sy=e.clientY;sp=p;e.preventDefault();});
  document.addEventListener('mousemove',e=>{
    if(!drag)return;
    p=Math.max(0,Math.min(1,sp+(sy-e.clientY)/80));
    th.style.bottom=(p*100)+'%';fill.style.height=(p*100)+'%';
    D[deck].gainVal=p;
    if(D[deck].gainNode){const v=parseFloat(document.getElementById('xf-range').value)/100;
      const g=deck==='a'?Math.cos(v*Math.PI/2):Math.cos((1-v)*Math.PI/2);
      D[deck].gainNode.gain.value=p*g;}
  });
  document.addEventListener('mouseup',()=>{drag=false;});
}
buildGainFader('a');buildGainFader('b');

// XF ring
function drawXFRing(v){
  const cv=document.getElementById('xf-ring'),c=cv.getContext('2d'),cx=36,cy=36,r=26;
  c.clearRect(0,0,72,72);
  c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=3;c.stroke();
  const aA=Math.PI*2*(1-v);
  c.beginPath();c.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+aA);c.strokeStyle='rgba(218,48,134,.75)';c.lineWidth=3;c.stroke();
  c.beginPath();c.arc(cx,cy,r,-Math.PI/2+aA,-Math.PI/2+Math.PI*2);c.strokeStyle='rgba(245,197,89,.75)';c.lineWidth=3;c.stroke();
  c.beginPath();c.arc(cx,cy,5,0,Math.PI*2);c.fillStyle=v<.5?'rgba(218,48,134,.9)':'rgba(245,197,89,.9)';c.fill();
}
drawXFRing(0.5);

// Platters
function drawPlatter(deck){
  const d=D[deck],cv=document.getElementById('plt-'+deck),c=cv.getContext('2d');
  const W=188,H=188,cx=94,cy=94;c.clearRect(0,0,W,H);
  const prog=d.buf?getCT(deck)/d.duration:0;
  const isA=deck==='a',accent=isA?'#da3086':'#f5c559',accentDim=isA?'rgba(218,48,134,.12)':'rgba(245,197,89,.1)';
  c.beginPath();c.arc(cx,cy,84,0,Math.PI*2);c.fillStyle='#2a2a2a';c.fill();
  c.beginPath();c.arc(cx,cy,84,0,Math.PI*2);c.strokeStyle='#ffffff';c.lineWidth=2;c.stroke();
  c.beginPath();c.arc(cx,cy,80,0,Math.PI*2);c.strokeStyle='rgba(255,255,255,.04)';c.lineWidth=5;c.stroke();
  if(d.buf){c.beginPath();c.arc(cx,cy,80,-Math.PI/2,-Math.PI/2+prog*Math.PI*2);c.strokeStyle=accent;c.lineWidth=5;c.stroke();}
  for(let r=72;r>22;r-=5){c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=.6;c.stroke();}
  if(d.playing&&d.bpm){
    c.save();c.translate(cx,cy);c.rotate(platterAngle[deck]);
    c.beginPath();c.moveTo(0,0);c.arc(0,0,72,-0.45,0.45);c.closePath();
    c.fillStyle=accentDim;c.fill();c.restore();
    platterAngle[deck]+=(d.bpm*d.pitch/60)*Math.PI*2/60;
  }
  c.beginPath();c.arc(cx,cy,22,0,Math.PI*2);c.fillStyle='#1a1a1a';c.fill();
  c.strokeStyle=d.playing?accent:'rgba(255,255,255,.5)';c.lineWidth=1.5;c.stroke();
  c.beginPath();c.arc(cx,cy,3,0,Math.PI*2);c.fillStyle=d.playing?accent:'#888';c.fill();
  if(d.buf){
    c.font='bold 17px Bebas Neue';c.fillStyle=d.playing?accent:'rgba(0,0,0,.45)';c.textAlign='center';c.textBaseline='middle';
    c.fillText(fmt(getCT(deck)),cx,cy-7);
    c.font='7px DM Mono';c.fillStyle='rgba(0,0,0,.3)';
    c.fillText('-'+fmt(d.duration-getCT(deck)),cx,cy+9);
  }else{
    c.font='8px DM Mono';c.fillStyle='rgba(0,0,0,.3)';c.textAlign='center';c.textBaseline='middle';c.fillText('NO TRACK',cx,cy);
  }
}

// Harmony
const CAM_ADJ={'1A':['2A','12A','1B'],'2A':['1A','3A','2B'],'3A':['2A','4A','3B'],'4A':['3A','5A','4B'],'5A':['4A','6A','5B'],'6A':['5A','7A','6B'],'7A':['6A','8A','7B'],'8A':['7A','9A','8B'],'9A':['8A','10A','9B'],'10A':['9A','11A','10B'],'11A':['10A','12A','11B'],'12A':['11A','1A','12B'],'1B':['2B','12B','1A'],'2B':['1B','3B','2A'],'3B':['2B','4B','3A'],'4B':['3B','5B','4A'],'5B':['4B','6B','5A'],'6B':['5B','7B','6A'],'7B':['6B','8B','7A'],'8B':['7B','9B','8A'],'9B':['8B','10B','9A'],'10B':['9B','11B','10A'],'11B':['10B','12B','11A'],'12B':['11B','1B','12A']};
function harmStat(ka,kb){
  if(!ka||!kb)return{s:'none',label:'\u2014',color:'var(--muted)'};
  if(ka===kb)return{s:'perfect',label:'Perfect \u2713',color:'var(--green)'};
  if((CAM_ADJ[ka]||[]).includes(kb))return{s:'adjacent',label:'Adjacent \u2713',color:'rgba(120,255,214,.9)'};
  return{s:'clash',label:'Clash \u2717',color:'var(--red)'};
}
function updateHarmony(){
  const ka=D.a.key,kb=D.b.key;if(!ka||!kb)return;
  const h=harmStat(ka,kb);
  document.getElementById('sb-harm').textContent=h.label;document.getElementById('sb-harm').style.color=h.color;
}

function drawCamelotWheel(hA,hB){
  const cv=document.getElementById('camelot-canvas'),c=cv.getContext('2d');
  const W=280,H=280,cx=140,cy=140,r=110;c.clearRect(0,0,W,H);
  const keys=['1A','2A','3A','4A','5A','6A','7A','8A','9A','10A','11A','12A'];
  const keysB=['1B','2B','3B','4B','5B','6B','7B','8B','9B','10B','11B','12B'];
  keys.forEach((k,i)=>{
    const a=i/12*Math.PI*2-Math.PI/2,a2=(i+1)/12*Math.PI*2-Math.PI/2;
    const isA=k===hA,isB=k===hB;
    const adj=(hA&&CAM_ADJ[hA]?.includes(k))||(hB&&CAM_ADJ[hB]?.includes(k));
    c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,r,a,a2);c.closePath();
    c.fillStyle=isA?'rgba(218,48,134,.4)':isB?'rgba(245,197,89,.4)':adj?'rgba(120,255,214,.12)':'rgba(255,255,255,.03)';
    c.fill();c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=1;c.stroke();
    const mid=a+Math.PI/12;
    c.font='bold 9px DM Mono';c.fillStyle=isA||isB?'#fff':adj?'rgba(120,255,214,.8)':'rgba(255,255,255,.32)';
    c.textAlign='center';c.textBaseline='middle';c.fillText(k,cx+r*.7*Math.cos(mid),cy+r*.7*Math.sin(mid));
  });
  keysB.forEach((k,i)=>{
    const a=i/12*Math.PI*2-Math.PI/2,a2=(i+1)/12*Math.PI*2-Math.PI/2;
    const isA=k===hA,isB=k===hB;
    c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,r*.55,a,a2);c.closePath();
    c.fillStyle=isA?'rgba(218,48,134,.3)':isB?'rgba(245,197,89,.3)':'rgba(255,255,255,.02)';
    c.fill();c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=1;c.stroke();
    const mid=a+Math.PI/12;
    c.font='8px DM Mono';c.fillStyle='rgba(255,255,255,.28)';c.textAlign='center';c.textBaseline='middle';
    c.fillText(k,cx+r*.35*Math.cos(mid),cy+r*.35*Math.sin(mid));
  });
  c.beginPath();c.arc(cx,cy,r*.08,0,Math.PI*2);c.fillStyle='rgba(255,255,255,.04)';c.fill();
}
drawCamelotWheel(null,null);

function openCamelot(){
  drawCamelotWheel(D.a.key,D.b.key);
  document.getElementById('camelot-modal').classList.add('show');
}

// Beatmatch
function checkBeatmatch(){
  const ba=D.a.bpm?D.a.bpm*D.a.pitch:0,bb=D.b.bpm?D.b.bpm*D.b.pitch:0;
  if(!ba||!bb)return;
  const diff=Math.abs(ba-bb);
  const el=document.getElementById('sb-drift');el.textContent=diff.toFixed(2);
  el.className='sb-v '+(diff<.5?'ok':diff>3?'bad':'warn');
}

// Utils
function setBanner(html){document.getElementById('bannerMsg').innerHTML=html;}
function toast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2600);
}
function hardStop(){
  ['a','b'].forEach(deck=>{
    if(D[deck].playing)stopDeck(deck);
    document.getElementById('pbtn-'+deck).textContent='\u25b6 PLAY';
    document.getElementById('pbtn-'+deck).classList.remove('playing');
  });
  if(AC)AC.suspend();
}

// Animation loop
(function loop(){
  ['a','b'].forEach(deck=>{
    const d=D[deck];if(!d.buf)return;
    if(d.playing)document.getElementById('ph-'+deck).style.left=(getCT(deck)/d.duration*100)+'%';
    if(d.analyser&&d.playing){
      const data=new Uint8Array(d.analyser.frequencyBinCount);d.analyser.getByteFrequencyData(data);
      const avg=data.slice(0,30).reduce((a,v)=>a+v,0)/30;
      document.getElementById('vu-'+deck).style.height=Math.min(96,avg/128*100+8)+'%';
    }else{const el=document.getElementById('vu-'+deck);el.style.height=Math.max(0,parseFloat(el.style.height)-3)+'%';}
    drawPlatter(deck);
  });
  requestAnimationFrame(loop);
})();
setInterval(checkBeatmatch,500);

document.addEventListener('click',()=>getAC(),{once:true});
window.addEventListener('resize',()=>{if(D.a.buf)drawWave('a');if(D.b.buf)drawWave('b');});
