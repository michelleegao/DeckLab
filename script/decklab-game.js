// Track library
const TRACK_LIBRARY=[
  {id:1, name:"Do To Me",             artist:"Tim Sanders",              bpm:128,key:"9A", camelot:"9A", src:"tracks/do-to-me.mp3"},
  {id:2, name:"My Love (Rework)",     artist:"it's murph",               bpm:128,key:"9A", camelot:"9A", src:"tracks/my-love.mp3"},
  {id:3, name:"Find The Way",         artist:"Peggy Gou",                bpm:131,key:"8A", camelot:"8A", src:"tracks/find-the-way.mp3"},
  {id:4, name:"She's Gone, Dance On", artist:"Disclosure",               bpm:134,key:"10A",camelot:"10A",src:"tracks/shes-gone.mp3"},
  {id:5, name:"Make Believe",         artist:"Luke Dean, Omar+",         bpm:133,key:"11A",camelot:"11A",src:"tracks/make-believe.mp3"},
  {id:6, name:"Stay",                 artist:"FISHER",                   bpm:128,key:"8A", camelot:"8A", src:"tracks/Stay.mp3"},
  {id:7, name:"Make Believe",         artist:"Jigitz",                   bpm:146,key:"9A", camelot:"9A", src:"tracks/make-believe.mp3"},
  {id:8, name:"I Guess We're Not Same",artist:"Sammy Virji",             bpm:140,key:"10A",camelot:"10A",src:"tracks/i-guess.mp3"},
  {id:9, name:"Picanya 2400",         artist:"KETTAMA",                  bpm:135,key:"8A", camelot:"8A", src:"tracks/picanya.mp3"},
  {id:10,name:"Still Sleepless",      artist:"D.O.D, Carla Monroe",      bpm:126,key:"7A", camelot:"7A", src:"tracks/still-sleepless.mp3"},
  {id:11,name:"sh!ne",                artist:"Disco Lines, wes mills",   bpm:140,key:"9A", camelot:"9A", src:"tracks/shine.mp3"},
  {id:12,name:"Can't Let You Go",     artist:"Oden & Fatzo",             bpm:130,key:"8B", camelot:"8B", src:"tracks/cant-let-you-go.mp3"},
  {id:13,name:"Lady Love",            artist:"Oden & Fatzo, Camden Cox", bpm:126,key:"7B", camelot:"7B", src:"tracks/lady-love.mp3"},
  {id:14,name:"Real Love",            artist:"Retrowaves",               bpm:128,key:"5A", camelot:"5A", src:"tracks/real-love.mp3"},
  {id:15,name:"High and I Like It",   artist:"It's Murph, Evalyn",       bpm:128,key:"3B", camelot:"3B", src:"tracks/high-and-i-like-it.mp3"},
];

const LEVELS={
  1:{name:'Bedroom DJ',num:'01',xpGoal:100,trackIds:[1,2,3,4,5,6],
    objectives:[{id:'play_a',label:'Play Deck A'},{id:'play_b',label:'Play Deck B'},{id:'xf_blend',label:'Blend crossfader'}],
    tasks:[{id:'load_a',label:'Load track to A'},{id:'play_a',label:'Start Deck A'},{id:'load_b',label:'Load track to B'},{id:'play_b',label:'Start Deck B'},{id:'xf_mid',label:'Fader to 50%'},{id:'finish',label:'Finish transition'}],
    unlock:{pitch:false,nudge:false,sync:false,eq:false,cue:false,crowd:false},
    tip:'Level 2 unlocks the tempo slider and SYNC button — the real tools of beatmatching.',
    coachIntro:'Welcome to <strong>Bedroom DJ</strong>. Drag a track from the setlist below to each deck. Hit Play, then slide the <em>crossfader</em> to blend.'},
  2:{name:'Backyard Boiler',num:'02',xpGoal:200,trackIds:[7,8,9,10,11],
    objectives:[{id:'sync_bpm',label:'Sync BPM'},{id:'nudge_use',label:'Nudge to align'},{id:'hold_blend',label:'Hold 20s blend'}],
    tasks:[{id:'load_both',label:'Load both decks'},{id:'check_bpm',label:'Check BPM gap'},{id:'use_pitch',label:'Use tempo slider'},{id:'sync_it',label:'Hit SYNC'},{id:'nudge_it',label:'Nudge beats in phase'},{id:'blend',label:'Blend over 20s'}],
    unlock:{pitch:true,nudge:true,sync:true,eq:false,cue:false,crowd:false},
    tip:'Level 3 unlocks the Camelot Wheel — harmonic mixing makes transitions sound musical.',
    coachIntro:'<strong>Backyard Boiler.</strong> Pitch slider and SYNC unlocked. Tracks here have different BPMs — use SYNC to lock, then <em>nudge</em> to align the beats.'},
  3:{name:'Frat Basement',num:'03',xpGoal:250,trackIds:[12,13,14,15],
    objectives:[{id:'harmonic_mix',label:'Harmonic mix'},{id:'camelot_check',label:'Check Camelot Wheel'},{id:'key_match',label:'Match adjacent keys'}],
    tasks:[{id:'open_camelot',label:'Open Camelot Wheel'},{id:'check_keys',label:'Check key compat'},{id:'pick_adjacent',label:'Pick adjacent key'},{id:'blend_keys',label:'Blend harmonically'}],
    unlock:{pitch:true,nudge:true,sync:true,eq:false,cue:false,crowd:false},
    tip:'Level 4 unlocks cue points and the crowd simulator.',
    coachIntro:'<strong>Frat Basement.</strong> Keys matter now. Tap <em>Camelot</em> above to see the wheel. Pick tracks adjacent (±1) for harmonic blends.',
    showCamelot:true},
};

// state
let currentLevelNum=parseInt(new URLSearchParams(location.search).get('level'))||1;
let LVL=LEVELS[currentLevelNum];
const SESSION={xp:0,startTime:Date.now(),objsDone:0,tasksDone:new Set(),
  xfMoves:0,blendStart:null,tracksPlayed:new Set(),clashCount:0,crowdPeak:0};
let AC=null;
function getAC(){
  if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();
  if(AC.state==='suspended')AC.resume();
  return AC;
}
let masterGain;
const D={
  a:{buf:null,src:null,gainNode:null,eq:{lo:null,mid:null,hi:null},filter:null,analyser:null,
     playing:false,startedAt:0,pausedAt:0,pitch:1,bpm:null,key:null,duration:0,gainVal:0.8,cuePoint:0,trackId:null},
  b:{buf:null,src:null,gainNode:null,eq:{lo:null,mid:null,hi:null},filter:null,analyser:null,
     playing:false,startedAt:0,pausedAt:0,pitch:1,bpm:null,key:null,duration:0,gainVal:0.8,cuePoint:0,trackId:null}
};
let platterAngle={a:0,b:0},crowdEnergy=30,crowdVibe=50,crowdTick=0;

// audio
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

function synthTrack(trackData,duration=90){
  const ac=getAC(),sr=ac.sampleRate,buf=ac.createBuffer(2,Math.round(sr*duration),sr);
  const rootFreqs={'1A':261,'2A':277,'3A':294,'4A':311,'5A':330,'6A':349,'7A':370,'8A':392,'9A':415,'10A':440,'11A':466,'12A':494,'1B':277,'2B':294,'3B':311,'4B':330,'5B':349,'6B':370,'7B':392,'8B':415,'9B':440,'10B':466,'11B':494,'12B':523};
  const rootHz=rootFreqs[trackData.camelot]||415,bpm=trackData.bpm;
  for(let ch=0;ch<2;ch++){
    const data=buf.getChannelData(ch);
    const spb=sr*60/bpm,sp16=spb/4;
    for(let i=0;i<data.length;i++){
      let s=0;const step=Math.floor(i/sp16)%16,in16=(i%sp16)/sp16;
      if(step===0||step===8){const t=in16;s+=Math.sin(2*Math.PI*(150*Math.exp(-t*9))*t)*Math.exp(-t*8)*.75;}
      if(step===4||step===12){const t=in16;s+=(Math.random()*2-1)*Math.exp(-t*14)*.35;}
      s+=(Math.random()*2-1)*Math.exp(-in16*22)*((step%2===0)?.1:.05);
      if(step===0||step===8){const t=in16;for(let h=1;h<=3;h++)s+=Math.sin(2*Math.PI*rootHz/2*h*t)/h*Math.exp(-t*5)*.4;}
      const padT=i/sr;s+=Math.sin(2*Math.PI*rootHz*2*padT)*.1+Math.sin(2*Math.PI*rootHz*3*padT)*.06;
      const phraseLen=spb*16,phrasePos=(i%phraseLen)/phraseLen;
      const env=Math.min(phrasePos*8,1)*Math.min((1-phrasePos)*8,1);
      data[i]=Math.max(-1,Math.min(1,s*env*.82));
    }
  }
  return buf;
}

async function loadTrackToDeck(trackData,deck){
  getAC();if(!D[deck].gainNode)buildChain(deck);
  const d=D[deck];if(d.playing)stopDeck(deck);
  coach(' Loading <strong>'+trackData.name+'</strong>…',null);
  try{
    if(trackData.src){const resp=await fetch(trackData.src);const ab=await resp.arrayBuffer();d.buf=await AC.decodeAudioData(ab);}
    else d.buf=synthTrack(trackData);
    d.duration=d.buf.duration;d.bpm=trackData.bpm;d.key=trackData.camelot;
    d.pitch=1;d.pausedAt=0;d.trackId=trackData.id;
    document.getElementById('pitch-'+deck).value=0;
    document.getElementById('pval-'+deck).textContent='0%';
    document.getElementById('tname-'+deck).textContent=trackData.name+' — '+trackData.artist;
    document.getElementById('tbpm-'+deck).textContent=trackData.bpm+' BPM';
    document.getElementById('tkey-'+deck).textContent='Key '+trackData.camelot;
    document.getElementById('bnum-'+deck).textContent=trackData.bpm;
    document.getElementById('wfh-'+deck).style.display='none';
    document.getElementById('sb-b'+deck).textContent=trackData.bpm;
    document.getElementById('sb-k'+deck).textContent=trackData.camelot;
    drawWave(deck);updateHarmony();
    SESSION.tracksPlayed.add(trackData.id);earnXP(10);
    checkTask('load_a');checkTask('load_b');checkTask('load_both');
    coach('Playing <strong>'+trackData.name+'</strong> → Deck '+deck.toUpperCase()+'  —  <em>'+trackData.bpm+' BPM · key '+trackData.camelot+'</em>. Hit Play.',null);
  }catch(e){coach('Load failed. Place MP3s in a tracks/ folder alongside this file.',null);console.error(e);}
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
  const d=D[deck];if(!d.buf){coach('Drop a track onto Deck '+deck.toUpperCase()+' first.',null);return;}
  if(d.playing){
    stopDeck(deck);
    document.getElementById('pbtn-'+deck).textContent='▶ PLAY';
    document.getElementById('pbtn-'+deck).classList.remove('playing');
  }else{
    startDeck(deck);
    document.getElementById('pbtn-'+deck).textContent='⏸ PAUSE';
    document.getElementById('pbtn-'+deck).classList.add('playing');
    checkTask('play_a');checkTask('play_b');checkTask('load_both');
  }
  checkObj('play_a');checkObj('play_b');earnXP(4);
}
function nudge(deck,sec){
  const d=D[deck];if(!d.buf||!LVL.unlock.nudge)return;
  d.pausedAt=getCT(deck)+sec;if(d.playing)startDeck(deck);
  checkObj('nudge_use');checkTask('nudge_it');earnXP(3);
}
function hitCue(deck){
  const d=D[deck];if(!d.buf)return;
  if(LVL.unlock.cue){
    if(!d.playing){d.pausedAt=d.cuePoint;checkObj('use_cue');checkTask('punch_in');}
    else{
      d.cuePoint=getCT(deck);
      document.getElementById('cbtn-'+deck).classList.add('on');
      earnXP(5);checkObj('set_cue');checkTask('set_cue_a');checkTask('set_cue_b');
      toast('CUE set at '+fmt(d.cuePoint));
    }
  }
}
document.addEventListener('keydown',e=>{
  if(e.key==='1')hitCue('a');
  if(e.key==='2')hitCue('b');
  if(e.key===' '&&e.target.tagName!=='INPUT'){e.preventDefault();
    if(D.a.buf&&!D.a.playing)togglePlay('a');else if(D.a.playing)togglePlay('a');}
});

function pitchChange(deck){
  if(!LVL.unlock.pitch)return;
  const v=parseFloat(document.getElementById('pitch-'+deck).value);
  D[deck].pitch=1+v/100;
  if(D[deck].src&&D[deck].playing)D[deck].src.playbackRate.value=D[deck].pitch;
  document.getElementById('pval-'+deck).textContent=(v>=0?'+':'')+v.toFixed(1)+'%';
  const bpm=D[deck].bpm;
  if(bpm){const disp=(bpm*D[deck].pitch).toFixed(1);document.getElementById('bnum-'+deck).textContent=disp;document.getElementById('sb-b'+deck).textContent=disp;}
  document.getElementById('sync-btn').classList.remove('on');
  checkBeatmatch();checkTask('use_pitch');earnXP(2);
}

function syncDecks(){
  if(!LVL.unlock.sync){coach('Sync unlocks at Level 2.',null);return;}
  if(!D.a.bpm||!D.b.bpm){coach('Load both decks first.',null);return;}
  const ratio=D.a.bpm*D.a.pitch/D.b.bpm;
  const pct=(ratio-1)*100,cl=Math.max(-8,Math.min(8,pct));
  document.getElementById('pitch-b').value=cl;D.b.pitch=1+cl/100;
  if(D.b.src&&D.b.playing)D.b.src.playbackRate.value=D.b.pitch;
  const disp=(D.b.bpm*D.b.pitch).toFixed(1);
  document.getElementById('bnum-b').textContent=disp;document.getElementById('sb-bb').textContent=disp;
  document.getElementById('pval-b').textContent=(cl>=0?'+':'')+cl.toFixed(1)+'%';
  document.getElementById('sync-btn').classList.add('on');
  document.getElementById('sync-btn').innerHTML='<span class="sync-sub">LOCKED</span>';
  checkObj('sync_bpm');checkTask('sync_it');earnXP(30);
  coach(' <strong>BPM locked.</strong> Nudge ◀▶ to phase-align the beats.',mkQuiz('bpm'));
}

function xfChange(){
  const v=parseFloat(document.getElementById('xf-range').value)/100;
  const gA=Math.cos(v*Math.PI/2),gB=Math.cos((1-v)*Math.PI/2);
  if(D.a.gainNode)D.a.gainNode.gain.value=gA*D.a.gainVal;
  if(D.b.gainNode)D.b.gainNode.gain.value=gB*D.b.gainVal;
  drawXFRing(v);SESSION.xfMoves++;
  if(v>0.2&&v<0.8){
    if(!SESSION.blendStart)SESSION.blendStart=Date.now();
    else{const dur=(Date.now()-SESSION.blendStart)/1000;
      if(dur>5)checkObj('xf_blend');
      if(dur>20){checkObj('hold_blend');checkTask('blend');}
    }
    checkTask('xf_mid');
  }else{SESSION.blendStart=null;if(v>0.8||v<0.2)checkTask('finish');}
  earnXP(1);
}

// EQ
function buildEQ(deck){
  const c=document.getElementById('eq-'+deck);c.innerHTML='';
  const col=deck==='a'?'var(--rose)':'var(--gold)';
  [{id:'lo',lbl:'LOW'},{id:'mid',lbl:'MID'},{id:'hi',lbl:'HIGH'}].forEach(band=>{
    const uid='eq-'+deck+'-'+band.id;
    const div=document.createElement('div');div.className='eq-band';
    div.innerHTML=`<div class="eq-band-lbl">${band.lbl}</div>
      <canvas class="knob-c" id="${uid}" width="44" height="44" title="Drag up/down"></canvas>
      <div class="knob-val" id="${uid}-val">0</div>
      <input type="range" class="eq-sl" id="${uid}-sl" min="-12" max="12" step=".5" value="0">`;
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
        const pct=g/12,sa=-140*Math.PI/180-Math.PI/2,ea=pct*280*Math.PI/180-140*Math.PI/180-Math.PI/2;
        ctx.beginPath();ctx.arc(cx,cy,r,sa,ea,pct>=0?false:true);
        if(pct>=0)ctx.arc(cx,cy,r,sa,ea,false);else ctx.arc(cx,cy,r,ea,sa,false);
        // Simpler, draw the arc
        ctx.beginPath();ctx.arc(cx,cy,r,sa,ea,false);
        ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.stroke();
        ctx.beginPath();ctx.arc(cx+r*Math.cos(ea),cy+r*Math.sin(ea),3,0,Math.PI*2);
        ctx.fillStyle=col;ctx.fill();
        valEl.textContent=(g>=0?'+':'')+g.toFixed(1);sl.value=g;
        if(band.id==='lo'&&g<-6){checkTask('lower_low_b');checkTask('cut_a_bass');checkObj('bass_swap');}
        if(band.id==='hi'&&g<-6)checkObj('eq_hi_cut');
        earnXP(1);
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

// XF rings
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
  // Outer vinyl
  c.beginPath();c.arc(cx,cy,84,0,Math.PI*2);c.fillStyle='#2a2a2a';c.fill();
  c.beginPath();c.arc(cx,cy,84,0,Math.PI*2);c.strokeStyle='#ffffff';c.lineWidth=2;c.stroke();
  // Progress ring
  c.beginPath();c.arc(cx,cy,80,0,Math.PI*2);c.strokeStyle='rgba(255,255,255,.04)';c.lineWidth=5;c.stroke();
  if(d.buf){c.beginPath();c.arc(cx,cy,80,-Math.PI/2,-Math.PI/2+prog*Math.PI*2);
    c.strokeStyle=accent;c.lineWidth=5;c.stroke();}
  // Grooves
  for(let r=72;r>22;r-=5){c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=.6;c.stroke();}
  // Spin sector
  if(d.playing&&d.bpm){
    c.save();c.translate(cx,cy);c.rotate(platterAngle[deck]);
    c.beginPath();c.moveTo(0,0);c.arc(0,0,72,-0.45,0.45);c.closePath();
    c.fillStyle=accentDim;c.fill();c.restore();
    platterAngle[deck]+=(d.bpm*d.pitch/60)*Math.PI*2/60;
  }
  // Label/center
  c.beginPath();c.arc(cx,cy,22,0,Math.PI*2);c.fillStyle='#1a1a1a';c.fill();
  c.strokeStyle=d.playing?accent:'rgba(255,255,255,.5)';c.lineWidth=1.5;c.stroke();
  // Spindle
  c.beginPath();c.arc(cx,cy,3,0,Math.PI*2);c.fillStyle=d.playing?accent:'#888';c.fill();
  // Time
  if(d.buf){
    c.font='bold 17px Bebas Neue';c.fillStyle=d.playing?accent:'rgba(0,0,0,.45)';c.textAlign='center';c.textBaseline='middle';
    c.fillText(fmt(getCT(deck)),cx,cy-7);
    c.font='7px DM Mono';c.fillStyle='rgba(0,0,0,.3)';
    c.fillText('-'+fmt(d.duration-getCT(deck)),cx,cy+9);
  }else{
    c.font='8px DM Mono';c.fillStyle='rgba(0,0,0,.3)';c.textAlign='center';c.textBaseline='middle';c.fillText('NO TRACK',cx,cy);
  }
}

// Harmony and Camelot
const CAM_ADJ={'1A':['2A','12A','1B'],'2A':['1A','3A','2B'],'3A':['2A','4A','3B'],'4A':['3A','5A','4B'],'5A':['4A','6A','5B'],'6A':['5A','7A','6B'],'7A':['6A','8A','7B'],'8A':['7A','9A','8B'],'9A':['8A','10A','9B'],'10A':['9A','11A','10B'],'11A':['10A','12A','11B'],'12A':['11A','1A','12B'],'1B':['2B','12B','1A'],'2B':['1B','3B','2A'],'3B':['2B','4B','3A'],'4B':['3B','5B','4A'],'5B':['4B','6B','5A'],'6B':['5B','7B','6A'],'7B':['6B','8B','7A'],'8B':['7B','9B','8A'],'9B':['8B','10B','9A'],'10B':['9B','11B','10A'],'11B':['10B','12B','11A'],'12B':['11B','1B','12A']};
function harmStat(ka,kb){
  if(!ka||!kb)return{s:'none',label:'—',color:'var(--muted)'};
  if(ka===kb)return{s:'perfect',label:'Perfect',color:'var(--green)'};
  if((CAM_ADJ[ka]||[]).includes(kb))return{s:'adjacent',label:'Adjacent',color:'rgba(120,255,214,.9)'};
  return{s:'clash',label:'Clash',color:'var(--red)'};
}
function updateHarmony(){
  const ka=D.a.key,kb=D.b.key;if(!ka||!kb)return;
  const h=harmStat(ka,kb);
  document.getElementById('sb-harm').textContent=h.label;document.getElementById('sb-harm').style.color=h.color;
  ['a','b'].forEach(dk=>{
    const existing=document.getElementById('tcompat-'+dk);if(existing)existing.remove();
    const meta=document.getElementById('tmeta-'+dk);
    const span=document.createElement('span');span.id='tcompat-'+dk;
    span.className='tmeta '+(h.s==='clash'?'clash':'compat');span.textContent=h.label;meta.appendChild(span);
  });
  if(h.s==='clash'){SESSION.clashCount++;coach('<strong>Key clash — '+ka+' vs '+kb+'.</strong> These keys conflict. Swap to an adjacent key track.',mkQuiz('key'));}
  else if(h.s!=='none'){checkObj('harmonic_mix');checkObj('key_match');checkTask('blend_keys');checkTask('harmonic_set');earnXP(h.s==='perfect'?15:8);}
}

function drawCamelotWheel(highlightA,highlightB){
  const cv=document.getElementById('camelot-canvas'),c=cv.getContext('2d');
  const W=280,H=280,cx=140,cy=140,r=110;c.clearRect(0,0,W,H);
  const keys=['1A','2A','3A','4A','5A','6A','7A','8A','9A','10A','11A','12A'];
  const keysB=['1B','2B','3B','4B','5B','6B','7B','8B','9B','10B','11B','12B'];
  keys.forEach((k,i)=>{
    const a=i/12*Math.PI*2-Math.PI/2,a2=(i+1)/12*Math.PI*2-Math.PI/2;
    const isA=k===highlightA,isB=k===highlightB;
    const adj=(highlightA&&CAM_ADJ[highlightA]?.includes(k))||(highlightB&&CAM_ADJ[highlightB]?.includes(k));
    c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,r,a,a2);c.closePath();
    c.fillStyle=isA?'rgba(218,48,134,.4)':isB?'rgba(245,197,89,.4)':adj?'rgba(120,255,214,.12)':'rgba(255,255,255,.03)';
    c.fill();c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=1;c.stroke();
    const mid=a+Math.PI/12;
    c.font='bold 9px DM Mono';c.fillStyle=isA||isB?'#fff':adj?'rgba(120,255,214,.8)':'rgba(255,255,255,.32)';
    c.textAlign='center';c.textBaseline='middle';c.fillText(k,cx+r*.7*Math.cos(mid),cy+r*.7*Math.sin(mid));
  });
  keysB.forEach((k,i)=>{
    const a=i/12*Math.PI*2-Math.PI/2,a2=(i+1)/12*Math.PI*2-Math.PI/2;
    const isA=k===highlightA,isB=k===highlightB;
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
  checkObj('camelot_check');checkTask('open_camelot');earnXP(5);
}

// Coach and quiz
const QUIZZES={
  bpm:{q:'Why match BPM before blending?',opts:['Beats align — no drift','Changes the key','Adds reverb','Makes it louder'],ans:0},
  key:{q:'Adjacent Camelot keys are…',opts:['Harmonically compatible','Always a clash','The same key','Random'],ans:0},
  eq:{q:'Why cut LOW on the incoming track?',opts:['Two basslines clash','Makes it quieter','Adds effect','Not needed'],ans:0},
};
function mkQuiz(t){return QUIZZES[t]||null;}
function coach(html,quiz){
  document.getElementById('coach-msg').innerHTML=html;
  const qa=document.getElementById('quiz-area');qa.innerHTML='';
  if(!quiz)return;
  quiz.opts.forEach((opt,i)=>{
    const btn=document.createElement('button');btn.className='qbtn';btn.textContent=opt;
    btn.onclick=()=>{
      qa.querySelectorAll('.qbtn').forEach(b=>b.style.pointerEvents='none');
      btn.classList.add(i===quiz.ans?'correct':'wrong');
      if(i===quiz.ans){earnXP(25);setTimeout(()=>{document.getElementById('coach-msg').innerHTML+=' <em style="color:var(--green)">+25XP ✓</em>';qa.innerHTML='';},900);}
      else qa.querySelectorAll('.qbtn')[quiz.ans].classList.add('correct');
    };qa.appendChild(btn);
  });
}

// Objectives and task
function buildObjStrip(){
  const strip=document.getElementById('obj-strip');strip.innerHTML='';
  LVL.objectives.forEach(o=>{
    const div=document.createElement('div');div.className='obj-item';
    div.innerHTML=`<div class="obj-dot" id="objdot-${o.id}"></div>${o.label}`;strip.appendChild(div);
  });
}
function buildTaskBar(){
  const bar=document.getElementById('task-bar');bar.innerHTML='';
  LVL.tasks.forEach(t=>{
    const div=document.createElement('div');div.className='task-item';
    div.innerHTML=`<span class="task-star" id="tstar-${t.id}">★</span>${t.label}`;bar.appendChild(div);
  });
}
function checkObj(id){
  const obj=LVL.objectives.find(o=>o.id===id);if(!obj||obj.done)return;
  if(id==='play_a'&&!D.a.playing)return;
  if(id==='play_b'&&!D.b.playing)return;
  if(id==='xf_blend'&&SESSION.xfMoves<5)return;
  if(id==='crowd_happy'&&crowdEnergy<60)return;
  if(id==='crowd_75'&&crowdEnergy<75)return;
  if(id==='crowd_80'&&SESSION.crowdPeak<80)return;
  obj.done=true;
  document.getElementById('objdot-'+id)?.classList.add('done');
  SESSION.objsDone++;toast('✓ '+obj.label);earnXP(20);
  if(SESSION.objsDone>=LVL.objectives.length)setTimeout(()=>showLevelComplete(),1800);
}
function checkTask(id){
  if(SESSION.tasksDone.has(id))return;
  const task=LVL.tasks.find(t=>t.id===id);if(!task)return;
  SESSION.tasksDone.add(id);
  document.getElementById('tstar-'+id)?.classList.add('earned');earnXP(5);
}
function checkBeatmatch(){
  const ba=D.a.bpm?D.a.bpm*D.a.pitch:0,bb=D.b.bpm?D.b.bpm*D.b.pitch:0;
  if(!ba||!bb)return;
  const diff=Math.abs(ba-bb);
  const el=document.getElementById('sb-drift');el.textContent=diff.toFixed(2);
  el.className='sb-v '+(diff<.5?'ok':diff>3?'bad':'warn');
  checkTask('check_bpm');
}
function earnXP(n){
  SESSION.xp+=n;
  document.getElementById('sb-xp').textContent=SESSION.xp;
  document.getElementById('xp-now').textContent=SESSION.xp;
  document.getElementById('xp-fill').style.width=Math.min(100,SESSION.xp/LVL.xpGoal*100)+'%';
}
function toast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2600);
}

// Setlist
let dragTrack=null;
function buildSetlist(){
  const c=document.getElementById('sl-tracks');c.innerHTML='';
  document.getElementById('sl-level-label').textContent='Level '+currentLevelNum+' — Set List';
  const tracks=LVL.trackIds.map(id=>TRACK_LIBRARY.find(t=>t.id===id)).filter(Boolean);
  tracks.forEach(t=>{
    const card=document.createElement('div');card.className='track-card';card.draggable=true;
    card.innerHTML=`<div class="tc-name">${t.name}</div>
      <div class="tc-meta">
        <span class="tc-tag">${t.artist.split(',')[0]}</span>
        <span class="tc-tag">${t.bpm}</span>
        <span class="tc-tag">${t.camelot}</span>
        ${t.src?'':'<span class="tc-tag" style="color:rgba(218,48,134,.4)">synth</span>'}
      </div>`;
    card.addEventListener('dragstart',e=>{dragTrack=t;card.classList.add('dragging');e.dataTransfer.effectAllowed='copy';});
    card.addEventListener('dragend',()=>{card.classList.remove('dragging');dragTrack=null;});
    c.appendChild(card);
  });
  ['a','b'].forEach(deck=>{
    const zone=document.getElementById('drop-'+deck);
    const side=document.getElementById('deck-'+deck+'-side');
    side.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('active');});
    side.addEventListener('dragleave',()=>zone.classList.remove('active'));
    side.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('active');if(dragTrack)loadTrackToDeck(dragTrack,deck);});
  });
}

// ════════════════════════════════
//  ANIMATION LOOP
// ════════════════════════════════
let frame=0;
(function loop(){
  frame++;
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
  if(frame%4===0&&LVL.unlock.crowd)updateCrowd();
  requestAnimationFrame(loop);
})();
setInterval(checkBeatmatch,500);

// ════════════════════════════════
//  LEVEL COMPLETE
// ════════════════════════════════
function showLevelComplete(){
  ['a','b'].forEach(deck=>{if(D[deck].playing)stopDeck(deck);});
  const dur=Math.round((Date.now()-SESSION.startTime)/1000);
  const stars=SESSION.objsDone>=LVL.objectives.length?3:SESSION.objsDone>=2?2:1;
  document.getElementById('lc-title').textContent=LVL.name.toUpperCase();
  document.getElementById('lc-stars-row').textContent='⭐'.repeat(stars)+'☆'.repeat(3-stars);
  document.getElementById('lc-xp').textContent=SESSION.xp;
  document.getElementById('lc-objs').textContent=SESSION.objsDone+'/'+LVL.objectives.length;
  document.getElementById('lc-time').textContent=fmt(dur);
  document.getElementById('lc-tip').textContent=LVL.tip||'';
  const nextNum=currentLevelNum+1;
  document.getElementById('lc-next-btn').textContent=nextNum<=6?'→ Level '+nextNum+': '+LEVELS[nextNum]?.name:'→ All Levels';
  try{
    const p=JSON.parse(localStorage.getItem('decklab_progress')||'{}');
    p.completedLevels=p.completedLevels||[];
    if(!p.completedLevels.includes(currentLevelNum))p.completedLevels.push(currentLevelNum);
    p.stars=p.stars||{};p.stars[currentLevelNum]=stars;
    p.totalXP=(p.totalXP||0)+SESSION.xp;
    localStorage.setItem('decklab_progress',JSON.stringify(p));
  }catch(e){}
  document.getElementById('lvl-complete').classList.add('show');
}
function nextLevel(){const n=currentLevelNum+1;window.location.href=n<=6?'decklab-game.html?level='+n:'decklab-levels.html';}
function hardStop(){
  ['a','b'].forEach(deck=>{if(D[deck].playing)stopDeck(deck);document.getElementById('pbtn-'+deck).textContent='▶ PLAY';document.getElementById('pbtn-'+deck).classList.remove('playing');});
  if(AC)AC.suspend();
}

// ════════════════════════════════
//  INIT
// ════════════════════════════════
function initLevel(){
  LVL=LEVELS[currentLevelNum];
  document.getElementById('tb-lvl').textContent=LVL.num;
  document.getElementById('tb-lvlname').textContent=LVL.name;
  document.getElementById('xp-max').textContent=LVL.xpGoal;
  buildObjStrip();buildTaskBar();buildSetlist();
  const u=LVL.unlock;
  ['a','b'].forEach(deck=>{
    const pw=document.getElementById('pitch-'+deck+'-wrap');
    if(u.pitch){pw.classList.remove('locked');const pl=document.getElementById('pitch-'+deck+'-lock');if(pl)pl.style.display='none';}
    const ew=document.getElementById('eq-'+deck+'-wrap');
    if(u.eq){ew.classList.remove('locked');const el=document.getElementById('eq-'+deck+'-lock');if(el)el.style.display='none';}
    const nudgeL=document.getElementById('nudge-'+(deck==='a'?'al':'bl'));
    const nudgeR=document.getElementById('nudge-'+(deck==='a'?'ar':'br'));
    if(u.nudge&&nudgeL&&nudgeR){nudgeL.style.opacity='1';nudgeL.style.pointerEvents='auto';nudgeR.style.opacity='1';nudgeR.style.pointerEvents='auto';}
  });
  const sb=document.getElementById('sync-btn');
  if(!u.sync){sb.style.opacity='.22';sb.style.pointerEvents='none';}
  else{sb.style.opacity='1';sb.style.pointerEvents='auto';document.getElementById('sync-sub').textContent='BPM';}
  if(LVL.showCamelot)document.getElementById('cam-btn-top').style.display='block';
  if(u.crowd)startCrowd();
  if(u.eq){buildEQ('a');buildEQ('b');}
  coach(LVL.coachIntro,null);
}

window.addEventListener('resize',()=>{if(D.a.buf)drawWave('a');if(D.b.buf)drawWave('b');});
document.addEventListener('click',()=>getAC(),{once:true});

// Timed coaching hints
let hintT=0;
setInterval(()=>{
  hintT++;
  if(hintT===10&&!D.a.buf&&!D.b.buf)coach('Drag a track from the setlist onto <strong>Deck A</strong> or <strong>Deck B</strong> to load it.',null);
  if(hintT===25&&D.a.playing&&!D.b.buf)coach('Deck A is playing. Now drag a track onto <strong>Deck B</strong>.',null);
  if(hintT===45&&SESSION.xfMoves<3)coach('↔ Slide the <em>crossfader</em> below the VU meters to blend between decks.',null);
},3000);

initLevel();
