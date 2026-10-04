/* Connects the Photo Editor AI tools to Cloudinary through the MediaForge server (server.js).
   The Cloudinary secret never reaches the browser. If the server has no Cloudinary keys, nothing is connected and the tools keep saying "AI provider not connected". */
(()=>{const api=()=>window.MF_API||'';
 async function call(op,src,extra){const k=Math.min(1,2048/Math.max(src.width,src.height));let c=src;
  if(k<1){c=document.createElement('canvas');c.width=Math.round(src.width*k);c.height=Math.round(src.height*k);c.getContext('2d').drawImage(src,0,0,c.width,c.height)}
  const b=await new Promise(r=>c.toBlob(r,'image/png')),fd=new FormData();fd.append('file',b,'photo.png');for(const q in extra)fd.append(q,extra[q]);
  const r=await fetch(api()+'/api/cld/'+op,{method:'POST',body:fd});if(!r.ok)throw Object.assign(new Error((await r.text()).slice(0,140)||'Cloudinary error'),{cld:1});
  const bm=await createImageBitmap(await r.blob()),o=document.createElement('canvas');o.width=bm.width;o.height=bm.height;o.getContext('2d').drawImage(bm,0,0);return o}
 fetch(api()+'/api/cld/status').then(r=>r.json()).then(s=>{if(!s.ok||window.PE_PROVIDER)return;
  window.PE_PROVIDER={removeBackground:s=>call('background',s),removeObject:(s,p)=>call('remove',s,{prompt:p.rp||'watermark'}),faceEnhance:s=>call('restore',s),enhance:(s,o)=>call('enhance',s,{mode:o.mode,level:o.level})}}).catch(()=>{});
})();
