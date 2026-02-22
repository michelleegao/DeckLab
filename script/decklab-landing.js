const aura=document.getElementById('aura');
const BLOBS=[
    {w:700,h:700,x:5, y:5, c:['#f5c559','#562165'],vx:.018,vy:.012,t:0},
    {w:600,h:600,x:55,y:20,c:['#562165','#f5c559'],vx:-.014,vy:.018,t:1.2},
    {w:500,h:500,x:70,y:55,c:['#d5e4b2','#da3086'],vx:.012,vy:-.016,t:2.4},
    {w:550,h:550,x:10,y:60,c:['#da3086','#d5e4b2'],vx:.016,vy:.01,t:3.6},
    {w:400,h:400,x:45,y:45,c:['#d5e4b2','#f5c559'],vx:-.01,vy:.014,t:4.8},
];
BLOBS.forEach(b=>{
    const el=document.createElement('div');el.className='aura-blob';
    el.style.cssText=`width:${b.w}px;height:${b.h}px;left:${b.x}%;top:${b.y}%;background:radial-gradient(circle at 40% 40%,${b.c[0]},${b.c[1]},transparent 70%);opacity:0.45;`;
    aura.appendChild(el);b.el=el;
});
let T=0;(function tick(){T+=.4;BLOBS.forEach(b=>{
    b.el.style.transform=`translate(${Math.sin((T+b.t*40)*b.vx*.7)*8}%,${Math.cos((T+b.t*30)*b.vy*.7)*7}%)`;
});requestAnimationFrame(tick);})();

const UK='dl_users',SK='dl_session';
function GU(){try{return JSON.parse(localStorage.getItem(UK)||'{}')}catch{return{}}}
function GS(){try{return JSON.parse(localStorage.getItem(SK)||'null')}catch{return null}}
function setSt(m,c){const e=document.getElementById('authStatus');e.textContent=m;e.style.color=c||'rgba(255,255,255,.22)';}
let signupMode=false;
function toggleMode(){
    signupMode=!signupMode;
    document.getElementById('authToggle').textContent=signupMode?'Have an account?':'Create account';
    document.getElementById('btnLogin').style.display=signupMode?'none':'block';
    document.getElementById('btnSignup').style.display=signupMode?'block':'none';
    setSt(signupMode?'New account — password 6+ characters':'Log in to your account');
}
// signup
function authSignup(){
    const em=document.getElementById('email').value.trim(),pw=document.getElementById('password').value;
    if(!em||!pw){setSt('Enter email and password.','rgba(232,64,64,.9)');return;}
    if(!/\S+@\S+\.\S+/.test(em)){setSt('Enter a valid email.','rgba(232,64,64,.9)');return;}
    if(pw.length<6){setSt('Password must be 6+ chars.','rgba(232,64,64,.9)');return;}
    const u=GU();if(u[em]){setSt('Account exists.','rgba(232,64,64,.9)');return;}
    u[em]={pw,p:{}};localStorage.setItem(UK,JSON.stringify(u));
    localStorage.setItem(SK,JSON.stringify({em}));showIn(em);setSt('Account created.','rgba(218,48,134,.9)');
}
// login
function authLogin(){
    const em=document.getElementById('email').value.trim(),pw=document.getElementById('password').value;
    if(!em||!pw){setSt('Enter email and password.','rgba(232,64,64,.9)');return;}
    const u=GU();if(!u[em]||u[em].pw!==pw){setSt('Incorrect credentials.','rgba(232,64,64,.9)');return;}
    localStorage.setItem(SK,JSON.stringify({em}));showIn(em);setSt('Session active','rgba(218,48,134,.7)');
}
// logout
function authLogout(){localStorage.removeItem(SK);showOut();setSt('Signed out.');}
function showIn(em){
    document.getElementById('authForm').style.display='none';
    document.getElementById('authToggle').style.display='none';
    document.getElementById('authSigned').classList.add('visible');
    document.getElementById('authUser').textContent=em;
    document.getElementById('authAvatar').textContent=em[0].toUpperCase();
    setSt('Signed in as '+em.split('@')[0],'rgba(218,48,134,.65)');
}
function showOut(){
    document.getElementById('authForm').style.display='block';
    document.getElementById('authToggle').style.display='block';
    document.getElementById('authSigned').classList.remove('visible');
    setSt('Not signed in');
}
const s=GS();if(s&&s.em)showIn(s.em);else showOut();