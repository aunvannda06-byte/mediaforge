/* MediaForge Photo Editor. The original image is never modified; every edit is a parameter set (S.p) rendered from S.src.
   AI hook: define window.PE_PROVIDER = { removeBackground(canvas,params), removeObject, faceEnhance, upscale, ... } where each
   function returns a canvas. Without a provider, those tools show "Needs AI provider" and only local image processing runs. */
(()=>{
const $=s=>document.querySelector(s),cl=(v,a,b)=>Math.min(b,Math.max(a,v)),prov=()=>window.PE_PROVIDER||{};
const P0={ex:0,ct:0,sa:0,tp:0,sh:0,dn:0,au:0,fl:'None',rot:0,fx:false,ratio:0,up:1,tx:'',tc:'#ffffff',ts:60,ty:85};
const FL={None:{},Natural:{sa:8,ct:5},Professional:{ct:12,sa:6},Portrait:{ex:6,sa:-4,tp:6},Cinematic:{ct:22,sa:-12,tp:-14},Warm:{tp:28},Cool:{tp:-28},Vibrant:{sa:40,ct:8},Soft:{ct:-14,ex:6},Documentary:{ct:14,sa:-22},Wedding:{ex:12,ct:-8,sa:-8,tp:8},Night:{ex:-14,ct:14,tp:-18},HDR:{ct:26,sa:22},'Black & White':{sa:-100,ct:10}};
const SOC={Facebook:[1200,630],Instagram:[1080,1080],TikTok:[1080,1920],YouTube:[1280,720],LinkedIn:[1200,627]};
const S={src:null,img:null,name:'photo',p:{...P0},hist:[],at:0,mode:'cmp',tool:'ai',str:1,z:1,m:null,doc:null,pending:null,ex:{f:'jpeg',q:'.92',res:'0',soc:''}};
let st=null;

/* ---------- image engine ---------- */
function blur(s,W,H,r){const t=new Float32Array(s.length),o=new Uint8ClampedArray(s.length),n=2*r+1;
 for(let y=0;y<H;y++)for(let c=0;c<3;c++){let a=0;const b=y*W*4+c;for(let i=-r;i<=r;i++)a+=s[b+Math.min(W-1,Math.max(0,i))*4];for(let x=0;x<W;x++){t[b+x*4]=a/n;a+=s[b+Math.min(W-1,x+r+1)*4]-s[b+Math.max(0,x-r)*4]}}
 for(let x=0;x<W;x++)for(let c=0;c<3;c++){let a=0;const b=x*4+c;for(let i=-r;i<=r;i++)a+=t[b+Math.min(H-1,Math.max(0,i))*W*4];for(let y=0;y<H;y++){o[b+y*W*4]=a/n;a+=t[b+Math.min(H-1,y+r+1)*W*4]-t[b+Math.max(0,y-r)*W*4]}}
 return o}
function pix(c,p){const f=FL[p.fl]||{},ex=p.ex+(f.ex||0),ct=p.ct+(f.ct||0),sa=p.sa+(f.sa||0),tp=p.tp+(f.tp||0);
 if(!(p.au||ex||ct||sa||tp||p.sh||p.dn))return;
 const x=c.getContext('2d'),W=c.width,H=c.height,im=x.getImageData(0,0,W,H),d=im.data,n=W*H,r0=Math.max(1,Math.round(W/900));
 if(p.dn){const b=blur(d,W,H,r0+Math.round(p.dn/50)),m=Math.min(.8,p.dn/110);for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)d[i+k]+=(b[i+k]-d[i+k])*m}
 let lo=0,sc=1;
 if(p.au){const h=new Uint32Array(256);for(let i=0;i<d.length;i+=4)h[(.299*d[i]+.587*d[i+1]+.114*d[i+2])|0]++;let a=0,l=0,u=255;for(;l<255&&(a+=h[l])<n*.005;l++);a=0;for(;u>0&&(a+=h[u])<n*.005;u--);lo=Math.min(l,60);sc=255/(Math.max(u,195)-lo)}
 const eg=Math.max(0,1+ex/100),cg=Math.max(0,1+ct/100),sg=Math.max(0,1+sa/100),t=tp*.35;
 for(let i=0;i<d.length;i+=4){let r=(d[i]-lo)*sc*eg+t,g=(d[i+1]-lo)*sc*eg,b=(d[i+2]-lo)*sc*eg-t;r=(r-128)*cg+128;g=(g-128)*cg+128;b=(b-128)*cg+128;const y=.299*r+.587*g+.114*b;d[i]=y+(r-y)*sg;d[i+1]=y+(g-y)*sg;d[i+2]=y+(b-y)*sg}
 if(p.sh){const b=blur(d,W,H,r0),a=p.sh/100*1.6;for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)d[i+k]+=(d[i+k]-b[i+k])*a}
 x.putImageData(im,0,0)}
function geom(p,s){const r=p.rot%180,w=r?s.height:s.width,h=r?s.width:s.height;let cw=w,ch=h;if(p.ratio){if(w/h>p.ratio)cw=Math.round(h*p.ratio);else ch=Math.round(w/p.ratio)}return{cw,ch}}
function render(s,p,k){const{cw,ch}=geom(p,s),c=document.createElement('canvas');c.width=Math.max(1,Math.round(cw*k));c.height=Math.max(1,Math.round(ch*k));
 const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingQuality='high';x.translate(c.width/2,c.height/2);x.rotate(p.rot*Math.PI/180);x.scale(p.fx?-1:1,1);x.drawImage(s,-s.width*k/2,-s.height*k/2,s.width*k,s.height*k);x.setTransform(1,0,0,1,0,0);pix(c,p);
 if(p.tx){const fs=c.height*p.ts/600;x.font=`700 ${fs}px "Segoe UI",system-ui,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=fs/8;x.strokeStyle='#000a';x.fillStyle=p.tc;const y=c.height*p.ty/100;x.strokeText(p.tx,c.width/2,y);x.fillText(p.tx,c.width/2,y)}
 return c}
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
const pro=m=>({au:1,ct:8,ex:m.mean<100||m.mean>150?cl(Math.round((122-m.mean)*.5),-30,35):0,sa:m.sat<.3?16:7,tp:Math.abs(m.cast)>8?cl(Math.round(-m.cast*.7),-25,25):0,sh:m.sharp<120?45:28,dn:m.noise>2?35:10});
const setP=(d,s=1)=>{for(const k in d)S.p[k]=k==='au'?1:cl(d[k]*s,k==='sh'||k==='dn'?0:-100,100)};
const addP=(d,s=S.str)=>{for(const k in d)S.p[k]=k==='au'?1:cl(S.p[k]+d[k]*s,k==='sh'||k==='dn'?0:-100,100)};

/* ---------- stage (before/after slider) ---------- */
function mkStage(host){host.innerHTML='<div class="pe-sw"><canvas class="pe-c"></canvas><canvas class="pe-o"></canvas><i class="pe-h"></i><input type="range" class="pe-r" min="0" max="100" value="50" aria-label="Drag to compare before and after"><span class="pe-l pe-lb">Before</span><span class="pe-l pe-la">After</span></div>';
 const w=host.firstChild,[c,o,h,r,lb,la]=w.children,pos=()=>{o.style.clipPath=`inset(0 ${100-r.value}% 0 0)`;h.style.left=r.value+'%'};r.oninput=pos;
 const mode=m=>{const on=m==='cmp';o.hidden=m==='edit';h.hidden=r.hidden=lb.hidden=la.hidden=!on;if(on)pos();else o.style.clipPath='none'};mode('cmp');return{w,c,o,mode}}

/* ---------- editor state ---------- */
const snap=()=>({p:{...S.p},src:S.src});
function sync(){$('#pe-un').disabled=S.at<1;$('#pe-re').disabled=S.at>=S.hist.length-1}
function commit(){S.hist=S.hist.slice(0,S.at+1);S.hist.push(snap());S.at++;sync()}
function go(i){if(i<0||i>=S.hist.length)return;S.at=i;S.p={...S.hist[i].p};S.src=S.hist[i].src;panel();refresh();sync()}
let tk=0,bk='';
function refresh(){if(tk)return;tk=requestAnimationFrame(()=>{tk=0;if(!S.src)return;const g=geom(S.p,S.src),k=Math.min(1,1200/Math.max(g.cw,g.ch)),key=[S.p.rot,S.p.fx,S.p.ratio,S.src.width,S.src.height,S.hist[0]&&S.src===S.img].join();
 put(st.c,render(S.src,S.p,k));if(key!==bk){bk=key;put(st.o,render(S.src,{...P0,rot:S.p.rot,fx:S.p.fx,ratio:S.p.ratio},k))}
 st.w.style.width=`min(${S.z*100}%,${S.z*66*st.c.width/st.c.height}vh)`;$('#pe-zl').textContent=Math.round(S.z*100)+'%'})}
async function busy(fn,ms=1500){const b=$('#pe-busy'),m=$('#pe-bm'),M=['Analyzing your photo...','Improving details...','Enhancing colors...','Finalizing image...'];let i=0,ok=true;b.hidden=false;m.textContent=M[0];const t=setInterval(()=>m.textContent=M[++i%4],380),t0=Date.now();
 await new Promise(r=>setTimeout(r,50));try{await fn()}catch(e){ok=false}
 const rest=ms-(Date.now()-t0);if(rest>0)await new Promise(r=>setTimeout(r,rest));clearInterval(t);b.hidden=true;if(!ok)toast('Something went wrong. Try again or use a smaller photo.');return ok}
const run=fn=>busy(fn).then(ok=>{if(ok){commit();panel();refresh();toast('Done. Use Compare to see what changed.')}});

/* ---------- panels ---------- */
const sl=(k,l,a,b)=>`<label class="pe-sl">${l}<output>${S.p[k]}</output><input type="range" data-k="${k}" min="${a}" max="${b}" value="${S.p[k]}"></label>`;
const seg=(a,items,cur)=>`<div class="pe-seg">${items.map(([v,t])=>`<button data-a="${a}" data-v="${v}" aria-pressed="${v==cur}">${t}</button>`).join('')}</div>`;
const opts=(l,cur)=>l.map(([v,t])=>`<option value="${v}"${v==cur?' selected':''}>${t}</option>`).join('');
const AIT=[['auto','Auto Enhance','One-click improvement',1],['focus','AI Focus & Sharpen','Make it clearer and sharper',1],['dn','AI Denoise','Reduce noise',1],['hdr','AI HDR','Recover highlights and shadows',1],['col','AI Color Correction','Balance color and white point',1],['lit','AI Lighting','Brighten and balance light',1],['face','AI Face Enhancement','Clearer, natural faces',0]];
const AIF={auto:m=>pro(m),focus:()=>({sh:40}),dn:()=>({dn:40}),hdr:()=>({ct:18,sa:10,ex:6}),col:m=>({au:1,sa:10,tp:Math.abs(m.cast)>8?cl(Math.round(-m.cast*.7),-25,25):0}),lit:()=>({ex:12,ct:6})};
const PV={pt:['Portrait',['Face Enhance','Skin Retouch','Eye Enhance','Teeth Whitening','Face Lighting','Background Blur','Portrait Relighting','Remove Blemishes'],'faceEnhance'],bg:['Remove Background',['Transparent background','Replace background','Background blur','Background color','Subject separation'],'removeBackground'],ob:['Remove Object',['Magic Eraser','Remove Watermark / Unwanted Mark','Brush over an object'],'removeObject'],co:['Collage',['2 photos','3 photos','4 photos','6 photos','9 photos','Freeform'],null]};
const pvp=t=>{const[n,l,fn]=PV[t],ok=fn&&prov()[fn];return `<h3>${n}</h3><div class="pe-chips">${l.map(x=>`<span>${x}</span>`).join('')}</div>`+(ok?`<button class="pri" data-a="prov" data-v="${fn}">Run ${n}</button>`:`<p class="note">${fn?`AI provider not connected. These tools need a model or API. Set window.PE_PROVIDER.${fn} (see photo-editor/pe.js).`:'Collage is not built yet.'}</p>`)};
const docH=()=>{const d=S.doc;return `<div class="pe-doc"><b>✨ AI Photo Doctor</b><small class="mu">Measured on your device from the photo's pixels</small>${d.rows.map(([k,v])=>`<div class="pe-kv"><span>${k}</span><em>${v}</em></div>`).join('')}${d.rc.length?d.rc.map(r=>`<div class="pe-ck">✓ ${r[0]}</div>`).join(''):'<div class="pe-ck">✓ No basic fixes needed</div>'}<button class="pri" data-a="docall">Apply All Recommendations</button></div>`};
const PN={
 ai:()=>{const g=geom(S.p,S.src),u=S.p.up;return `<button class="pri pe-big" data-a="pro">✨ AI Professional Enhance</button><small class="mu">Fixes exposure, contrast, white balance, color, sharpness and noise in one step.</small>${seg('str',[[.5,'Low'],[1,'Medium'],[1.5,'Strong']],S.str)}${docH()}`+
  AIT.map(([id,n,d,loc])=>`<button class="pe-row" data-a="ai" data-v="${id}"><b>${n}</b><small>${d}</small><i class="tag">${loc?'Local':'Needs AI provider'}</i></button>`).join('')+
  `<b>AI Upscale</b>${seg('up',[[1,'Off'],[2,'2×'],[4,'4×'],[8,'8×']],u)}<small class="mu">${g.cw}×${g.ch} → ${g.cw*u}×${g.ch*u}. Standard resampling for now, not AI detail. Connect an upscale model for real results.</small>`},
 cl:()=>`<button class="pri" data-a="col">Auto Color Correction</button>${sl('ex','Exposure',-100,100)}${sl('ct','Contrast',-100,100)}${sl('sa','Saturation',-100,100)}${sl('tp','Temperature',-100,100)}${sl('sh','Sharpness',0,100)}${sl('dn','Denoise',0,100)}`,
 cr:()=>`<b>Aspect ratio</b>${seg('ratio',[[0,'Original'],[1,'1:1'],[4/3,'4:3'],[16/9,'16:9'],[3/4,'3:4'],[9/16,'9:16']],S.p.ratio)}<div class="pe-seg"><button data-a="rot" data-v="-90">⟲ Rotate</button><button data-a="rot" data-v="90">⟳ Rotate</button><button data-a="flip">⇋ Flip</button></div>`,
 tx:()=>`<label>Text<input type="text" data-k="tx" value="${S.p.tx.replace(/"/g,'&quot;')}" placeholder="Type your text"></label>${sl('ts','Size',10,150)}${sl('ty','Vertical position',0,100)}<label>Color<input type="color" data-k="tc" value="${S.p.tc}"></label>`,
 fi:()=>`<h3>Filters</h3><div class="pe-chips">${Object.keys(FL).map(k=>`<button data-a="fl" data-v="${k}" aria-pressed="${k===S.p.fl}" class="pe-chipb">${k}</button>`).join('')}</div>`,
 ex:()=>`<label>Format<select data-e="f">${opts([['jpeg','JPG'],['png','PNG'],['webp','WEBP']],S.ex.f)}</select></label><label>Quality<select data-e="q">${opts([['.8','Standard'],['.92','High'],['1','Maximum']],S.ex.q)}</select></label><label>Resolution (long side)<select data-e="res">${opts([['0','Original'],['1920','1080p'],['2560','2K'],['3840','4K'],['7680','8K']],S.ex.res)}</select></label><label>Social preset<select data-e="soc">${opts([['','None'],...Object.entries(SOC).map(([k,v])=>[k,`${k} ${v[0]}×${v[1]}`])],S.ex.soc)}</select></label><button class="pri pe-big" data-a="dl">Download</button><small class="mu">Your original file is never changed.</small>`};
const TOOLS=[['ai','✨','AI Enhance'],['pt','☺','Portrait'],['bg','▣','Remove BG'],['ob','⌫','Remove Object'],['cl','◐','Color & Light'],['cr','⛶','Crop & Resize'],['tx','T','Text & Sticker'],['co','▦','Collage'],['fi','❖','Filters'],['ex','⇩','Export']];
function panel(){$('#pe-set').innerHTML=(PN[S.tool]||(()=>pvp(S.tool)))();$('#pe-side').querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.t===S.tool))}
const tool=t=>{S.tool=t;panel()};

/* ---------- open / errors ---------- */
const err=m=>{const e=$('#pe-err');e.textContent=m;e.hidden=false};
async function open(file){$('#pe-err').hidden=true;if(!/^image\/(jpe?g|png|webp)$/.test(file.type))return err('This file type is not supported. Choose a JPG, PNG or WEBP photo.');
 try{const bm=await createImageBitmap(file),c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);bm.close&&bm.close();start(c,file.name)}
 catch(e){err('This photo could not be opened. It may be damaged or too large for this browser.');toast('Photo could not be opened')}}
function start(c,name){S.img=S.src=c;S.name=name.replace(/\.[^.]+$/,'')||'photo';S.p={...P0};S.m=analyze(c);S.doc=diagnose(S.m);S.hist=[snap()];S.at=0;S.z=1;bk='';
 location.hash!=='#photo-editor'&&(location.hash='#photo-editor');$('#pe-home').hidden=true;$('#pe-ed').hidden=false;
 st=mkStage($('#pe-stage'));st.mode(S.mode);tool(S.pending||'ai');S.pending=null;sync();
 busy(()=>{refresh()},1300).then(()=>toast('Photo ready. AI Photo Doctor found '+S.doc.rc.length+' suggested fixes.'))}
const pick=t=>{S.pending=t||null;if(S.img&&t){S.pending=null;$('#pe-home').hidden=true;$('#pe-ed').hidden=false;tool(t)}else $('#pe-in').click()};

/* ---------- export ---------- */
async function exportImg(){const E=S.ex,so=SOC[E.soc],p={...S.p};if(so)p.ratio=so[0]/so[1];const g=geom(p,S.src);let k=so?so[0]/g.cw:+E.res?(+E.res)/Math.max(g.cw,g.ch):S.p.up;k=Math.min(k,16384/Math.max(g.cw,g.ch));
 const ps=Math.min(k,Math.sqrt(24e6/(g.cw*g.ch)));let out;
 const ok=await busy(()=>{out=render(S.src,p,ps);if(k>ps+1e-6){const c=document.createElement('canvas');c.width=Math.round(g.cw*k);c.height=Math.round(g.ch*k);const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(out,0,0,c.width,c.height);out=c}},900);
 if(ok)out.toBlob(b=>{if(!b)return toast('Export failed. This size is too large for your browser. Choose a lower resolution.');saveFile(b,`${S.name}-edited.${E.f==='jpeg'?'jpg':E.f}`);toast(`Exported ${out.width}×${out.height}`)},'image/'+E.f,+E.q)}

/* ---------- events ---------- */
const set=$('#pe-set');
set.oninput=e=>{const k=e.target.dataset.k;if(!k)return;const v=e.target.type==='range'?+e.target.value:e.target.value;S.p[k]=v;const o=e.target.parentNode.querySelector('output');o&&(o.value=v);refresh()};
set.onchange=e=>{if(e.target.dataset.k)commit();else if(e.target.dataset.e)S.ex[e.target.dataset.e]=e.target.value};
set.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,v=b.dataset.v;
 if(a==='str'){S.str=+v;panel()}
 else if(a==='pro')run(()=>setP(pro(S.m),S.str));
 else if(a==='docall')run(()=>setP(Object.assign({au:S.doc.rc.length?1:0},...S.doc.rc.map(r=>r[1]))));
 else if(a==='ai'){const f=AIF[v];f?run(()=>addP(f(S.m))):toast(prov().faceEnhance?'Use the Portrait tab to run face enhancement.':'AI Face Enhancement needs an AI provider. Nothing was changed.')}
 else if(a==='col')run(()=>addP(AIF.col(S.m),1));
 else if(a==='up'){S.p.up=+v;commit();panel()}
 else if(a==='ratio'){S.p.ratio=+v;commit();panel();refresh()}
 else if(a==='rot'){S.p.rot=(S.p.rot+ +v+360)%360;commit();refresh()}
 else if(a==='flip'){S.p.fx=!S.p.fx;commit();refresh()}
 else if(a==='fl'){S.p.fl=v;commit();panel();refresh()}
 else if(a==='dl')exportImg();
 else if(a==='prov')busy(async()=>{const o=await prov()[v](S.src,{...S.p});if(!o)throw 0;S.src=o;bk=''}).then(ok=>{if(ok){commit();refresh();toast('Done')}})};
$('#pe-un').onclick=()=>go(S.at-1);$('#pe-re').onclick=()=>go(S.at+1);
$('#pe-rs').onclick=()=>{S.p={...P0};S.src=S.img;bk='';commit();panel();refresh();toast('Restored the original photo')};
$('#pe-zo').onclick=()=>{S.z=Math.max(.5,S.z-.25);refresh()};$('#pe-zi').onclick=()=>{S.z=Math.min(3,S.z+.25);refresh()};
$('#pe-dl').onclick=()=>tool('ex');$('#pe-bk').onclick=()=>{$('#pe-ed').hidden=true;$('#pe-home').hidden=false};
$('#pe-modes').onclick=e=>{const m=e.target.dataset.m;if(!m)return;S.mode=m;st.mode(m);$('#pe-modes').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m))};
$('#pe-side').innerHTML=TOOLS.map(([t,i,n])=>`<button data-t="${t}"><span aria-hidden="true">${i}</span>${n}</button>`).join('');$('#pe-side').onclick=e=>{const b=e.target.closest('[data-t]');b&&tool(b.dataset.t)};
$('#pe-qt').innerHTML=[['cr','⛶','Crop'],['bg','▣','Remove BG'],['ob','⌫','Remove Watermark'],['tx','T','Add Text'],['co','▦','Collage'],['ai','✨','AI Enhance'],['ai','⋯','More Tools']].map(([t,i,n])=>`<button data-t="${t}"><i aria-hidden="true">${i}</i>${n}</button>`).join('');$('#pe-qt').onclick=e=>{const b=e.target.closest('[data-t]');b&&pick(b.dataset.t)};
$('#pe-fg').innerHTML=[['✨','AI Enhance','Better exposure, color and clarity in one click','ai'],['▣','Remove Background','Needs an AI provider','bg'],['☺','Portrait','Natural face and skin tools (needs AI provider)','pt'],['◎','AI Focus','Sharpen soft photos','ai'],['⤢','AI Upscale','2×, 4× or 8× larger exports','ai'],['◐','Color Correction','Exposure, contrast, white balance','cl'],['▦','Collage','Coming next','co'],['T','Add Text','Captions and titles','tx'],['❖','Filters','13 professional presets','fi']].map(([i,t,d,k])=>`<button class="card" data-t="${k}" style="text-align:left"><b style="font-size:22px">${i}</b><h3>${t}</h3><p>${d}</p></button>`).join('');$('#pe-fg').onclick=$('#pe-qt').onclick;
$('#pe-up').onclick=()=>pick();$('#pe-in').onchange=e=>{e.target.files[0]&&open(e.target.files[0]);e.target.value=''};
const R=$('#v-photo-editor');['dragover','dragenter'].forEach(v=>R.addEventListener(v,x=>{x.preventDefault();$('#pe-drop').classList.add('over')}));
['dragleave','drop'].forEach(v=>R.addEventListener(v,x=>{x.preventDefault();$('#pe-drop').classList.remove('over')}));R.addEventListener('drop',x=>{const f=x.dataTransfer.files[0];f&&open(f)});

/* ---------- MediaForge integration + hero before/after on the sample photo ---------- */
const hp=document.getElementById('hpb');hp&&(hp.onclick=()=>{location.hash='#photo-editor';$('#pe-in').click()});
const fg=document.getElementById('fgrid');fg&&fg.insertAdjacentHTML('afterbegin','<a class="card" href="#photo-editor" style="display:block"><span class="tag">Working (on your device)</span><h3>Photo Editor</h3><p>Enhance, color, crop, text, filters and export. AI tools plug in later.</p></a>');
const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);const h=mkStage($('#pe-hc'));put(h.o,render(c,P0,1));put(h.c,render(c,{...P0,...pro(analyze(c))},1))};im.onerror=()=>{$('#pe-hc').hidden=true};im.src='photo-editor/sample.jpg';
})();
