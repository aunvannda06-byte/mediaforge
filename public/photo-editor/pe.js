/* MediaForge Photo Editor. The original image is never modified; every edit is a parameter set (S.p) rendered from S.src.
   AI hook: define window.PE_PROVIDER = { removeBackground(canvas,params), removeObject, faceEnhance, upscale, ... } where each
   function returns a canvas. Without a provider, those tools show "Needs AI provider" and only local image processing runs. */
(()=>{
const $=s=>document.querySelector(s),cl=(v,a,b)=>Math.min(b,Math.max(a,v)),prov=()=>window.PE_PROVIDER||{};
const P0={ex:0,ct:0,sa:0,tp:0,sh:0,dn:0,cv:0,vb:0,au:0,fl:'None',rot:0,fx:false,ratio:0,cr:null,up:1,tx:'',tc:'',tf:'Khmer OS Siemreap',tst:0,ts:60,ty:85,th:50};
const FL={None:{},Natural:{sa:8,ct:5},Professional:{ct:12,sa:6},Portrait:{ex:6,sa:-4,tp:6},Cinematic:{ct:22,sa:-12,tp:-14},Warm:{tp:28},Cool:{tp:-28},Vibrant:{sa:40,ct:8},Soft:{ct:-14,ex:6},Documentary:{ct:14,sa:-22},Wedding:{ex:12,ct:-8,sa:-8,tp:8},Night:{ex:-14,ct:14,tp:-18},HDR:{ct:26,sa:22},'Black & White':{sa:-100,ct:10}};
const SOC={Facebook:[1200,630],Instagram:[1080,1080],TikTok:[1080,1920],YouTube:[1280,720],LinkedIn:[1200,627]};
const S={cmode:false,cb:[0,0,1,1],cl:0,col:null,src:null,img:null,ref:null,name:'photo',p:{...P0},hist:[],at:0,mode:'cmp',tool:'ai',str:1,z:1,m:null,doc:null,pending:null,tp:null,blank:false,tpbg:null,ex:{f:'jpeg',q:'.92',res:'0',soc:''}};
let st=null;

/* ---------- image engine ---------- */
function blur(s,W,H,r){const t=new Float32Array(s.length),o=new Uint8ClampedArray(s.length),n=2*r+1;
 for(let y=0;y<H;y++)for(let c=0;c<3;c++){let a=0;const b=y*W*4+c;for(let i=-r;i<=r;i++)a+=s[b+Math.min(W-1,Math.max(0,i))*4];for(let x=0;x<W;x++){t[b+x*4]=a/n;a+=s[b+Math.min(W-1,x+r+1)*4]-s[b+Math.max(0,x-r)*4]}}
 for(let x=0;x<W;x++)for(let c=0;c<3;c++){let a=0;const b=x*4+c;for(let i=-r;i<=r;i++)a+=t[b+Math.min(H-1,Math.max(0,i))*W*4];for(let y=0;y<H;y++){o[b+y*W*4]=a/n;a+=t[b+Math.min(H-1,y+r+1)*W*4]-t[b+Math.max(0,y-r)*W*4]}}
 return o}
function pix(c,p){const f=FL[p.fl]||{},ex=p.ex+(f.ex||0),ct=p.ct+(f.ct||0),sa=p.sa+(f.sa||0),tp=p.tp+(f.tp||0);
 if(!(p.au||ex||ct||sa||tp||p.sh||p.dn||p.cv||p.vb))return;
 const x=c.getContext('2d'),W=c.width,H=c.height,im=x.getImageData(0,0,W,H),d=im.data,n=W*H,r0=Math.max(1,Math.round(W/900));
 if(p.dn){const b=blur(d,W,H,r0+Math.round(p.dn/50)),m=Math.min(.8,p.dn/110);for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)d[i+k]+=(b[i+k]-d[i+k])*m}
 let lo=0,sc=1;
 if(p.au){const h=new Uint32Array(256);for(let i=0;i<d.length;i+=4)h[(.299*d[i]+.587*d[i+1]+.114*d[i+2])|0]++;let a=0,l=0,u=255;for(;l<255&&(a+=h[l])<n*.005;l++);a=0;for(;u>0&&(a+=h[u])<n*.005;u--);lo=Math.min(l,60);sc=255/(Math.max(u,195)-lo)}
 const vv=(p.vb||0)/100,eg=Math.max(0,1+ex/100),cg=Math.max(0,1+ct/100),sg=Math.max(0,1+sa/100),t=tp*.35;
 for(let i=0;i<d.length;i+=4){let r=(d[i]-lo)*sc*eg+t,g=(d[i+1]-lo)*sc*eg,b=(d[i+2]-lo)*sc*eg-t;r=(r-128)*cg+128;g=(g-128)*cg+128;b=(b-128)*cg+128;const y=.299*r+.587*g+.114*b;let f=sg;if(vv){const mx=Math.max(r,g,b),mn=Math.min(r,g,b),s=mx>1?Math.min(1,(mx-mn)/mx):0;f*=1+vv*(1-s)}d[i]=y+(r-y)*f;d[i+1]=y+(g-y)*f;d[i+2]=y+(b-y)*f}
 if(p.cv){const b=blur(d,W,H,Math.max(6,Math.round(W/70))),a=p.cv/100*1.1;for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)d[i+k]+=(d[i+k]-b[i+k])*a}
 if(p.sh){const b=blur(d,W,H,r0),a=p.sh/100*1.6;for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)d[i+k]+=(d[i+k]-b[i+k])*a}
 x.putImageData(im,0,0)}
function geom(p,s){const r=p.rot%180,w=r?s.height:s.width,h=r?s.width:s.height;let x=0,y=0,cw=w,ch=h;
 if(p.cr){x=Math.round(p.cr[0]*w);y=Math.round(p.cr[1]*h);cw=Math.max(1,Math.min(w-x,Math.round(p.cr[2]*w)));ch=Math.max(1,Math.min(h-y,Math.round(p.cr[3]*h)))}
 if(p.ratio){let nw=cw,nh=ch;if(cw/ch>p.ratio)nw=Math.round(ch*p.ratio);else nh=Math.round(cw/p.ratio);x+=Math.round((cw-nw)/2);y+=Math.round((ch-nh)/2);cw=nw;ch=nh}
 return{cw,ch,x,y,w,h}}
function render(s,p,k){const{cw,ch,x:gx,y:gy,w:gw,h:gh}=geom(p,s),c=document.createElement('canvas');c.width=Math.max(1,Math.round(cw*k));c.height=Math.max(1,Math.round(ch*k));
 const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingQuality='high';x.translate(c.width/2-(gx+cw/2-gw/2)*k,c.height/2-(gy+ch/2-gh/2)*k);x.rotate(p.rot*Math.PI/180);x.scale(p.fx?-1:1,1);x.drawImage(s,-s.width*k/2,-s.height*k/2,s.width*k,s.height*k);x.setTransform(1,0,0,1,0,0);pix(c,p);
 if(p.tx){const f=fobj(p.tf);drawTxt(x,c.width*p.th/100,c.height*p.ty/100,p.tx,c.height*p.ts/600,f[0],f[2],STY[p.tst]||STY[0],p.tc,c.width*.94)}
 return c}

/* ---------- fonts + 20 text styles (CapCut-like) ---------- */
const FONTS=[["Khmer OS Siemreap","Khmer OS Siemreap",400,1],["Khmer OS Moul Light","Khmer OS Moul Light",400,1],["Khmer OS Battambang","Khmer OS Battambang",700,1],["Khmer OS Muol Pali","Khmer OS Moul Pali",400,1],["Koulen","Koulen",400,1],["Hanuman","Hanuman",700,1],["Bokor","Bokor",400,1],["Dangrek","Dangrek",400,1],["Freehand","Freehand",400,1],["Metal","Metal",400,1],["Nokora","Nokora",700,1],["Odor Mean Chey","Odor Mean Chey",400,1],["Preahvihear","Preahvihear",400,1],["Suwannaphum","Suwannaphum",700,1],["Taprom","Taprom",400,1],["Angkor","Angkor",400,1],["Bayon","Bayon",400,1],["Chenla","Chenla",400,1],["Content","Content",700,1],["Fasthand","Fasthand",400,1],["Kantumruy Pro","Kantumruy Pro",700,1],["Noto Sans Khmer","Noto Sans Khmer",900,1],["Kdam Thmor Pro","Kdam Thmor Pro",400,1],["Bebas Neue","Bebas Neue",400,0],["Anton","Anton",400,0],["Montserrat","Montserrat",900,0],["Oswald","Oswald",700,0],["Playfair Display","Playfair Display",700,0],["Pacifico","Pacifico",400,0],["Lobster","Lobster",400,0],["Dancing Script","Dancing Script",700,0],["Permanent Marker","Permanent Marker",400,0],["Bangers","Bangers",400,0],["Righteous","Righteous",400,0]];
const FB='"Khmer OS Siemreap","Noto Sans Khmer","Segoe UI",system-ui,sans-serif';
const fobj=f=>FONTS.find(x=>x[0]===f)||FONTS[0];
const STY=[
 {n:'Classic',f:'#fff',s:['#000',.14]},
 {n:'Pop Yellow',f:'#FFD60A',s:['#000',.16]},
 {n:'Neon Pink',f:'#fff',s:['#ff2bd6',.05],gl:['#ff2bd6',.5]},
 {n:'Neon Cyan',f:'#fff',s:['#00e5ff',.05],gl:['#00e5ff',.5]},
 {n:'Sunset',g:['#ffe066','#ff8a3d','#ff2d78'],s:['#3b0a45',.08],sh:['#0007',.12,0,.05]},
 {n:'Gold',g:['#fff7c2','#f7c948','#b8860b'],s:['#4a2e00',.07],sh:['#000a',.1,0,.06]},
 {n:'Outline',f:'rgba(0,0,0,0)',s:['#fff',.1]},
 {n:'Drop Shadow',f:'#fff',sh:['#000c',.12,.06,.07]},
 {n:'Retro 3D',f:'#ffe14d',s:['#1a1a1a',.08],x:['#e63946',9,.07,.07]},
 {n:'Black Label',f:'#fff',bg:{c:'#000',p:.4,r:.18}},
 {n:'Yellow Label',f:'#111',bg:{c:'#FFD60A',p:.4,r:.12}},
 {n:'Pink Pill',f:'#fff',bg:{c:'#ff4d8d',p:.5,r:.6}},
 {n:'Glitch',f:'#fff',gt:['#ff004d','#00f0ff',.045]},
 {n:'Comic',f:'#fff',s:['#000',.2],x:['#ff9f1c',6,.05,.06]},
 {n:'Ice',g:['#ffffff','#a5ecff','#3aa0ff'],s:['#0b3b6f',.07],gl:['#38bdf8',.35]},
 {n:'Fire',g:['#fff176','#ff9800','#e53935'],s:['#3a0b0b',.07],gl:['#ff5722',.4]},
 {n:'Neon Green',f:'#eaffea',s:['#39ff14',.05],gl:['#39ff14',.5]},
 {n:'Soft Glow',f:'#fff',sh:['#0009',.4,0,.05]},
 {n:'Purple',g:['#f5d0fe','#a855f7','#6d28d9'],s:['#2e1065',.09],sh:['#0006',.1,0,.05]},
 {n:'Vintage',f:'#fdf0d5',s:['#5c3d2e',.12],sh:['#5c3d2ecc',0,.06,.06]}];
function rr(x,a,b,w,h,r){r=Math.min(r,w/2,h/2);x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function drawTxt(x,cx,cy,text,fs,fam,wt,st,col,maxW){const lines=String(text).split('\n');x.save();x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.miterLimit=2;
 const setF=()=>{x.font=`${wt} ${fs}px "${fam}",${FB}`};setF();
 let mw=Math.max(1,...lines.map(l=>x.measureText(l).width));if(maxW&&mw>maxW){fs*=maxW/mw;mw=maxW;setF()}
 const lh=fs*1.4,y0=cy-(lines.length-1)*lh/2;
 if(st.bg){const p=fs*st.bg.p,bw=mw+p*2,bh=lines.length*lh+p*.3;x.fillStyle=st.bg.c;rr(x,cx-bw/2,cy-bh/2,bw,bh,fs*st.bg.r);x.fill()}
 lines.forEach((l,i)=>{const y=y0+i*lh;let fill=col||st.f;
  if(!col&&st.g){const g=x.createLinearGradient(0,y-fs*.55,0,y+fs*.55);st.g.forEach((c,j)=>g.addColorStop(j/(st.g.length-1),c));fill=g}
  const main=()=>{if(st.s){x.lineWidth=fs*st.s[1];x.strokeStyle=st.s[0];x.strokeText(l,cx,y)}x.fillStyle=fill;x.fillText(l,cx,y)};
  if(st.x){const[c,n,dx,dy]=st.x;for(let j=n;j>0;j--){const ox=dx*fs*j/n,oy=dy*fs*j/n;x.fillStyle=c;if(st.s){x.lineWidth=fs*st.s[1];x.strokeStyle=c;x.strokeText(l,cx+ox,y+oy)}x.fillText(l,cx+ox,y+oy)}}
  if(st.gt){const[c1,c2,o]=st.gt;x.fillStyle=c1;x.fillText(l,cx-o*fs,y);x.fillStyle=c2;x.fillText(l,cx+o*fs,y)}
  const sh=st.sh||st.gl;
  if(sh){x.shadowColor=sh[0];x.shadowBlur=fs*sh[1];x.shadowOffsetX=fs*(sh[2]||0);x.shadowOffsetY=fs*(sh[3]||0);main();x.shadowColor='transparent';x.shadowBlur=0;x.shadowOffsetX=x.shadowOffsetY=0;if(st.gl)main()}
  else main()});
 x.restore()}
const thumbCache={};
function styThumb(i,f){const k=i+f[0],c=document.createElement('canvas');c.width=144;c.height=72;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,144,72);g.addColorStop(0,'#2b3350');g.addColorStop(1,'#141a2e');x.fillStyle=g;x.fillRect(0,0,144,72);
 drawTxt(x,72,37,'Aa កខ',30,f[0],f[2],STY[i],'',130);return c.toDataURL()}
const fontReady=(f,t)=>{f=fobj(f);return document.fonts?Promise.race([document.fonts.load(`${f[2]} 48px "${f[0]}"`,(t||'')+'Aក'),new Promise(r=>setTimeout(r,2500))]).catch(()=>{}):Promise.resolve()};
function thumbs(){const f=fobj(S.p.tf);document.querySelectorAll('#pe-set img[data-th]').forEach(im=>{im.src=styThumb(+im.dataset.th,f)})}
const put=(cv,s)=>{cv.width=s.width;cv.height=s.height;cv.getContext('2d').drawImage(s,0,0)};

/* ---------- Photo Doctor: real pixel measurements on a 256px copy ---------- */
function analyze(cv){const s=Math.min(1,256/Math.max(cv.width,cv.height)),w=Math.max(8,Math.round(cv.width*s)),h=Math.max(8,Math.round(cv.height*s)),c=document.createElement('canvas');c.width=w;c.height=h;
 const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(cv,0,0,w,h);const d=x.getImageData(0,0,w,h).data,n=w*h,L=new Float32Array(n);let R=0,B=0,sa=0,m=0;
 for(let i=0;i<n;i++){const r=d[i*4],g=d[i*4+1],b=d[i*4+2];R+=r;B+=b;L[i]=.299*r+.587*g+.114*b;m+=L[i];const mx=Math.max(r,g,b);sa+=mx?(mx-Math.min(r,g,b))/mx:0}
 let lv=0,nz=0,nc=0;for(let y=1;y<h-1;y++)for(let X=1;X<w-1;X++){const i=y*w+X,a=L[i-1]+L[i+1]+L[i-w]+L[i+w],lap=a-4*L[i];lv+=lap*lap;if(Math.abs(lap)<12){nz+=Math.abs(L[i]-a/4);nc++}}
 return{mean:m/n,sharp:lv/n,noise:nc?nz/nc:0,sat:sa/n,cast:(R-B)/n,w:cv.width,h:cv.height}}
function diagnose(m){const rc=[],ex=m.mean<95?'Underexposed':m.mean>165?'Overexposed':'Balanced',sh=m.sharp<120?'Soft':'Sharp',cs=Math.abs(m.cast)>10?(m.cast>0?'Warm cast':'Cool cast'):'Neutral',co=m.sat<.28?'Muted':'Good',nz=m.noise>2?'Noticeable':'Low';
 if(ex!=='Balanced')rc.push(['Improve exposure',{ex:cl(Math.round((122-m.mean)*.6),-40,40)}]);
 if(cs!=='Neutral')rc.push(['Correct white balance',{tp:cl(Math.round(-m.cast*.8),-30,30)}]);
 if(sh==='Soft')rc.push(['Sharpen subject',{sh:45}]);
 if(nz==='Noticeable')rc.push(['Reduce noise',{dn:35}]);
 if(co==='Muted')rc.push(['Improve colors',{sa:18}]);
 return{rc,rows:[['Exposure',ex],['Sharpness',sh],['Color',co+(cs!=='Neutral'?' · '+cs:'')],['Noise',nz],['Face clarity','Needs AI provider'],['Background','Needs AI provider'],['Composition',m.w+'×'+m.h]]}}
const pro=m=>({au:1,ct:16,ex:m.mean<105||m.mean>150?cl(Math.round((125-m.mean)*.55),-35,40):0,sa:m.sat<.3?32:20,tp:Math.abs(m.cast)>8?cl(Math.round(-m.cast*.7),-25,25):0,sh:m.sharp<120?55:38,dn:m.noise>2?40:22,cv:28,vb:34});
const POS=k=>k==='sh'||k==='dn'||k==='cv';
const setP=(d,s=1)=>{for(const k in d)S.p[k]=k==='au'?1:cl(d[k]*s,POS(k)?0:-100,100)};
const addP=(d,s=S.str)=>{for(const k in d)S.p[k]=k==='au'?1:cl(S.p[k]+d[k]*s,POS(k)?0:-100,100)};

/* ---------- stage (before/after slider) ---------- */
function mkStage(host){host.innerHTML='<div class="pe-sw"><canvas class="pe-c"></canvas><canvas class="pe-o"></canvas><i class="pe-h"></i><input type="range" class="pe-r" min="0" max="100" value="50" aria-label="Drag to compare before and after"><span class="pe-l pe-lb">Before</span><span class="pe-l pe-la">After</span><div class="pe-cb" tabindex="0" hidden aria-label="Crop area. Drag to move, drag the handles to resize, arrow keys to nudge."><i data-h="nw"></i><i data-h="n"></i><i data-h="ne"></i><i data-h="e"></i><i data-h="se"></i><i data-h="s"></i><i data-h="sw"></i><i data-h="w"></i><u class="pe-cg"></u></div></div>';
 const w=host.firstChild,[c,o,h,r,lb,la,cb]=w.children,pos=()=>{o.style.clipPath=`inset(0 ${100-r.value}% 0 0)`;h.style.left=r.value+'%'};r.oninput=pos;
 const mode=m=>{const on=m==='cmp',cr=m==='crop';o.hidden=m==='edit'||cr;h.hidden=r.hidden=lb.hidden=la.hidden=!on;cb.hidden=!cr;if(on)pos();else o.style.clipPath='none'};mode('cmp');return{w,c,o,mode,cb}}

/* ---------- editor state ---------- */
const snap=()=>({p:{...S.p},src:S.src,ref:S.ref});
function sync(){$('#pe-un').disabled=S.at<1;$('#pe-re').disabled=S.at>=S.hist.length-1}
function commit(){S.hist=S.hist.slice(0,S.at+1);S.hist.push(snap());S.at++;sync()}
function go(i){if(i<0||i>=S.hist.length)return;S.at=i;S.p={...S.hist[i].p};S.src=S.hist[i].src;S.ref=S.hist[i].ref;if(S.cmode)S.cb=S.p.cr?[...S.p.cr]:[0,0,1,1];bk='';panel();refresh();sync()}
let tk=0,bk='',lr=null;
const stMode=()=>S.tool==='co'||S.tool==='tp'?'edit':S.tool==='fs'&&S.fs?(S.fs.step<2?'crop':'edit'):S.cmode?'crop':S.mode;
function refresh(){if(tk)return;tk=requestAnimationFrame(()=>{tk=0;if(!S.src)return;st.mode(stMode());st.cb.style.borderRadius='';
 if(S.tool==='fs'&&S.fs){put(st.c,fsView());st.cb.style.borderRadius='50%';S.fs.step<2&&cbShow()}
 else if(S.tool==='co'&&S.col){const cv=colDraw(1100,true);put(st.c,cv)}
 else if(S.tool==='tp'&&S.tp){put(st.c,tpDraw(1100,true))}
 else{const view=S.cmode?{...S.p,cr:null,ratio:0}:S.p,g=geom(view,S.src),k=Math.min(1,1200/Math.max(g.cw,g.ch)),key=[S.p.rot,S.p.fx,S.p.ratio,S.p.cr,S.src.width,S.src.height,S.hist[0]&&S.src===S.img].join();
  put(st.c,render(S.src,view,k));const rf=S.ref||S.src;if(!S.cmode&&(key!==bk||lr!==rf)){bk=key;lr=rf;put(st.o,render(rf,{...P0,rot:S.p.rot,fx:S.p.fx,ratio:S.p.ratio,cr:S.p.cr},k*S.src.width/rf.width))}
  S.cmode&&cbShow()}
 st.w.classList.toggle('tr',!!(S.tool==='tp'&&S.tp?S.tp.bg==='none':S.src.__a));st.w.style.width=`min(${S.z*100}%,${S.z*66*st.c.width/st.c.height}vh)`;$('#pe-zl').textContent=Math.round(S.z*100)+'%'})}
async function busy(fn,ms=1500){const b=$('#pe-busy'),m=$('#pe-bm'),M=['Analyzing your photo...','Improving details...','Enhancing colors...','Finalizing image...'];let i=0,ok=true,em='';b.hidden=false;m.textContent=M[0];const t=setInterval(()=>m.textContent=M[++i%4],380),t0=Date.now();
 await new Promise(r=>setTimeout(r,50));try{await fn()}catch(e){ok=false;em=e&&e.cld?e.message:''}
 const rest=ms-(Date.now()-t0);if(rest>0)await new Promise(r=>setTimeout(r,rest));clearInterval(t);b.hidden=true;if(!ok)toast(em||'Something went wrong. Try again or use a smaller photo.');return ok}
const run=fn=>busy(fn).then(ok=>{if(ok){commit();panel();refresh();toast('Done. Use Compare to see what changed.')}});

/* ---------- panels ---------- */
const sl=(k,l,a,b)=>`<label class="pe-sl">${l}<output>${S.p[k]}</output><input type="range" data-k="${k}" min="${a}" max="${b}" value="${S.p[k]}"></label>`;
const seg=(a,items,cur)=>`<div class="pe-seg">${items.map(([v,t])=>`<button data-a="${a}" data-v="${v}" aria-pressed="${v==cur}">${t}</button>`).join('')}</div>`;
const opts=(l,cur)=>l.map(([v,t])=>`<option value="${v}"${v==cur?' selected':''}>${t}</option>`).join('');
/* Cloudinary AI enhance: result replaces the working photo (same pixel size), so Compare and Download both use it */
const lvl=()=>S.str<1?1:S.str>1?3:2;
const fitTo=(o,s)=>{if(o.width===s.width&&o.height===s.height)return o;const c=document.createElement('canvas');c.__a=o.__a;c.width=s.width;c.height=s.height;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(o,0,0,c.width,c.height);return c};
const FIN={auto:()=>setP({au:1,ct:8,sa:10,vb:16},S.str),focus:()=>addP({sh:14}),hdr:()=>addP({ct:10,vb:20}),col:()=>addP(AIF.col(S.m),1)};
function aiRun(op,args,fin){busy(async()=>{const o=await prov()[op](S.src,args);if(!o)throw 0;S.src=fitTo(o,S.src);bk='';if(fin)fin()},2000).then(ok=>{if(ok){commit();panel();refresh();toast('AI enhancement done. Compare shows the change. Download saves this result.')}})}
const AIT=[['auto','Auto Enhance','One-click improvement',1],['focus','AI Focus & Sharpen','Make it clearer and sharper',1],['dn','AI Denoise','Reduce noise',1],['hdr','AI HDR','Recover highlights and shadows',1],['col','AI Color Correction','Balance color and white point',1],['lit','AI Lighting','Brighten and balance light',1],['face','AI Face Enhancement','Clearer, natural faces',0]];
const AIF={auto:m=>pro(m),focus:()=>({sh:45,cv:18}),dn:()=>({dn:40}),hdr:()=>({ct:18,sa:12,ex:6,cv:45,vb:20}),col:m=>({au:1,sa:10,tp:Math.abs(m.cast)>8?cl(Math.round(-m.cast*.7),-25,25):0}),lit:()=>({ex:12,ct:6})};
const PV={pt:['Portrait',['Face Enhance','Skin Retouch','Eye Enhance','Teeth Whitening','Face Lighting','Background Blur','Portrait Relighting','Remove Blemishes'],'faceEnhance'],bg:['Remove Background',['Transparent background','Replace background','Background blur','Background color','Subject separation'],'removeBackground'],ob:['Remove Object',['Magic Eraser','Remove Watermark / Unwanted Mark','Brush over an object'],'removeObject']};
const pvp=t=>{const[n,l,fn]=PV[t],ok=fn&&prov()[fn];return `<h3>${n}</h3><div class="pe-chips">${l.map(x=>`<span>${x}</span>`).join('')}</div>`+(ok?(fn==='removeObject'?`<label>What to remove<input type="text" data-r="1" maxlength="80" placeholder="e.g. watermark, person, logo" value="${(S.rp||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}"></label>`:'')+`<button class="pri" data-a="prov" data-v="${fn}">Run ${n}</button>`:`<p class="note">${fn?`AI provider not connected. These tools need a model or API. Set window.PE_PROVIDER.${fn} (see photo-editor/pe.js).`:'Collage is not built yet.'}</p>`)};
const docH=()=>{const d=S.doc;return `<div class="pe-doc"><b>✨ AI Photo Doctor</b><small class="mu">Measured on your device from the photo's pixels</small>${d.rows.map(([k,v])=>`<div class="pe-kv"><span>${k}</span><em>${v}</em></div>`).join('')}${d.rc.length?d.rc.map(r=>`<div class="pe-ck">✓ ${r[0]}</div>`).join(''):'<div class="pe-ck">✓ No basic fixes needed</div>'}<button class="pri" data-a="docall">Apply All Recommendations</button></div>`};
const PN={
 ai:()=>{const cld=!!prov().enhance,g=geom(S.p,S.src),u=S.p.up;return `<button class="pri pe-big" data-a="pro">✨ AI Professional Enhance</button><small class="mu">${cld?'Cloudinary AI removes noise and compression, makes detail clearer and smoother, and balances light and color. Download saves the enhanced photo.':'Fixes exposure, contrast, white balance, color, sharpness and noise in one step.'}</small>${seg('str',[[.5,'Low'],[1,'Medium'],[1.5,'Strong']],S.str)}${docH()}`+
  AIT.map(([id,n,d,loc])=>`<button class="pe-row" data-a="ai" data-v="${id}"><b>${n}</b><small>${d}</small><i class="tag">${cld?'Cloudinary AI':loc?'Local':'Needs AI provider'}</i></button>`).join('')+
  rsH()+`<b>AI Upscale</b>${seg('up',[[1,'Off'],[2,'2×'],[4,'4×'],[8,'8×']],u)}<small class="mu">${g.cw}×${g.ch} → ${g.cw*u}×${g.ch*u}. Standard resampling for now, not AI detail. Connect an upscale model for real results.</small>`},
 cl:()=>`<button class="pri" data-a="col">Auto Color Correction</button>${sl('ex','Exposure',-100,100)}${sl('ct','Contrast',-100,100)}${sl('sa','Saturation',-100,100)}${sl('tp','Temperature',-100,100)}${sl('sh','Sharpness',0,100)}${sl('dn','Denoise',0,100)}`,
 cr:()=>{const g=geom(S.p,S.src),lk=[[0,'Free'],[-1,'Original'],[1,'1:1'],[4/3,'4:3'],[3/4,'3:4'],[16/9,'16:9'],[9/16,'9:16']],rb=`<div class="pe-seg"><button data-a="rot" data-v="-90">⟲ Rotate</button><button data-a="rot" data-v="90">⟳ Rotate</button><button data-a="flip">⇋ Flip</button></div>`;
  return S.cmode?`<b>Crop</b><small class="mu">Drag inside the box to move it. Drag a corner or an edge to resize.</small><div class="pe-chips">${lk.map(([v,t])=>`<button class="pe-chipb" data-a="crl" data-v="${v}" aria-pressed="${v==S.cl}">${t}</button>`).join('')}</div><div class="pe-kv"><span>Selection</span><em id="pe-cs"></em></div><button class="pri pe-big" data-a="crapply">✓ Apply Crop</button><div class="pe-seg"><button data-a="crreset">Reset crop</button><button data-a="crcancel">Cancel</button></div>${rb}`
  :`<b>Crop &amp; Resize</b><div class="pe-kv"><span>Current size</span><em>${g.cw} × ${g.ch} px</em></div><button class="pri" data-a="credit">✂ Crop with mouse</button><button data-a="crreset">Reset crop</button>${rb}`},
 tx:()=>{const cur=S.p.tf,esc=S.p.tx.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  return `<label>Text<textarea data-k="tx" rows="2" placeholder="Type your text · វាយអក្សរនៅទីនេះ">${esc}</textarea></label><b>Font</b><div class="pe-fl">${FONTS.map(([fam,lab,w,k])=>`<button data-a="font" data-v="${fam}" aria-pressed="${fam===cur}" style="font-family:'${fam}',${FB};font-weight:${w}"><span>${lab}</span><em>${k?'ខ្មែរ Abc':'Abc 123'}</em></button>`).join('')}</div><b>Text style · ${STY.length} presets</b><div class="pe-ts">${STY.map((x,i)=>`<button data-a="tst" data-v="${i}" aria-pressed="${i===S.p.tst}" title="${x.n}"><img data-th="${i}" alt="${x.n}" width="144" height="72"><small>${i+1}. ${x.n}</small></button>`).join('')}</div>${sl('ts','Size',10,150)}${sl('th','Horizontal position',0,100)}${sl('ty','Vertical position',0,100)}<label>Custom color (optional)<span class="pe-colr"><input type="color" data-k="tc" value="${S.p.tc||'#ffffff'}"><button data-a="tcx">Use style color</button></span></label>`},
 co:()=>{const C=S.col,sel=C.cells[C.sel],filled=C.cells.filter(c=>c.c).length,ic=(L,i)=>`<button class="pe-ly" data-a="cl" data-v="${i}" aria-pressed="${i==C.li}" aria-label="Layout ${i+1}"><svg viewBox="0 0 40 40">${L.map(r=>`<rect x="${2+r[0]*36+1}" y="${2+r[1]*36+1}" width="${r[2]*36-2}" height="${r[3]*36-2}" rx="2"/>`).join('')}</svg></button>`,
   cs=(k,l,a,b,v)=>`<label class="pe-sl">${l}<output>${v}</output><input type="range" data-c="${k}" min="${a}" max="${b}" value="${v}"></label>`;
  return `<h3>Collage</h3><small class="mu">Choose how many photos, pick a layout, then add your photos. Click an empty box to fill it. Drag inside a photo to move it.</small>`+
  seg('cn',[[2,'2'],[3,'3'],[4,'4'],[6,'6'],[9,'9'],['free','Free']],C.free?'free':C.n)+
  (C.free?'':`<div class="pe-lys">${LAY[C.n].map(ic).join('')}</div>`)+
  `<button class="pri" data-a="cadd">＋ Add photos (${filled} added)</button>`+
  `<b>Canvas</b><div class="pe-chips">${CRAT.map(([v,t])=>`<button class="pe-chipb" data-a="cratio" data-v="${v}" aria-pressed="${v==C.ratio}">${t}</button>`).join('')}</div>`+
  cs('gap',C.free?'Photo border':'Gap',0,60,C.gap)+(C.free?'':cs('rad','Rounded corners',0,80,C.rad))+
  `<label>Background<input type="color" data-c="bg" value="${C.bg}"></label>`+
  (sel&&sel.c?`<b>Selected photo ${C.sel+1}</b>`+(C.free?cs('fw','Size',15,100,Math.round((sel.fw||.5)*100))+cs('fr','Rotate',-45,45,Math.round(sel.fr||0)):cs('z','Zoom',100,300,Math.round(sel.z*100)))+`<div class="pe-seg"><button data-a="crep">Replace</button><button data-a="cdel">Remove</button></div>`:`<small class="mu">${C.free?'Add photos to place them freely.':'Tap a photo or an empty box to select it.'}</small>`)+
  `<button class="pri pe-big" data-a="capply">✓ Apply Collage</button><button data-a="creset">Start over</button>`},
fs:()=>{const F=S.fs,sc=(k,l,a,b)=>`<label class="pe-sl">${l}<output>${F[k]}</output><input type="range" data-f="${k}" min="${a}" max="${b}" value="${F[k]}"></label>`;
  return `<h3>Face Swap</h3><small class="mu">No AI. Mark both faces with an oval. Light, shade and skin tone are taken from the target photo and the facial detail from the source.</small>`+seg('fst',[[0,'1 Target'],[1,'2 Source'],[2,'3 Preview']],F.step)+
  `<small class="mu">${['Drag the oval over the face you want to replace. Drag a corner to resize.','Drag the oval over the face you want to use.','Fine-tune below. The result updates live.'][F.step]}</small><button class="pri" data-a="fsup">${F.src?'Change source photo':'＋ Choose source photo'}</button>`+
  (F.src?sc('fe','Edge feather',5,60)+sc('cm','Skin tone match',0,100)+sc('lm','Light & shade match',0,100)+sc('so','Soften',0,100)+sc('gr','Grain',0,100)+sc('sc','Face size',70,130)+sc('wd','Face width',80,120)+sc('ht','Face height',80,120)+sc('hl','Hairline blend',0,100)+sc('rot','Rotate',-30,30)+sc('ox','Move left / right',-30,30)+sc('oy','Move up / down',-30,30)+`<button class="pri pe-big" data-a="fsapply">✓ Apply Face Swap</button>`:'')+`<button data-a="fsreset">Start over</button>`},
tp:()=>{const T=S.tp,r=(k,l,a,b)=>`<label class="pe-sl">${l}<output>${Math.round(T[k])}</output><input type="range" data-t="${k}" min="${a}" max="${b}" value="${T[k]}"></label>`;
  return `<h3>Use Template</h3><small class="mu">Choose a background and canvas size. Add your photo, or apply an empty template.</small><b>Background</b><div class="pe-tpb">${TPB.map(([c,n])=>`<button data-a="tbg" data-v="${c}" aria-pressed="${c===T.bg}"><i style="${tpSw(c)}"></i>${n}</button>`).join('')}</div><div class="pe-chips">${TPC.map(([c,n])=>`<button class="pe-chipb" data-a="tbg" data-v="${c}" aria-pressed="${c===T.bg}"><i class="pe-dot" style="background:${c}"></i>${n}</button>`).join('')}</div><label>Custom color<input type="color" data-t="cc" value="${/^#/.test(T.bg)?T.bg:'#ffffff'}"></label><label>Canvas size<select data-t="sz">${opts(TPS.map(q=>[q[0],q[1]]),T.sz)}</select></label>`+
  `<button class="pri" data-a="tphoto">${T.ph?'Change photo':'＋ Upload photo'}</button>`+
  (T.ph?`<div class="pe-seg"><button data-a="tfit" data-v="fit" aria-pressed="${T.fit==='fit'}">Fit</button><button data-a="tfit" data-v="fill" aria-pressed="${T.fit==='fill'}">Fill</button></div>${r('sc','Photo size %',20,300)}${r('ox','Move left / right',-100,100)}${r('oy','Move up / down',-100,100)}${r('rot','Rotate',-45,45)}<button class="pe-row" data-a="tprm"><b>Remove photo background</b><small>Place only the subject on the template</small><i class="tag">${prov().removeBackground?'AI provider':'Needs AI provider'}</i></button><small class="mu">Tip: drag the photo on the canvas to move it.</small>`:'')+
  `<button class="pri pe-big" data-a="tpapply">✓ Apply Template</button><button data-a="tpreset">Start over</button>`+(T.bg==='none'?`<small class="mu">Blank PNG keeps a transparent background. It exports as PNG.</small>`:'')},
 fi:()=>`<h3>Filters</h3><div class="pe-chips">${Object.keys(FL).map(k=>`<button data-a="fl" data-v="${k}" aria-pressed="${k===S.p.fl}" class="pe-chipb">${k}</button>`).join('')}</div>`,
 ex:()=>`<label>Format<select data-e="f">${opts([['jpeg','JPG'],['png','PNG'],['webp','WEBP']],S.ex.f)}</select></label><label>Quality<select data-e="q">${opts([['.8','Standard'],['.92','High'],['1','Maximum']],S.ex.q)}</select></label><label>Resolution (long side)<select data-e="res">${opts([['0','Original'],['1920','1080p'],['2560','2K'],['3840','4K'],['7680','8K']],S.ex.res)}</select></label><label>Social preset<select data-e="soc">${opts([['','None'],...Object.entries(SOC).map(([k,v])=>[k,`${k} ${v[0]}×${v[1]}`])],S.ex.soc)}</select></label><button class="pri pe-big" data-a="dl">Download</button><small class="mu">Your original file is never changed.</small>`};
const TOOLS=[['ai','✨','AI Enhance'],['pt','☺','Portrait'],['fs','⇄','Face Swap'],['bg','▣','Remove BG'],['ob','⌫','Remove Object'],['cl','◐','Color & Light'],['cr','⛶','Crop & Resize'],['tx','T','Text & Sticker'],['co','▦','Collage'],['tp','▭','Use Template'],['fi','❖','Filters'],['ex','⇩','Export']];
function panel(){const bx=$('#pe-set'),sc=bx.scrollTop,fl=bx.querySelector('.pe-fl'),fs=fl?fl.scrollTop:0;bx.innerHTML=(PN[S.tool]||(()=>pvp(S.tool)))();bx.scrollTop=sc;if(S.tool==='tx'){const f=bx.querySelector('.pe-fl');f&&(f.scrollTop=fs);thumbs();fontReady(S.p.tf).then(thumbs)}if(S.cmode)cbShow();$('#pe-side').querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.t===S.tool))}
const tool=t=>{if(S.tool==='cr'&&t!=='cr')S.cmode=false;S.tool=t;if(t==='cr'){S.cmode=true;S.cb=S.p.cr?[...S.p.cr]:[0,0,1,1]}if(t==='co')colInit();if(t==='tp')tpInit();if(t==='fs'){fsInit();S.cl=0;S.cb=[...S.fs[S.fs.step===1?'s':'t']]}panel();st&&refresh()};

/* ---------- crop with mouse ---------- */
const full=()=>geom({...S.p,cr:null,ratio:0},S.src);
function cbShow(){const b=S.cb,e=st.cb;e.style.left=b[0]*100+'%';e.style.top=b[1]*100+'%';e.style.width=b[2]*100+'%';e.style.height=b[3]*100+'%';const g=full(),o=$('#pe-cs');o&&(o.textContent=Math.round(b[2]*g.w)+' × '+Math.round(b[3]*g.h)+' px')}
const cbK=()=>{if(!S.cl)return 0;const g=full();return (S.cl<0?g.w/g.h:S.cl)*g.h/g.w};
function cbRatio(L){S.cl=L;const k=cbK();if(k){let w=.92,h=w/k;if(h>.92){h=.92;w=h*k}S.cb=[(1-w)/2,(1-h)/2,w,h]}cbShow()}
function cbMove(d,dx,dy){let[x,y,w,h]=d.b;const M=.04,k=cbK(),H=d.h;
 if(H==='m'){x=cl(x+dx,0,1-w);y=cl(y+dy,0,1-h)}
 else{let x2=x+w,y2=y+h;if(H.includes('w'))x=cl(x+dx,0,x2-M);if(H.includes('e'))x2=cl(x2+dx,x+M,1);if(H.includes('n'))y=cl(y+dy,0,y2-M);if(H.includes('s'))y2=cl(y2+dy,y+M,1);w=x2-x;h=y2-y;
  if(k){if(/[we]/.test(H)){const nh=w/k;if(H.includes('n'))y=y2-nh;else if(!H.includes('s'))y=y+(h-nh)/2;h=nh}else{const nw=h*k;x=x+(w-nw)/2;w=nw}
   if(x<-1e-6||y<-1e-6||x+w>1+1e-6||y+h>1+1e-6||w<M||h<M)return}}
 S.cb=[x,y,w,h];cbShow()}
function bindCrop(){const e=st.cb;let d=null;
 e.onpointerdown=ev=>{ev.preventDefault();e.focus({preventScroll:true});e.setPointerCapture(ev.pointerId);d={h:ev.target.dataset.h||'m',x:ev.clientX,y:ev.clientY,b:[...S.cb]}};
 e.onpointermove=ev=>{if(!d)return;const r=st.c.getBoundingClientRect();cbMove(d,(ev.clientX-d.x)/r.width,(ev.clientY-d.y)/r.height)};
 e.onpointerup=e.onpointercancel=()=>{d=null};
 e.onkeydown=ev=>{const m={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[ev.key];if(ev.key==='Enter'){ev.preventDefault();return cropApply()}if(!m)return;ev.preventDefault();const u=ev.shiftKey?.05:.005;cbMove({h:'m',b:[...S.cb]},m[0]*u,m[1]*u)}}
function cropApply(){if(S.tool==='fs')return;const b=S.cb,isFull=b[0]<.002&&b[1]<.002&&b[2]>.996&&b[3]>.996;S.p.cr=isFull?null:b.map(v=>+v.toFixed(5));S.p.ratio=0;S.cmode=false;commit();panel();refresh();toast(isFull?'No crop applied (full photo selected)':'Crop applied. Use Download to save it.')}
const boxRot=(b,v)=>v>0?[1-(b[1]+b[3]),b[0],b[3],b[2]]:[b[1],1-(b[0]+b[2]),b[3],b[2]];
const boxFlip=b=>[1-(b[0]+b[2]),b[1],b[2],b[3]];

/* ---------- collage ---------- */
const gr=(c,r)=>{const o=[];for(let j=0;j<r;j++)for(let i=0;i<c;i++)o.push([i/c,j/r,1/c,1/r]);return o};
const rows9=[];[[0,.4],[.4,.3],[.7,.3]].forEach(([y,h])=>[0,1,2].forEach(i=>rows9.push([i/3,y,1/3,h])));
const LAY={2:[gr(2,1),gr(1,2),[[0,0,.62,1],[.62,0,.38,1]]],
 3:[[[0,0,.6,1],[.6,0,.4,.5],[.6,.5,.4,.5]],gr(3,1),[[0,0,1,.6],[0,.6,.5,.4],[.5,.6,.5,.4]],gr(1,3)],
 4:[gr(2,2),[[0,0,1,.58],[0,.58,1/3,.42],[1/3,.58,1/3,.42],[2/3,.58,1/3,.42]],[[0,0,.62,1],[.62,0,.38,1/3],[.62,1/3,.38,1/3],[.62,2/3,.38,1/3]],gr(4,1)],
 6:[gr(3,2),gr(2,3),[[0,0,2/3,2/3],[2/3,0,1/3,1/3],[2/3,1/3,1/3,1/3],[0,2/3,1/3,1/3],[1/3,2/3,1/3,1/3],[2/3,2/3,1/3,1/3]]],
 9:[gr(3,3),rows9]};
const CRAT=[[1,'1:1'],[4/5,'4:5'],[4/3,'4:3'],[3/4,'3:4'],[16/9,'16:9'],[9/16,'9:16']];
const FPOS=[[.32,.34,-6],[.68,.36,5],[.34,.7,4],[.68,.68,-5],[.5,.5,2],[.2,.5,-3],[.8,.5,3],[.5,.2,-2],[.5,.8,1]];
function colInit(){if(S.col)return;const c=S.col={n:4,li:0,gap:12,rad:14,bg:'#ffffff',ratio:1,free:false,sel:0,target:null,cells:Array.from({length:9},()=>({c:null,z:1,ox:0,oy:0}))};
 const g=geom(S.p,S.src);c.cells[0].c=render(S.src,S.p,Math.min(1,1600/Math.max(g.cw,g.ch)))}
function colRects(W,H){const C=S.col,sc=W/1000,gp=C.gap*sc,L=LAY[C.n][C.li]||LAY[C.n][0];
 return L.map(r=>{const ax=gp/2+r[0]*(W-gp),ay=gp/2+r[1]*(H-gp),aw=r[2]*(W-gp),ah=r[3]*(H-gp);return[ax+gp/2,ay+gp/2,Math.max(2,aw-gp),Math.max(2,ah-gp)]})}
function colDraw(Lg,prev){const C=S.col,r=C.ratio,W=Math.round(r>=1?Lg:Lg*r),H=Math.round(r>=1?Lg/r:Lg),cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d'),sc=W/1000;x.imageSmoothingQuality='high';x.fillStyle=C.bg;x.fillRect(0,0,W,H);
 if(C.free){let k=0;C.cells.forEach((c,i)=>{if(c.c&&c.fw==null){const p=FPOS[k%9];c.fx=p[0];c.fy=p[1];c.fr=p[2];c.fw=.5}if(c.c)k++});
  C.cells.forEach((c,i)=>{if(!c.c)return;const w=c.fw*W,h=w*c.c.height/c.c.width,b=Math.max(0,C.gap*sc*.5);x.save();x.translate(c.fx*W,c.fy*H);x.rotate(c.fr*Math.PI/180);x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=18*sc;x.shadowOffsetY=6*sc;x.fillStyle='#fff';x.fillRect(-w/2-b,-h/2-b,w+2*b,h+2*b);x.shadowColor='transparent';x.drawImage(c.c,-w/2,-h/2,w,h);if(prev&&i===C.sel){x.lineWidth=4*sc;x.strokeStyle='#2563eb';x.strokeRect(-w/2-b,-h/2-b,w+2*b,h+2*b)}x.restore()});
  if(prev&&!C.cells.some(c=>c.c)){x.fillStyle='#8896b3';x.font=`${30*sc}px system-ui`;x.textAlign='center';x.fillText('Add photos',W/2,H/2)}}
 else colRects(W,H).forEach((q,i)=>{const c=C.cells[i],rad=C.rad*sc;x.save();rr(x,q[0],q[1],q[2],q[3],rad);
  if(c.c){x.clip();const sc2=Math.max(q[2]/c.c.width,q[3]/c.c.height)*c.z,dw=c.c.width*sc2,dh=c.c.height*sc2;x.drawImage(c.c,q[0]+(q[2]-dw)/2+c.ox*(dw-q[2])/2,q[1]+(q[3]-dh)/2+c.oy*(dh-q[3])/2,dw,dh)}
  else if(prev){x.fillStyle='rgba(120,135,170,.16)';x.fill();x.setLineDash([12*sc,9*sc]);x.lineWidth=3*sc;x.strokeStyle='rgba(90,105,140,.75)';x.stroke();x.setLineDash([]);x.fillStyle='rgba(90,105,140,.9)';x.font=`${Math.min(q[2],q[3])*.3}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText('+',q[0]+q[2]/2,q[1]+q[3]/2)}
  else{x.fillStyle=C.bg;x.fill()}
  x.restore();if(prev&&i===C.sel){x.save();rr(x,q[0],q[1],q[2],q[3],rad);x.lineWidth=5*sc;x.strokeStyle='#2563eb';x.stroke();x.restore()}});
 return cv}
let cin=null;
async function colFiles(files){const C=S.col;let n=0;for(const f of files){if(!/^image\/(jpe?g|png|webp)$/.test(f.type)){toast('Only JPG, PNG or WEBP photos can be added');continue}
  let c;try{const bm=await createImageBitmap(f),k=Math.min(1,1800/Math.max(bm.width,bm.height));c=document.createElement('canvas');c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);c.getContext('2d').drawImage(bm,0,0,c.width,c.height);bm.close&&bm.close()}catch(e){toast('A photo could not be opened');continue}
  let i=C.target!=null?C.target:C.cells.findIndex((q,j)=>!q.c&&(C.free||j<C.n));C.target=null;if(i<0){toast('All boxes are full. Choose more photos or another layout.');break}
  Object.assign(C.cells[i],{c,z:1,ox:0,oy:0,fw:null});C.sel=i;n++}
 if(n){panel();refresh()}}
function colPick(i){const C=S.col;C.target=i;if(!cin){cin=document.createElement('input');cin.type='file';cin.accept='image/jpeg,image/png,image/webp';cin.multiple=true;cin.hidden=true;document.body.appendChild(cin);cin.onchange=e=>{const fs=[...e.target.files];e.target.value='';colFiles(fs)}}cin.click()}
function bindCol(){const e=st.c;let d=null;
 const pt=ev=>{const r=e.getBoundingClientRect();return[(ev.clientX-r.left)*e.width/r.width,(ev.clientY-r.top)*e.height/r.height]};
 e.onpointerdown=ev=>{if(S.tool==='tp')return tpDown(ev,e);if(S.tool!=='co'||!S.col)return;const C=S.col,[px,py]=pt(ev),W=e.width,H=e.height;let hit=-1;
  if(C.free){for(let i=C.cells.length-1;i>=0;i--){const c=C.cells[i];if(!c.c||c.fw==null)continue;const a=-c.fr*Math.PI/180,dx=px-c.fx*W,dy=py-c.fy*H,lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a),w=c.fw*W,h=w*c.c.height/c.c.width;if(Math.abs(lx)<=w/2&&Math.abs(ly)<=h/2){hit=i;break}}}
  else colRects(W,H).forEach((q,i)=>{if(px>=q[0]&&px<=q[0]+q[2]&&py>=q[1]&&py<=q[1]+q[3])hit=i});
  if(hit<0)return;ev.preventDefault();e.setPointerCapture(ev.pointerId);const c=C.cells[hit],q=C.free?null:colRects(W,H)[hit];C.sel=hit;
  let hx=0,hy=0;if(c.c&&q){const s2=Math.max(q[2]/c.c.width,q[3]/c.c.height)*c.z;hx=(c.c.width*s2-q[2])/2;hy=(c.c.height*s2-q[3])/2}
  d={i:hit,x:ev.clientX,y:ev.clientY,ox:c.ox,oy:c.oy,fx:c.fx,fy:c.fy,hx,hy,moved:false};panel();refresh()};
 e.onpointermove=ev=>{if(S.tool==='tp')return tpMove(ev,e);if(!d)return;const C=S.col,c=C.cells[d.i],r=e.getBoundingClientRect(),k=e.width/r.width,dx=(ev.clientX-d.x)*k,dy=(ev.clientY-d.y)*k;if(Math.abs(dx)+Math.abs(dy)>4)d.moved=true;if(!c.c)return;
  if(C.free){c.fx=cl(d.fx+dx/e.width,0,1);c.fy=cl(d.fy+dy/e.height,0,1)}else{if(d.hx>0)c.ox=cl(d.ox+dx/d.hx,-1,1);if(d.hy>0)c.oy=cl(d.oy+dy/d.hy,-1,1)}refresh()};
 e.onpointerup=e.onpointercancel=()=>{if(S.tool==='tp')return tpUp();if(d&&!d.moved&&S.col&&!S.col.cells[d.i].c)colPick(d.i);d=null}}
async function colApply(){const C=S.col;if(!C.cells.some(c=>c.c))return toast('Add at least one photo first');let out;
 const ok=await busy(()=>{out=colDraw(2400,false)},900);if(!ok)return;S.src=S.ref=out;S.p={...P0};S.col=null;bk='';commit();tool('ai');toast('Collage applied. Download it or keep editing.')}

/* ---------- Face Swap (no AI): oval mask, OKLab skin-tone transfer, seamless-clone light match, soften + grain ---------- */
function fb(a,W,H,r){const t=new Float32Array(a.length),o=new Float32Array(a.length),n=2*r+1;
 for(let y=0;y<H;y++){const b=y*W;let q=0;for(let i=-r;i<=r;i++)q+=a[b+Math.min(W-1,Math.max(0,i))];for(let x=0;x<W;x++){t[b+x]=q/n;q+=a[b+Math.min(W-1,x+r+1)]-a[b+Math.max(0,x-r)]}}
 for(let x=0;x<W;x++){let q=0;for(let i=-r;i<=r;i++)q+=t[Math.min(H-1,Math.max(0,i))*W+x];for(let y=0;y<H;y++){o[y*W+x]=q/n;q+=t[Math.min(H-1,y+r+1)*W+x]-t[Math.max(0,y-r)*W+x]}}
 return o}
const lin=v=>(v/=255)<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4),gam=v=>255*(v<=.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055);
function toLab(r,g,b){r=lin(r);g=lin(g);b=lin(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s]}
function fromLab(L,a,b){const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
 return[gam(4.0767416621*l-3.3077115913*m+.2309699292*s),gam(-1.2684380046*l+2.6097574011*m-.3413193965*s),gam(-.0041960863*l-.7034186147*m+1.707614701*s)]}
function fswap(T,F){const W=T.width,H=T.height,[tx,ty,tw,th]=F.t,cx=(tx+tw/2)*W,cy=(ty+th/2)*H,rx=tw*W/2,ry=th*H/2,Q=F.src,[qx,qy,qw,qh]=F.s,fe=Math.max(.05,F.fe/100),
 x0=Math.max(0,Math.floor(cx-rx*1.2)),y0=Math.max(0,Math.floor(cy-ry*1.2)),w=Math.min(W,Math.ceil(cx+rx*1.2))-x0,h=Math.min(H,Math.ceil(cy+ry*1.2))-y0;
 if(w<4||h<4)return T;
 /* 1. warp the source face onto the target oval (move, size, width, height, rotate) */
 const wc=document.createElement('canvas');wc.width=w;wc.height=h;const wx=wc.getContext('2d',{willReadFrequently:true});wx.imageSmoothingQuality='high';
 wx.translate(cx-x0+F.ox/50*rx,cy-y0+F.oy/50*ry);wx.rotate(F.rot*Math.PI/180);wx.scale(rx/(qw*Q.width/2)*F.sc/100*F.wd/100,ry/(qh*Q.height/2)*F.sc/100*F.ht/100);wx.drawImage(Q,-(qx+qw/2)*Q.width,-(qy+qh/2)*Q.height);
 const sd=wx.getImageData(0,0,w,h).data,im=T.getContext('2d').getImageData(x0,y0,w,h),td=im.data,n=w*h;
 if(F.so){const b=blur(sd,w,h,Math.max(1,Math.round(rx/50))),m=F.so/100*.85;for(let i=0;i<sd.length;i+=4)for(let k=0;k<3;k++)sd[i+k]+=(b[i+k]-sd[i+k])*m}
 /* 2. face-shaped mask (narrower forehead, softer jaw), hairline fade, and skin-only sample weights */
 const hl=F.hl/100,A=new Float32Array(n),WS=new Float32Array(n),WT=new Float32Array(n),sm=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t)};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,u=(x+x0-cx)/rx,v=(y+y0-cy)/ry,f=v<0?1-.16*(-v):1-.1*v*v,r=Math.hypot(u/f,v),al=sd[i*4+3]/255;
  A[i]=sm((1-r)/fe)*sm((v+1)/(.15+.5*hl))*al;WS[i]=al>.98&&r<1.1?1:0;WT[i]=r<.92&&v>-.55&&v<.8?1:0}
 /* 3. OKLab planes of source face and target face */
 const Ls=new Float32Array(n),As=new Float32Array(n),Bs=new Float32Array(n),Lt=new Float32Array(n),At=new Float32Array(n),Bt=new Float32Array(n);
 for(let i=0;i<n;i++){if(!(A[i]>0||WS[i]||WT[i]))continue;let o=toLab(sd[i*4],sd[i*4+1],sd[i*4+2]);Ls[i]=o[0];As[i]=o[1];Bs[i]=o[2];o=toLab(td[i*4],td[i*4+1],td[i*4+2]);Lt[i]=o[0];At[i]=o[1];Bt[i]=o[2]}
 /* 4. frequency separation: low frequency (light, shade, skin tone) comes from the target, detail (eyes, nose, mouth) from the source */
 const rl=Math.max(2,Math.round(Math.min(rx,ry)*.22)),low=(P,Wt)=>{const num=fb(fb(P.map((v,i)=>v*Wt[i]),w,h,rl),w,h,rl),den=fb(fb(Wt,w,h,rl),w,h,rl);return num.map((v,i)=>den[i]>.02?v/den[i]:NaN)};
 const fill=a=>{let q=0,c=0;a.forEach(v=>{if(v===v){q+=v;c++}});q=c?q/c:0;return a.map(v=>v===v?v:q)};
 const lLs=fill(low(Ls,WS)),lAs=fill(low(As,WS)),lBs=fill(low(Bs,WS)),lLt=fill(low(Lt,WT)),lAt=fill(low(At,WT)),lBt=fill(low(Bt,WT)),lm=F.lm/100,cm=F.cm/100,gr=F.gr/100*9;
 for(let i=0;i<n;i++){const a=A[i];if(a<=0)continue;
  const ra=Math.min(1.6,Math.max(.6,lLt[i]/Math.max(.05,lLs[i]))),L=Ls[i]*(1+(ra-1)*lm),aa=As[i]+(lAt[i]-lAs[i])*cm,bb=Bs[i]+(lBt[i]-lBs[i])*cm,o=fromLab(L,aa,bb),q=Math.sin(i*12.9898)*43758.5453,nz=(q-Math.floor(q)-.5)*gr;
  for(let k=0;k<3;k++)td[i*4+k]+=(o[k]+nz-td[i*4+k])*a}
 const out=document.createElement('canvas');out.width=W;out.height=H;const ox=out.getContext('2d');ox.drawImage(T,0,0);ox.putImageData(im,x0,y0);return out}
function fsInit(){if(!S.fs)S.fs={step:0,src:null,t:[.3,.2,.4,.5],s:[.3,.2,.4,.5],fe:40,cm:90,lm:85,so:30,gr:20,sc:100,wd:100,ht:100,hl:50,rot:0,ox:0,oy:0}}
function fsView(){const F=S.fs;if(F.step===1&&F.src)return F.src;
 const g=geom(S.p,S.src),k=Math.min(1,720/Math.max(g.cw,g.ch)),key=S.at+'|'+k+'|'+S.src.width;if(F.tk!==key){F.tk=key;F.tc=render(S.src,S.p,k)}
 return F.step===2&&F.src?fswap(F.tc,F):F.tc}
function fsStep(n){const F=S.fs;if(n>0&&!F.src)return toast('Choose a source photo first');if(F.step<2)F[F.step?'s':'t']=[...S.cb];F.step=n;if(n<2)S.cb=[...F[n?'s':'t']];panel();refresh()}
let fin=null;
function fsPick(){if(!fin){fin=document.createElement('input');fin.type='file';fin.accept='image/jpeg,image/png,image/webp';fin.hidden=true;document.body.appendChild(fin);
 fin.onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!S.fs)return;if(!/^image\/(jpe?g|png|webp)$/.test(f.type))return toast('Choose a JPG, PNG or WEBP photo');
  try{const bm=await createImageBitmap(f),k=Math.min(1,2400/Math.max(bm.width,bm.height)),c=document.createElement('canvas');c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);c.getContext('2d').drawImage(bm,0,0,c.width,c.height);bm.close&&bm.close();
   const F=S.fs;if(F.step===0)F.t=[...S.cb];F.src=c;F.s=[.3,.2,.4,.5];F.step=1;S.cb=[...F.s];panel();refresh();toast('Now place the oval on the face you want to use')}catch(x){toast('That photo could not be opened')}}}fin.click()}
async function fsApply(){const F=S.fs;if(!F.src)return toast('Choose a source photo first');if(F.step<2)fsStep(2);let out,pre;
 const ok=await busy(()=>{const g=geom(S.p,S.src),k=Math.min(1,2400/Math.max(g.cw,g.ch));pre=render(S.src,S.p,k);out=fswap(pre,F)},1200);if(!ok)return;
 S.src=out;S.ref=pre;S.p={...P0};S.fs=null;bk='';commit();tool('ai');toast('Face swap applied. Use Compare to see the change, or keep editing.')}

/* ---------- Restore & diversify (old photos). Spots and scratches are cleaned locally by restore.js; colorize needs a provider ---------- */
const RST=[['rest','Restore Old Photo','Cleans specks, fade and sepia cast in one step',1],['spot','Remove Spots & Scratches','Dust, specks and small stains',1],['fade','Fix Faded Photo','Brings back contrast and depth, keeps color',1],['bw','Neutral Black & White','Removes the sepia or yellow cast',1],['stu','Studio Portrait Clean','Bright, sharp, clean portrait look',1],['colz','AI Colorize','Adds color to black & white photos',0]];
const RSP={rest:{au:1,ct:14,sa:-100,cv:30,sh:32,dn:16},fade:{au:1,ct:18,cv:24},bw:{au:1,ct:8,sa:-100},stu:{au:1,ct:12,ex:4,sa:8,cv:22,sh:32,dn:24,vb:12}};
const rsH=()=>`<h3>Restore &amp; Diversify</h3><small class="mu">For old, faded, stained or scratched prints. Specks are cleaned on your device. Large stains and missing areas need an AI provider.</small>`+RST.map(([id,n,d])=>`<button class="pe-row" data-a="rs" data-v="${id}"><b>${n}</b><small>${d}</small><i class="tag">${id==='colz'?(prov().colorize?'AI provider':'Needs AI provider'):id==='rest'&&prov().enhance?'AI + local':'Local'}</i></button>`).join('');
function despk(){const g=S.src,c=document.createElement('canvas');c.width=g.width;c.height=g.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(g,0,0);const im=x.getImageData(0,0,c.width,c.height);window.PE_RESTORE.despeckle(im,lvl());x.putImageData(im,0,0);c.__a=g.__a;S.src=c;bk=''}
function restore(id){
 if(id==='colz'){if(!prov().colorize)return toast('AI Colorize needs an AI provider. Nothing was changed.');return aiRun('colorize',{},null)}
 const fin=()=>{if(id==='rest'||id==='spot')despk();if(RSP[id]){setP(RSP[id],S.str);if(id==='rest'||id==='bw')S.p.sa=-100}};
 if(id==='rest'&&prov().enhance)return aiRun('enhance',{mode:'restore',level:lvl()},fin);
 run(fin)}

/* ---------- Use Template: white, black or blank PNG canvas, with your photo on it ---------- */
const TPB=[['#ffffff','White'],['#000000','Black'],['none','Blank PNG']],TPC=[['#1e90ff','Blue'],['#d62828','Red'],['#e5e7eb','Grey']],
 TPS=[['4:6','ID photo 4 × 6 cm',4,6],['3:4','ID photo 3 × 4 cm',3,4],['35:45','Passport 35 × 45 mm',35,45],['1:1','Square 1:1',1,1],['4:5','Portrait 4:5',4,5],['16:9','Landscape 16:9',16,9],['9:16','Story 9:16',9,16],['same','Same as photo',0,0]];
const tpSw=c=>c==='none'?'background:repeating-conic-gradient(#cbd5e1 0 25%,#fff 0 50%) 50%/14px 14px':'background:'+c;
const tpR=T=>{const q=TPS.find(x=>x[0]===T.sz)||TPS[0];return q[2]?q[2]/q[3]:T.ph?T.ph.width/T.ph.height:3/4};
function tpInit(){if(S.tp)return;const T=S.tp={bg:S.tpbg||'#ffffff',sz:S.blank?'4:6':'same',ph:null,fit:'fit',sc:100,ox:0,oy:0,rot:0};S.tpbg=null;
 if(!S.blank){const g=geom(S.p,S.src);T.ph=render(S.src,S.p,Math.min(1,2400/Math.max(g.cw,g.ch)));T.ph.__a=S.src.__a}}
function tpDraw(L,prev){const T=S.tp,r=tpR(T),W=Math.round(r>=1?L:L*r),H=Math.round(r>=1?L/r:L),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.imageSmoothingQuality='high';
 if(T.bg!=='none'){x.fillStyle=T.bg;x.fillRect(0,0,W,H)}else c.__a=1;
 if(T.ph){const p=T.ph,b=(T.fit==='fill'?Math.max:Math.min)(W/p.width,H/p.height)*T.sc/100;x.save();x.translate(W/2+T.ox/100*W,H/2+T.oy/100*H);x.rotate(T.rot*Math.PI/180);x.drawImage(p,-p.width*b/2,-p.height*b/2,p.width*b,p.height*b);x.restore()}
 else if(prev){x.fillStyle=T.bg==='#000000'?'#ffffffaa':'#64748b';x.textAlign='center';x.textBaseline='middle';x.font=`600 ${W*.045}px system-ui`;x.fillText('Upload a photo, or apply this empty template',W/2,H/2,W*.9)}
 return c}
let tpd=null,tin=null;
const syncTp=()=>['ox','oy'].forEach(k=>{const i=$('#pe-set [data-t="'+k+'"]');if(i){i.value=S.tp[k];const o=i.parentNode.querySelector('output');o&&(o.value=Math.round(S.tp[k]))}});
const tpDown=(ev,e)=>{if(!S.tp||!S.tp.ph)return;ev.preventDefault();e.setPointerCapture(ev.pointerId);tpd={x:ev.clientX,y:ev.clientY,ox:S.tp.ox,oy:S.tp.oy}};
const tpMove=(ev,e)=>{if(!tpd||!S.tp)return;const r=e.getBoundingClientRect();S.tp.ox=cl(tpd.ox+(ev.clientX-tpd.x)/r.width*100,-100,100);S.tp.oy=cl(tpd.oy+(ev.clientY-tpd.y)/r.height*100,-100,100);syncTp();refresh()};
const tpUp=()=>{tpd=null};
function tpPick(){if(!tin){tin=document.createElement('input');tin.type='file';tin.accept='image/jpeg,image/png,image/webp';tin.hidden=true;document.body.appendChild(tin);
 tin.onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!S.tp)return;if(!/^image\/(jpe?g|png|webp)$/.test(f.type))return toast('Choose a JPG, PNG or WEBP photo');
  try{const bm=await createImageBitmap(f),k=Math.min(1,2400/Math.max(bm.width,bm.height)),c=document.createElement('canvas');c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);c.getContext('2d').drawImage(bm,0,0,c.width,c.height);bm.close&&bm.close();
   Object.assign(S.tp,{ph:c,sc:100,ox:0,oy:0,rot:0});panel();refresh();toast('Photo added. Drag it to position it.')}catch(x){toast('That photo could not be opened')}}}tin.click()}
function tpRemove(){const T=S.tp;if(!T.ph)return toast('Add a photo first');if(!prov().removeBackground)return toast('Remove Background needs an AI provider. Nothing was changed.');
 busy(async()=>{const o=await prov().removeBackground(T.ph,{});if(!o)throw 0;o.__a=1;T.ph=o}).then(ok=>{if(ok){panel();refresh();toast('Background removed. The subject now sits on your template.')}})}
async function tpApply(){let out;const ok=await busy(()=>{out=tpDraw(2400,false)},900);if(!ok)return;S.src=S.ref=out;S.p={...P0};S.tp=null;S.blank=false;bk='';if(out.__a)S.ex.f='png';commit();tool('ai');toast(out.__a?'Template applied with a transparent background. It exports as PNG.':'Template applied. Download it or keep editing.')}
function startTemplate(bg){const c=document.createElement('canvas');c.width=1600;c.height=2400;if(bg!=='none'){const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,c.width,c.height)}else c.__a=1;S.pending='tp';S.tpbg=bg;start(c,'template',true)}

/* ---------- open / errors ---------- */
const err=m=>{const e=$('#pe-err');e.textContent=m;e.hidden=false};
async function open(file){$('#pe-err').hidden=true;if(!/^image\/(jpe?g|png|webp)$/.test(file.type))return err('This file type is not supported. Choose a JPG, PNG or WEBP photo.');
 try{const bm=await createImageBitmap(file),c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);bm.close&&bm.close();start(c,file.name)}
 catch(e){err('This photo could not be opened. It may be damaged or too large for this browser.');toast('Photo could not be opened')}}
function start(c,name,blank){S.img=S.src=S.ref=c;S.blank=!!blank;S.tp=null;S.name=name.replace(/\.[^.]+$/,'')||'photo';S.p={...P0};S.m=analyze(c);S.doc=diagnose(S.m);S.hist=[snap()];S.at=0;S.z=1;bk='';S.col=null;S.fs=null;S.cmode=false;S.cl=0;
 location.hash!=='#photo-editor'&&(location.hash='#photo-editor');$('#pe-home').hidden=true;$('#pe-ed').hidden=false;
 st=mkStage($('#pe-stage'));st.mode(S.mode);bindCrop();bindCol();tool(S.pending||'ai');S.pending=null;sync();
 busy(()=>{refresh()},1300).then(()=>toast(blank?'Template ready. Upload a photo, or apply it as an empty template.':'Photo ready. AI Photo Doctor found '+S.doc.rc.length+' suggested fixes.'))}
const pick=t=>{if(t==='tp'&&!S.img)return tplOpen();S.pending=t||null;if(S.img&&t){S.pending=null;$('#pe-home').hidden=true;$('#pe-ed').hidden=false;tool(t)}else $('#pe-in').click()};

/* ---------- export ---------- */
async function exportImg(){await fontReady(S.p.tf,S.p.tx);const E=S.ex,so=SOC[E.soc],p={...S.p};if(so)p.ratio=so[0]/so[1];const g=geom(p,S.src);let k=so?so[0]/g.cw:+E.res?(+E.res)/Math.max(g.cw,g.ch):S.p.up;k=Math.min(k,16384/Math.max(g.cw,g.ch));
 const ps=Math.min(k,Math.sqrt(24e6/(g.cw*g.ch)));let out;
 const ok=await busy(()=>{out=render(S.src,p,ps);if(k>ps+1e-6){const c=document.createElement('canvas');c.width=Math.round(g.cw*k);c.height=Math.round(g.ch*k);const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(out,0,0,c.width,c.height);out=c}if(E.f==='jpeg'){const c=document.createElement('canvas');c.width=out.width;c.height=out.height;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(out,0,0);out=c}},900);
 if(ok)out.toBlob(b=>{if(!b)return toast('Export failed. This size is too large for your browser. Choose a lower resolution.');saveFile(b,`${S.name}-edited.${E.f==='jpeg'?'jpg':E.f}`);toast(`Exported ${out.width}×${out.height}`)},'image/'+E.f,+E.q)}

/* ---------- events ---------- */
const set=$('#pe-set');
set.oninput=e=>{if(e.target.dataset.r){S.rp=e.target.value;return}
 const fk=e.target.dataset.f;if(fk&&S.fs){S.fs[fk]=+e.target.value;const o=e.target.parentNode.querySelector('output');o&&(o.value=e.target.value);return refresh()}
 const ck=e.target.dataset.c;if(ck&&S.col){const C=S.col,sel=C.cells[C.sel],v=e.target.type==='range'?+e.target.value:e.target.value;if(ck==='z'&&sel)sel.z=v/100;else if(ck==='fw'&&sel)sel.fw=v/100;else if(ck==='fr'&&sel)sel.fr=v;else C[ck]=v;const o=e.target.parentNode.querySelector('output');o&&(o.value=v);return refresh()}
 const tk=e.target.dataset.t;if(tk&&S.tp){const v=e.target.type==='range'?+e.target.value:e.target.value;if(tk==='cc'){S.tp.bg=v;set.querySelectorAll('[data-a=tbg]').forEach(x=>x.setAttribute('aria-pressed',false))}else S.tp[tk]=v;const o=e.target.parentNode.querySelector('output');o&&(o.value=v);return refresh()}
 const k=e.target.dataset.k;if(!k)return;const v=e.target.type==='range'?+e.target.value:e.target.value;S.p[k]=v;const o=e.target.parentNode.querySelector('output');o&&(o.value=v);refresh()};
set.onchange=e=>{if(e.target.dataset.k)commit();else if(e.target.dataset.e)S.ex[e.target.dataset.e]=e.target.value};
set.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,v=b.dataset.v;
 if(a==='str'){S.str=+v;panel()}
 else if(a==='pro'){prov().enhance?aiRun('enhance',{mode:'pro',level:lvl()},FIN.auto):run(()=>setP(pro(S.m),S.str))}
 else if(a==='docall')run(()=>setP(Object.assign({au:S.doc.rc.length?1:0},...S.doc.rc.map(r=>r[1]))));
 else if(a==='ai'){const f=AIF[v],M={auto:'pro',focus:'restore',dn:'restore',hdr:'improve',col:'improve',lit:'light',face:'restore'}[v];if(prov().enhance&&M)return aiRun('enhance',{mode:M,level:lvl()},FIN[v]);f?run(()=>addP(f(S.m))):toast(prov().faceEnhance?'Use the Portrait tab to run face enhancement.':'AI Face Enhancement needs an AI provider. Nothing was changed.')}
 else if(a==='col')run(()=>addP(AIF.col(S.m),1));
 else if(a==='up'){S.p.up=+v;commit();panel()}
 else if(a==='ratio'){S.p.ratio=+v;commit();panel();refresh()}
 else if(a==='rot'){const q=+v;S.p.rot=(S.p.rot+q+360)%360;if(S.p.cr)S.p.cr=boxRot(S.p.cr,q);if(S.cmode){S.cb=boxRot(S.cb,q);if(S.cl>0)S.cl=1/S.cl}commit();panel();refresh()}
 else if(a==='flip'){S.p.rot=(360-S.p.rot)%360;S.p.fx=!S.p.fx;if(S.p.cr)S.p.cr=boxFlip(S.p.cr);if(S.cmode)S.cb=boxFlip(S.cb);commit();refresh()}
 else if(a==='crl'){cbRatio(+v);set.querySelectorAll('[data-a=crl]').forEach(x=>x.setAttribute('aria-pressed',+x.dataset.v===+v))}
 else if(a==='crapply')cropApply()
 else if(a==='crcancel'){S.cmode=false;panel();refresh()}
 else if(a==='credit'){S.cmode=true;S.cb=S.p.cr?[...S.p.cr]:[0,0,1,1];panel();refresh()}
 else if(a==='crreset'){S.p.cr=null;S.p.ratio=0;S.cb=[0,0,1,1];S.cl=0;commit();panel();refresh()}
 else if(a==='font'||a==='tst'){if(a==='font')S.p.tf=v;else S.p.tst=+v;if(!S.p.tx){S.p.tx='សួស្តី Hello';const t=set.querySelector('textarea');t&&(t.value=S.p.tx)}
  set.querySelectorAll(`[data-a=${a}]`).forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===v));commit();refresh();if(a==='font')fontReady(v,S.p.tx).then(()=>{refresh();thumbs()})}
 else if(a==='tcx'){S.p.tc='';commit();panel();refresh()}
 else if(a==='cn'){const C=S.col;if(v==='free')C.free=true;else{C.free=false;C.n=+v;C.li=0}if(!C.cells[C.sel])C.sel=0;panel();refresh()}
 else if(a==='cl'){S.col.li=+v;panel();refresh()}
 else if(a==='cratio'){S.col.ratio=+v;panel();refresh()}
 else if(a==='cadd')colPick(null)
 else if(a==='crep')colPick(S.col.sel)
 else if(a==='cdel'){Object.assign(S.col.cells[S.col.sel],{c:null,z:1,ox:0,oy:0,fw:null});panel();refresh()}
 else if(a==='creset'){S.col=null;colInit();panel();refresh()}
 else if(a==='capply')colApply()
 else if(a==='fst')fsStep(+v)
 else if(a==='fsup')fsPick()
 else if(a==='fsapply')fsApply()
 else if(a==='fsreset'){S.fs=null;fsInit();S.cb=[...S.fs.t];panel();refresh()}
 else if(a==='fl'){S.p.fl=v;commit();panel();refresh()}
 else if(a==='rs')restore(v)
 else if(a==='tbg'){S.tp.bg=v;panel();refresh()}
 else if(a==='tfit'){S.tp.fit=v;panel();refresh()}
 else if(a==='tphoto')tpPick()
 else if(a==='tprm')tpRemove()
 else if(a==='tpapply')tpApply()
 else if(a==='tpreset'){S.tp=null;tpInit();panel();refresh()}
 else if(a==='dl')exportImg();
 else if(a==='prov')busy(async()=>{const o=await prov()[v](S.src,{...S.p,rp:S.rp});if(!o)throw 0;S.src=o;bk='';if(v==='removeBackground'){S.ex.f='png';o.__a=1}}).then(ok=>{if(ok){commit();refresh();toast('Done')}})};
$('#pe-un').onclick=()=>go(S.at-1);$('#pe-re').onclick=()=>go(S.at+1);
$('#pe-rs').onclick=()=>{S.p={...P0};S.src=S.ref=S.img;bk='';S.cb=[0,0,1,1];S.col=null;S.fs=null;S.tp=null;S.tool==='tp'&&tpInit();S.tool==='co'&&colInit();S.tool==='fs'&&(fsInit(),S.cb=[...S.fs.t]);commit();panel();refresh();toast('Restored the original photo')};
$('#pe-zo').onclick=()=>{S.z=Math.max(.5,S.z-.25);refresh()};$('#pe-zi').onclick=()=>{S.z=Math.min(3,S.z+.25);refresh()};
$('#pe-dl').onclick=()=>{if(S.tool==='fs'&&S.fs&&S.fs.src)return toast('Apply Face Swap first, then Download');if(S.tool==='co')return toast('Apply the collage first, then Download');if(S.tool==='tp'&&S.tp)return toast('Apply the template first, then Download');exportImg()};$('#pe-bk').onclick=()=>{$('#pe-ed').hidden=true;$('#pe-home').hidden=false};
$('#pe-modes').onclick=e=>{const m=e.target.dataset.m;if(!m)return;S.mode=m;st.mode(m);$('#pe-modes').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m))};
$('#pe-side').innerHTML=TOOLS.map(([t,i,n])=>`<button data-t="${t}"><span aria-hidden="true">${i}</span>${n}</button>`).join('');$('#pe-side').onclick=e=>{const b=e.target.closest('[data-t]');b&&tool(b.dataset.t)};
$('#pe-qt').innerHTML=[['cr','⛶','Crop'],['bg','▣','Remove BG'],['ob','⌫','Remove Watermark'],['tx','T','Add Text'],['co','▦','Collage'],['ai','✨','AI Enhance'],['tp','▭','Use Template'],['ai','⋯','More Tools']].map(([t,i,n])=>`<button data-t="${t}"><i aria-hidden="true">${i}</i>${n}</button>`).join('');$('#pe-qt').onclick=e=>{const b=e.target.closest('[data-t]');b&&pick(b.dataset.t)};
$('#pe-fg').innerHTML=[['✨','AI Enhance','Better exposure, color and clarity in one click','ai'],['▣','Remove Background','Needs an AI provider','bg'],['☺','Portrait','Natural face and skin tools (needs AI provider)','pt'],['◎','AI Focus','Sharpen soft photos','ai'],['⤢','AI Upscale','2×, 4× or 8× larger exports','ai'],['◐','Color Correction','Exposure, contrast, white balance','cl'],['▦','Collage','Combine 2 to 9 photos in a layout','co'],['⟲','Restore Old Photo','Clean specks, fade and sepia on old prints','ai'],['▭','Use Template','White, black or blank PNG background','tp'],['⇄','Face Swap','Swap faces without AI, blended like a pro retouch','fs'],['T','Add Text','Khmer and English fonts, 20 styles','tx'],['❖','Filters','13 professional presets','fi']].map(([i,t,d,k])=>`<button class="card" data-t="${k}" style="text-align:left"><b style="font-size:22px">${i}</b><h3>${t}</h3><p>${d}</p></button>`).join('');$('#pe-fg').onclick=$('#pe-qt').onclick;
$('#pe-up').onclick=()=>pick();$('#pe-in').onchange=e=>{e.target.files[0]&&open(e.target.files[0]);e.target.value=''};
const R=$('#v-photo-editor');['dragover','dragenter'].forEach(v=>R.addEventListener(v,x=>{x.preventDefault();$('#pe-drop').classList.add('over')}));
['dragleave','drop'].forEach(v=>R.addEventListener(v,x=>{x.preventDefault();$('#pe-drop').classList.remove('over')}));R.addEventListener('drop',x=>{const f=x.dataTransfer.files[0];S.pending=null;f&&open(f)});

/* ---------- Use Template chooser (home page) ---------- */
const tm=document.createElement('div');tm.id='pe-tm';tm.className='pe-tm';tm.hidden=true;tm.setAttribute('role','dialog');tm.setAttribute('aria-modal','true');tm.setAttribute('aria-labelledby','pe-tmt');
tm.innerHTML=`<div class="pe-tmb"><button class="pe-x" data-x aria-label="Close">×</button><h2 id="pe-tmt">Use Template</h2><button class="pri pe-big pe-tu" data-u>⇪ Upload photo<small>Place your own photo on a white, black or blank background</small></button><p class="mu">Or start from a template</p><div class="pe-tpb">${TPB.map(([c,n])=>`<button data-b="${c}"><i style="${tpSw(c)}"></i>${n}</button>`).join('')}</div></div>`;R.appendChild(tm);
function tplOpen(){tm.hidden=false;tm.querySelector('[data-u]').focus()}const tplClose=()=>{tm.hidden=true};
tm.onclick=e=>{if(e.target===tm||e.target.closest('[data-x]'))return tplClose();if(e.target.closest('[data-u]')){tplClose();S.pending='tp';$('#pe-in').click();return}const b=e.target.closest('[data-b]');if(b){tplClose();startTemplate(b.dataset.b)}};
tm.onkeydown=e=>{if(e.key==='Escape')tplClose()};const ut=$('#pe-ut');ut&&(ut.onclick=tplOpen);

/* ---------- MediaForge integration + hero before/after on the sample photo ---------- */
const hp=document.getElementById('hpb');hp&&(hp.onclick=()=>{location.hash='#photo-editor';$('#pe-in').click()});
const fg=document.getElementById('fgrid');fg&&fg.insertAdjacentHTML('afterbegin','<a class="card" href="#photo-editor" style="display:block"><span class="tag">Working (on your device)</span><h3>Photo Editor</h3><p>Enhance, color, crop, text, filters and export. AI tools plug in later.</p></a>');
const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);const h=mkStage($('#pe-hc'));put(h.o,render(c,P0,1));put(h.c,render(c,{...P0,...pro(analyze(c))},1))};im.onerror=()=>{$('#pe-hc').hidden=true};im.src='photo-editor/sample.jpg';
})();
