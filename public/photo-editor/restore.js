/* MediaForge Photo Editor: old-photo clean-up. Plain pixel maths, no AI, no DOM (so it can be tested in Node).
   despeckle(imageData, level) removes dust, specks, scratches and small stains in place.
   Method: alternating open/close filters per colour channel (van Herk min/max, O(n) for any radius) remove bright and dark
   features smaller than the window; a soft mask keeps every pixel that did not change much, so fine detail stays untouched. */
(()=>{
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
/* 1-D min/max over a window of 2r+1 (edge pixels repeated), van Herk / Gil-Werman */
function line(a,n,r,mx,p,g,h){const w=2*r+1,L=n+2*r;for(let j=0;j<L;j++)p[j]=a[clamp(j-r,0,n-1)];
 for(let j=0;j<L;j++){const s=j%w===0;g[j]=s?p[j]:(mx?Math.max(g[j-1],p[j]):Math.min(g[j-1],p[j]))}
 for(let j=L-1;j>=0;j--){const e=j===L-1||(j+1)%w===0;h[j]=e?p[j]:(mx?Math.max(h[j+1],p[j]):Math.min(h[j+1],p[j]))}
 for(let i=0;i<n;i++)a[i]=mx?Math.max(h[i],g[i+2*r]):Math.min(h[i],g[i+2*r])}
function mm(a,W,H,r,mx){const m=Math.max(W,H)+2*r+2,p=new Float32Array(m),g=new Float32Array(m),h=new Float32Array(m),row=new Float32Array(W),col=new Float32Array(H);
 for(let y=0;y<H;y++){const o=y*W;for(let x=0;x<W;x++)row[x]=a[o+x];line(row,W,r,mx,p,g,h);for(let x=0;x<W;x++)a[o+x]=row[x]}
 for(let x=0;x<W;x++){for(let y=0;y<H;y++)col[y]=a[y*W+x];line(col,H,r,mx,p,g,h);for(let y=0;y<H;y++)a[y*W+x]=col[y]}
 return a}
const open=(a,W,H,r)=>mm(mm(a,W,H,r,false),W,H,r,true),close=(a,W,H,r)=>mm(mm(a,W,H,r,true),W,H,r,false);
function box(a,W,H,r){const t=new Float32Array(a.length),n=2*r+1;
 for(let y=0;y<H;y++){const b=y*W;let q=0;for(let i=-r;i<=r;i++)q+=a[b+clamp(i,0,W-1)];for(let x=0;x<W;x++){t[b+x]=q/n;q+=a[b+Math.min(W-1,x+r+1)]-a[b+Math.max(0,x-r)]}}
 for(let x=0;x<W;x++){let q=0;for(let i=-r;i<=r;i++)q+=t[clamp(i,0,H-1)*W+x];for(let y=0;y<H;y++){a[y*W+x]=q/n;q+=t[Math.min(H-1,y+r+1)*W+x]-t[Math.max(0,y-r)*W+x]}}
 return a}
/* level 1 = light, 2 = medium, 3 = strong. Returns the share of pixels that were repaired (0..1). */
function despeckle(im,level){const W=im.width,H=im.height,d=im.data,n=W*H,lv=clamp(Math.round(level)||2,1,3),
 r=Math.max(1,Math.round(W/900*[2,3,5][lv-1])),lo=[14,10,8][lv-1],hi=[52,42,34][lv-1];
 const F=[new Float32Array(n),new Float32Array(n),new Float32Array(n)],dev=new Float32Array(n);
 for(let c=0;c<3;c++){const a=new Float32Array(n),b=new Float32Array(n);for(let i=0;i<n;i++)a[i]=b[i]=d[i*4+c];
  open(close(a,W,H,r),W,H,r);close(open(b,W,H,r),W,H,r);
  for(let i=0;i<n;i++){const f=(a[i]+b[i])/2;F[c][i]=f;const e=Math.abs(f-d[i*4+c]);if(e>dev[i])dev[i]=e}}
 const m=new Float32Array(n);let cnt=0;
 for(let i=0;i<n;i++){const t=clamp((dev[i]-lo)/(hi-lo),0,1);m[i]=t*t*(3-2*t)}
 box(m,W,H,1);for(let i=0;i<n;i++)m[i]=Math.min(1,m[i]*1.6);   /* cover the soft halo around each speck */
 for(let i=0;i<n;i++){const k=m[i];if(k<.02)continue;if(k>.5)cnt++;for(let c=0;c<3;c++)d[i*4+c]+=(F[c][i]-d[i*4+c])*k}
 return cnt/n}
window.PE_RESTORE={despeckle};
})();
