/* Outfit Editor (no AI). Everything runs in the browser; nothing is uploaded.
   Layers, bottom to top: background colour > skin fill under the neck > your head and neck (plain background removed, clipped to a head+neck zone, soft edges) > outfit (transparent PNG-style WebP) > soft neck shadow.
   Your face pixels are copied as they are: only moved, scaled and rotated, never redrawn. Outfits: photo-editor/outfits/outfits.json (cx, sy, span, w, h per outfit). */
(()=>{
const root=document.getElementById('v-outfit-editor');if(!root)return;
const $=s=>root.querySelector(s),say=m=>{try{toast(m)}catch(e){}},cl=(v,a,b)=>Math.min(b,Math.max(a,v));
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c};
const BG={tpl:'Outfit',white:'#ffffff',blue:'#1e90ff',grey:'#d9dde3',none:''};
const SL=[['size','Size',.15,2.6,.005,v=>Math.round(v*100)+'%'],['ox','Left / Right',-.7,.7,.002,v=>(v*100).toFixed(0)],['oy','Up / Down',-.9,.9,.002,v=>(v*100).toFixed(0)],['rot','Rotate',-15,15,.1,v=>v.toFixed(1)+'°'],
 ['cut','Neck cut (where skin fill starts)',.1,.95,.002,v=>Math.round(v*100)+'%'],['br','Brightness',-40,40,1,v=>(v>0?'+':'')+v],['ct','Contrast',-40,40,1,v=>(v>0?'+':'')+v],['sh','Neck shadow',0,100,1,v=>v+'%']];
const S={orig:null,url:'',name:'photo',keyed:null,key:null,outfits:[],group:'Men',pick:null,T:null,P:null,res:false,busy:false,mode:'cmp',bg:'tpl',rm:true,tol:30,fitInfo:null};
const TC=new Map();

root.innerHTML=`<div class="heroband"><div class="w oe-head"><span class="eb">OUTFIT EDITOR</span><h1>Try a new outfit<br>on <span class="g1">your own photo</span></h1>
<p class="mu">Upload a portrait and choose an outfit. Your head and neck are placed on the outfit exactly as they are, so your face is never redrawn. Runs in your browser, nothing is uploaded.</p></div></div>
<div class="w"><p id="oe-note" class="note" role="alert" hidden></p><div class="oe-grid">
<div><div class="card oe-stage" id="oe-stage"><input type="file" id="oe-in" accept="image/jpeg,image/png,image/webp" hidden>
<div class="oe-drop" id="oe-drop"><button class="cta" id="oe-up">⇪ Upload Portrait</button><small>Drag &amp; drop or click to browse · JPG, PNG, WEBP</small><small>Best with a plain-colour background, face looking straight ahead, shoulders level.</small></div>
<div class="oe-cmp" id="oe-cmp" hidden><img id="oe-bf" alt="Your original photo"><canvas id="oe-af" class="oe-af" hidden role="img" aria-label="Your photo with the new outfit"></canvas><i class="pe-h" id="oe-h" hidden></i><input type="range" class="pe-r" id="oe-r" min="0" max="100" value="50" aria-label="Drag to compare before and after" hidden><span class="pe-l pe-lb" id="oe-lb">Before</span><span class="pe-l pe-la" id="oe-la" hidden>After</span></div>
<div class="oe-busy" id="oe-busy" role="status" aria-live="polite" hidden><div class="pe-spin"></div><b id="oe-bm">Fitting your outfit...</b><small>Just a moment.</small></div></div>
<div class="pe-modes" id="oe-modes" hidden><button data-m="cmp" aria-pressed="true">Compare</button><button data-m="adj" aria-pressed="false">Adjust (drag photo)</button></div></div>
<aside class="oe-side" aria-label="Outfit editor controls">
<div class="card"><div class="oe-step"><b>1</b><h3 style="margin:0">Your photo</h3></div><p class="mu" style="margin:8px 0 10px;font-size:14px" id="oe-pn">No photo yet.</p><button id="oe-rp">Upload / Replace Photo</button></div>
<div class="card"><div class="oe-step"><b>2</b><h3 style="margin:0">Choose an outfit</h3></div><div class="pe-seg oe-seg" id="oe-seg" style="margin-top:10px"></div><div class="oe-list" id="oe-list" role="group" aria-label="Outfit templates"></div></div>
<div class="card"><div class="oe-step"><b>3</b><h3 style="margin:0">Create</h3></div><div class="oe-acts" style="margin-top:10px">
<button class="pri oe-big" id="oe-gen" disabled>✨ Generate</button><button id="oe-reg" disabled>↻ Regenerate</button><button id="oe-chg" disabled>⇄ Change Outfit</button><button id="oe-rst" disabled>Reset</button><button id="oe-dl" disabled>⬇ Download</button></div></div>
<div class="card" id="oe-tune" hidden><div class="oe-step"><b>4</b><h3 style="margin:0">Fine tune</h3></div><div class="oe-tn" id="oe-sl"></div>
<label class="oe-ck"><input type="checkbox" id="oe-rm" checked> Remove my photo's plain background</label><div id="oe-tolw"></div>
<p class="mu" style="margin:10px 0 6px;font-size:13px">Background</p><div class="pe-seg oe-bgs" id="oe-bgs"></div></div>
</aside></div></div>`;

const note=m=>{const n=$('#oe-note');n.hidden=!m;n.textContent=m||''};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function norm(){const has=!!S.orig,g=$('#oe-gen');g.disabled=S.busy||!has||!S.pick;g.textContent=S.res?'✨ Generate Again':'✨ Generate';
 $('#oe-reg').disabled=S.busy||!S.res;$('#oe-chg').disabled=S.busy||!has;$('#oe-rst').disabled=!has||S.busy;$('#oe-dl').disabled=S.busy||!S.res;
 $('#oe-in').disabled=$('#oe-rp').disabled=S.busy;root.querySelectorAll('.oe-it,#oe-seg button').forEach(b=>b.disabled=S.busy);
 $('#oe-busy').hidden=!S.busy;$('#oe-pn').textContent=has?S.name+(S.pick?'':' · now choose an outfit'):'No photo yet.';$('#oe-tune').hidden=!S.res;$('#oe-modes').hidden=!S.res}
function show(){const has=!!S.orig,r=S.res,adj=S.mode==='adj';$('#oe-drop').hidden=has;$('#oe-cmp').hidden=!has;
 if(has){$('#oe-bf').src=S.url;$('#oe-cmp').style.setProperty('--ar',S.T?S.T.w/S.T.h:S.orig.width/S.orig.height)}
 $('#oe-af').hidden=!r;$('#oe-h').hidden=$('#oe-r').hidden=$('#oe-lb').hidden=!r||adj;$('#oe-la').hidden=!r||adj;$('#oe-lb').hidden=!r||adj;
 $('#oe-cmp').classList.toggle('adj',r&&adj);if(r&&adj)$('#oe-cmp').style.setProperty('--x','0%');
 $('#oe-modes').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===S.mode));norm()}
const setX=v=>$('#oe-cmp').style.setProperty('--x',v+'%');

/* ---- photo in: fix EXIF rotation, cap at 1536 px ---- */
async function load(f){note('');if(!f)return;
 if(!/^image\/(jpeg|png|webp)$/.test(f.type))return note('This file type is not supported. Choose a JPG, PNG or WEBP photo.');
 if(f.size>25*1048576)return note('This photo is too large. Choose one under 25 MB.');
 try{const bm=await createImageBitmap(f,{imageOrientation:'from-image'}),k=Math.min(1,1536/Math.max(bm.width,bm.height)),c=mk(Math.round(bm.width*k),Math.round(bm.height*k)),g=c.getContext('2d',{willReadFrequently:true});
  g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.imageSmoothingQuality='high';g.drawImage(bm,0,0,c.width,c.height);bm.close&&bm.close();
  const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));if(!b)throw 0;
  S.url&&URL.revokeObjectURL(S.url);S.orig=c;S.url=URL.createObjectURL(b);S.name=(f.name||'photo').slice(0,40);S.keyed=null;S.res=false;S.P=null;show()}
 catch(e){note('This photo could not be opened. It may be damaged or too large for this browser.')}}

/* ---- remove a plain background: flood fill from the border, soft edge (no AI) ---- */
function keyOut(src,tol){const w=src.width,h=src.height,im=src.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h),d=im.data,n=w*h;
 const sm=[[],[],[]];const add=i=>{for(let c=0;c<3;c++)sm[c].push(d[i*4+c])};
 for(let x=0;x<w;x+=Math.max(1,w>>6)){add(x);add((h-1)*w+x)}for(let y=0;y<h;y+=Math.max(1,h>>6)){add(y*w);add(y*w+w-1)}
 const bg=sm.map(a=>a.sort((p,q)=>p-q)[a.length>>1]),t0=tol*.5,t1=tol*1.3,dist=new Float32Array(n);
 for(let i=0;i<n;i++){const a=d[i*4]-bg[0],b=d[i*4+1]-bg[1],c=d[i*4+2]-bg[2];dist[i]=Math.sqrt(a*a+b*b+c*c)}
 const seen=new Uint8Array(n),st=new Int32Array(n);let sp=0;
 const push=i=>{if(!seen[i]&&dist[i]<t1){seen[i]=1;st[sp++]=i}};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
 while(sp){const i=st[--sp],x=i%w;if(x>0)push(i-1);if(x<w-1)push(i+1);if(i>=w)push(i-w);if(i<n-w)push(i+w)}
 const al=new Float32Array(n);for(let i=0;i<n;i++)al[i]=seen[i]?cl((dist[i]-t0)/(t1-t0),0,1):1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let m=al[i];if(m<1){let t=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)t+=al[cl(y+a,0,h-1)*w+cl(x+b,0,w-1)];m=Math.min(m,t/9)}d[i*4+3]=Math.round(255*m)}
 const o=mk(w,h);o.getContext('2d').putImageData(im,0,0);return o}
function keyed(){if(!S.rm)return S.orig;if(!S.key||S.key.tol!==S.tol)S.key={tol:S.tol,c:keyOut(S.orig,S.tol)};return S.key.c}

/* ---- outfits ---- */
function tpl(o){if(TC.has(o.id))return TC.get(o.id);
 const p=new Promise((ok,no)=>{const im=new Image();im.onload=()=>{const c=mk(o.w,o.h),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
  const col=g.getImageData(Math.round(o.cx*o.w),0,1,o.h).data;let vy=Math.round(o.sy*o.h);while(vy<o.h-1&&col[vy*4+3]<128)vy++;{const all=g.getImageData(0,0,o.w,o.h).data,fm=mk(o.w,o.h),fg=fm.getContext('2d');fg.fillStyle='#fff';for(let y=0;y<o.h;y++){let l=-1,r=-1;for(let x=0;x<o.w;x++)if(all[(y*o.w+x)*4+3]>128){if(l<0)l=x;r=x}if(l>=0)fg.fillRect(l,y,r-l+1,1)}ok({...o,img:im,vy:vy/o.h,fm})}};im.onerror=()=>no(new Error('The outfit image could not be loaded'));im.src='photo-editor/outfits/'+o.file});
 TC.set(o.id,p);p.catch(()=>TC.delete(o.id));return p}
function list(){const gs=[...new Set(S.outfits.map(o=>o.group))];
 $('#oe-seg').innerHTML=gs.map(g=>`<button data-g="${g}" aria-pressed="${g===S.group}">${g}</button>`).join('');
 $('#oe-list').innerHTML=S.outfits.filter(o=>o.group===S.group).map(o=>`<button class="oe-it" data-id="${o.id}" aria-pressed="${!!S.pick&&S.pick.id===o.id}" aria-label="${o.name}"><img src="photo-editor/outfits/${o.thumb}" alt="" loading="lazy"><small>${o.name}</small></button>`).join('');norm()}
$('#oe-seg').onclick=e=>{const b=e.target.closest('button');if(!b||S.busy)return;S.group=b.dataset.g;list()};
$('#oe-list').onclick=e=>{const b=e.target.closest('.oe-it');if(!b||S.busy)return;S.pick=S.outfits.find(o=>o.id===b.dataset.id);note('');list();if(S.res)generate()};

/* ---- auto fit: find head width and shoulder row from the cut-out, then size and place the head on the outfit ---- */
function analyse(c){const w=c.width,h=c.height,d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data,cnt=new Int32Array(h),sx=new Float64Array(h);
 for(let y=0;y<h;y++){let n=0,s=0;for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>128){n++;s+=x}cnt[y]=n;sx[y]=s}
 let top=0;while(top<h-1&&cnt[top]<Math.max(3,w*.01))top++;const fh=h-top,y0=Math.round(top+.14*fh),y1=Math.round(top+.30*fh),ws=[];let sxx=0,sn=0;
 for(let y=y0;y<=y1;y++){ws.push(cnt[y]);sxx+=sx[y];sn+=cnt[y]}ws.sort((a,b)=>a-b);
 const hw=Math.max(w*.08,ws[ws.length>>1]||w*.4),hc=sn?sxx/sn:w/2;let ys=Math.round(top+.28*fh);while(ys<h&&cnt[ys]<hw*1.4)ys++;
 const ok=ys<h-2&&hw<w*.9;if(!ok)ys=Math.round(top+.62*fh);return{top,hw,hc,ys,ok}}
function fit(){const T=S.T,K=keyed(),A=analyse(K),W=T.w,H=T.h,tw=.54*T.span*W,sc=tw/A.hw,ys=T.sy*H+.02*H;
 S.fitInfo=A;const dw=K.width*sc;
 S.P={size:dw/W,ox:(T.cx*W-(A.hc-K.width/2)*sc)/W-.5,oy:(ys-(A.ys-K.height/2)*sc)/H-.5,rot:0,cut:cl((ys-.46*tw)/H,.1,.95),br:0,ct:0,sh:30}}

/* ---- compose ---- */
function maskOf(W,H,T,P){const f=.012*H,sy=T.sy*H,cut=P.cut*H,cx=T.cx*W,b=.26*T.span*W,m=mk(W,H),g=m.getContext('2d');
 let gr=g.createLinearGradient(0,0,0,sy+f);gr.addColorStop(Math.max(0,(sy-f)/(sy+f)),'#fff');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,W,sy+f);
 const B=mk(W,H),bg=B.getContext('2d'),x0=cx-b-f,bw=2*b+2*f;gr=bg.createLinearGradient(x0,0,x0+bw,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(f/bw,'#fff');gr.addColorStop(1-f/bw,'#fff');gr.addColorStop(1,'rgba(255,255,255,0)');
 bg.fillStyle=gr;bg.fillRect(x0,Math.max(0,sy-3*f),bw,H);bg.globalCompositeOperation='destination-in';
 gr=bg.createLinearGradient(0,cut-f,0,cut+f);gr.addColorStop(0,'#fff');gr.addColorStop(1,'rgba(255,255,255,0)');bg.fillStyle=gr;bg.fillRect(0,0,W,H);g.drawImage(B,0,0);return m}
function compose(k){const T=S.T,P=S.P,K=keyed(),W=Math.round(T.w*k),H=Math.round(T.h*k),out=mk(W,H),g=out.getContext('2d');
 if(S.bg!=='none'){g.fillStyle=S.bg==='tpl'?T.bg:BG[S.bg];g.fillRect(0,0,W,H)}
 const L=mk(W,H),lg=L.getContext('2d',{willReadFrequently:true});lg.imageSmoothingQuality='high';lg.translate(W*(.5+P.ox),H*(.5+P.oy));lg.rotate(P.rot*Math.PI/180);
 const dw=P.size*W,dh=dw*K.height/K.width;lg.drawImage(K,-dw/2,-dh/2,dw,dh);lg.setTransform(1,0,0,1,0,0);
 if(P.br||P.ct){const im=lg.getImageData(0,0,W,H),d=im.data,b=P.br*2.55,c=1+P.ct/100;for(let i=0;i<d.length;i+=4){d[i]=(d[i]-128)*c+128+b;d[i+1]=(d[i+1]-128)*c+128+b;d[i+2]=(d[i+2]-128)*c+128+b}lg.putImageData(im,0,0)}
 lg.globalCompositeOperation='destination-in';lg.drawImage(maskOf(W,H,T,P),0,0);lg.globalCompositeOperation='source-over';
 const cx=T.cx*W,cut=P.cut*H,b=.26*T.span*W,f=.012*H;let r=190,gg=140,bl=110;
 {const bx=Math.round(cx-.03*W),by=Math.round(cut-.045*H),bw=Math.max(2,Math.round(.06*W)),bh=Math.max(2,Math.round(.025*H)),d=lg.getImageData(bx,Math.max(0,by),bw,bh).data;let a=0,sr=0,sg=0,sb=0;
  for(let i=0;i<d.length;i+=4){const q=d[i+3];a+=q;sr+=d[i]*q;sg+=d[i+1]*q;sb+=d[i+2]*q}if(a>255*bw*bh*.3){r=sr/a;gg=sg/a;bl=sb/a}}
 const y0=cut-2*f,y1=Math.max(y0+10,T.vy*H+.05*H),sk=g.createLinearGradient(0,y0,0,y1);sk.addColorStop(0,`rgb(${r|0},${gg|0},${bl|0})`);sk.addColorStop(1,`rgb(${r*.72|0},${gg*.72|0},${bl*.72|0})`);{const sl=mk(W,H),sg=sl.getContext('2d');sg.fillStyle=sk;sg.fillRect(cx-b,y0,2*b,y1-y0);sg.globalCompositeOperation='destination-in';sg.drawImage(T.fm,0,0,W,H);g.drawImage(sl,0,0)}
 g.drawImage(L,0,0);g.drawImage(T.img,0,0,W,H);
 if(P.sh>0){const s=mk(W,H),sg2=s.getContext('2d'),rx=.2*T.span*W;sg2.translate(cx,cut);sg2.scale(1,.9);const gr=sg2.createRadialGradient(0,0,0,0,0,rx);gr.addColorStop(0,`rgba(0,0,0,${P.sh/100*.55})`);gr.addColorStop(1,'rgba(0,0,0,0)');sg2.fillStyle=gr;sg2.fillRect(-rx,-rx,2*rx,2*rx);
  sg2.setTransform(1,0,0,1,0,0);sg2.globalCompositeOperation='destination-in';sg2.drawImage(T.img,0,0,W,H);g.drawImage(s,0,0)}
 return out}
let raf=0;function paint(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{if(!S.res||!S.T)return;const k=Math.min(1,900/Math.max(S.T.w,S.T.h)),c=compose(k),a=$('#oe-af');a.width=c.width;a.height=c.height;a.getContext('2d').drawImage(c,0,0)})}

/* ---- actions ---- */
async function generate(){if(S.busy||!S.orig||!S.pick)return;note('');S.busy=true;$('#oe-bm').textContent='Fitting your outfit...';norm();const t0=Date.now();
 try{S.T=await tpl(S.pick);await sleep(30);fit();S.res=true;S.bg=S.bg;const w=Date.now()-t0;if(w<400)await sleep(400-w);S.busy=false;show();tune();paint();
  say(S.fitInfo&&S.fitInfo.ok?'Done. Drag the slider to compare, or switch to Adjust.':'Done, but the head position is a guess. Use Adjust or the sliders.')}
 catch(e){S.busy=false;note(e.message||'Something went wrong. Try again.');norm()}}
function tune(){$('#oe-sl').innerHTML=SL.map(([k,l,a,b,s,f])=>`<label class="oe-sl"><span>${l}</span><em id="oe-v-${k}">${f(S.P[k])}</em><input type="range" data-k="${k}" min="${a}" max="${b}" step="${s}" value="${S.P[k]}" aria-label="${l}"></label>`).join('');
 $('#oe-tolw').innerHTML=`<label class="oe-sl" ${S.rm?'':'hidden'}><span>Background removal strength</span><em id="oe-v-tol">${S.tol}</em><input type="range" data-k="tol" min="5" max="80" step="1" value="${S.tol}" aria-label="Background removal strength"></label>`;
 $('#oe-rm').checked=S.rm;$('#oe-bgs').innerHTML=Object.keys(BG).map(k=>`<button data-b="${k}" aria-pressed="${S.bg===k}">${k==='tpl'?'Outfit':k==='none'?'Transparent':k[0].toUpperCase()+k.slice(1)}</button>`).join('')}
$('#oe-sl').oninput=e=>{const i=e.target.closest('input');if(!i)return;const k=i.dataset.k;S.P[k]=+i.value;$('#oe-v-'+k).textContent=SL.find(s=>s[0]===k)[5](S.P[k]);paint()};
let tt=0;$('#oe-tolw').oninput=e=>{const i=e.target.closest('input');if(!i)return;S.tol=+i.value;$('#oe-v-tol').textContent=S.tol;clearTimeout(tt);tt=setTimeout(paint,120)};
$('#oe-rm').onchange=e=>{S.rm=e.target.checked;tune();paint()};
$('#oe-bgs').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.bg=b.dataset.b;$('#oe-bgs').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));paint()};
$('#oe-gen').onclick=generate;
$('#oe-reg').onclick=async()=>{if(S.busy||!S.res)return;S.busy=true;$('#oe-bm').textContent='Refitting...';norm();await sleep(350);fit();S.busy=false;tune();paint();norm();say('Auto-fit applied again. Your manual changes were reset.')};
$('#oe-chg').onclick=()=>{if(S.busy)return;const f=$('#oe-list .oe-it[aria-pressed=true]')||$('#oe-list .oe-it');f&&f.focus();$('#oe-list').scrollIntoView({block:'nearest',behavior:'smooth'});say('Tap another outfit to try it on')};
$('#oe-rst').onclick=()=>{S.url&&URL.revokeObjectURL(S.url);Object.assign(S,{orig:null,url:'',keyed:null,key:null,pick:null,T:null,P:null,res:false,busy:false,name:'photo',mode:'cmp',bg:'tpl',rm:true,tol:30});note('');show();list()};
$('#oe-dl').onclick=()=>{if(!S.res)return;const c=compose(1);c.toBlob(b=>{if(!b)return say('Export failed. Try again.');const a=document.createElement('a'),u=URL.createObjectURL(b);a.href=u;a.download=S.name.replace(/\.[^.]+$/,'').replace(/[^\w-]+/g,'_')+'-outfit.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);say(`Downloaded ${c.width}×${c.height}`)},'image/png')};
$('#oe-r').oninput=e=>setX(e.target.value);
$('#oe-modes').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.mode=b.dataset.m;show();if(S.mode==='cmp'){$('#oe-r').value=50;setX(50)}};
/* drag the head in Adjust mode */
{const a=$('#oe-af');let d=null;a.onpointerdown=e=>{if(S.mode!=='adj'||!S.P)return;d={x:e.clientX,y:e.clientY,ox:S.P.ox,oy:S.P.oy};a.setPointerCapture(e.pointerId);e.preventDefault()};
 a.onpointermove=e=>{if(!d)return;const r=a.getBoundingClientRect();S.P.ox=cl(d.ox+(e.clientX-d.x)/r.width,-.7,.7);S.P.oy=cl(d.oy+(e.clientY-d.y)/r.height,-.9,.9);
  for(const k of['ox','oy']){const i=root.querySelector(`input[data-k=${k}]`);i&&(i.value=S.P[k]);const v=$('#oe-v-'+k);v&&(v.textContent=SL.find(s=>s[0]===k)[5](S.P[k]))}paint()};
 a.onpointerup=a.onpointercancel=()=>{d=null}}

/* ---- upload + drag and drop ---- */
const pickF=()=>{if(!S.busy)$('#oe-in').click()};
$('#oe-up').onclick=$('#oe-rp').onclick=pickF;
$('#oe-in').onchange=e=>{const f=e.target.files[0];e.target.value='';load(f)};
const dz=$('#oe-stage');['dragover','dragenter'].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();$('#oe-drop').classList.add('over')}));
['dragleave','drop'].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();$('#oe-drop').classList.remove('over')}));
dz.addEventListener('drop',e=>{if(!S.busy)load(e.dataTransfer.files[0])});

fetch('photo-editor/outfits/outfits.json').then(r=>r.json()).then(o=>{S.outfits=o;S.group=(o[0]||{}).group||'Men';list()}).catch(()=>{$('#oe-list').innerHTML='<p class="mu">The outfit list could not be loaded.</p>'});
show();
})();
