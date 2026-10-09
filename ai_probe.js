(()=>{'use strict';
const MODELS=window.PAWAADO_AI_PROBE_MODELS;
const positions=[713,852,990,1128],expXs=[[977,1034],[1035,1093],[1095,1152],[1153,1212],[1213,1272]];
const EXP_NAMES=['筋力','敏捷','技術','知力','精神'];
const decoded={};
for(const [key,model] of Object.entries(MODELS)){
  const bytes=atob(model.b64),rows=model.scale.length,n=model.shape[0]*model.shape[1];
  if(bytes.length!==rows*n)throw new Error('AIモデルの容量が一致しません: '+key);
  decoded[key]={...model,weights:Int8Array.from(bytes,ch=>{const v=ch.charCodeAt(0);return v<128?v:v-256;})};
}
const sigmoid=x=>x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));
function predict(kind,pixels){
  const m=decoded[kind],length=m.shape[0]*m.shape[1],scores=[];
  if(pixels.length!==length)throw new Error('AI入力の大きさが違います: '+kind);
  for(let c=0;c<m.scale.length;c++){
    let score=m.bias[c],offset=c*length,scale=m.scale[c];
    for(let i=0;i<length;i++)score+=m.weights[offset+i]*scale*pixels[i];
    scores.push(score);
  }
  if(scores.length===1){const p=sigmoid(scores[0]);return {value:p>=.5?'◎':'○',confidence:Math.max(p,1-p),scores};}
  const mx=Math.max(...scores),weights=scores.map(s=>Math.exp(s-mx)),sum=weights.reduce((a,b)=>a+b,0);
  const best=scores.indexOf(mx);
  return {value:String(m.classes[best]),confidence:weights[best]/sum,scores};
}
function luminance(r,g,b){return r*.299+g*.587+b*.114;}
function rgbAt(data,x,y){const i=(y*1536+x)*4;return[data[i],data[i+1],data[i+2]];}
function lumAt(data,x,y){const i=(y*1536+x)*4;return luminance(data[i],data[i+1],data[i+2]);}
// Area interpolation: same box-averaging scheme as model training, independent of screen scale.
function areaResize(sample,w,h,outW,outH){
 const out=new Float64Array(outW*outH),sx=w/outW,sy=h/outH;
 for(let oy=0;oy<outH;oy++)for(let ox=0;ox<outW;ox++){
   const y0=oy*sy,y1=(oy+1)*sy,x0=ox*sx,x1=(ox+1)*sx;
   let sum=0,weight=0;
   for(let yy=Math.floor(y0);yy<Math.ceil(y1);yy++)for(let xx=Math.floor(x0);xx<Math.ceil(x1);xx++){
     if(xx<0||yy<0||xx>=w||yy>=h)continue;
     const wy=Math.min(yy+1,y1)-Math.max(yy,y0),wx=Math.min(xx+1,x1)-Math.max(xx,x0);
     const area=Math.max(0,wx)*Math.max(0,wy);
     sum+=sample[yy*w+xx]*area;weight+=area;
   }
   out[oy*outW+ox]=weight?sum/weight:240;
 }
 return out;
}
function markFeatures(data,cx,y){
 const samples=new Float64Array(26*32);
 for(let yy=0;yy<32;yy++)for(let xx=0;xx<26;xx++){
   const py=y+6+yy,px=cx-13+xx;
   samples[yy*26+xx]=lumAt(data,px,py);
 }
 const small=areaResize(samples,26,32,20,20);
 const sorted=Array.from(small).sort((a,b)=>a-b);
 function percentile(t){const at=t*(sorted.length-1),i=Math.floor(at),part=at-i;return sorted[i]*(1-part)+sorted[Math.min(i+1,sorted.length-1)]*part;}
 const low=percentile(.04),high=percentile(.95),span=Math.max(20,high-low);
 return Float64Array.from(small,v=>Math.max(0,Math.min(1,(v-low)/span)));
}
function isColored(data,x,y){
 const [r,g,b]=rgbAt(data,x,y);
 return b>r+25&&g>r+10||r>b+65&&g>b+35;
}
function detectRows(data){
 const bands=[];
 for(let y=274;y<537;y++){
   let found=false;
   for(const x of positions){
     let hits=0;
     for(let xx=x+3;xx<x+127;xx+=8)if(isColored(data,xx,y))hits++;
     if(hits>=4){found=true;break;}
   }
   if(!found)continue;
   if(!bands.length||y>bands[bands.length-1][1]+3)bands.push([y,y]);
   else bands[bands.length-1][1]=y;
 }
 // A scroll-hidden fragment sometimes remains above a complete next row.
 // Never merge that clipped fragment into the next row's text crop (IMG_1097).
 const clippedTop=bands.length>1&&bands[0][0]<=276&&bands[0][1]-bands[0][0]+1<25
   &&bands[1][0]-bands[0][1]<=18&&bands[1][1]-bands[1][0]+1>=25;
 const visibleBands=clippedTop?bands.slice(1):bands;
 const merged=[];
 for(const [a,b] of visibleBands){
   const prev=merged[merged.length-1];
   if(prev&&a-prev[0]<44&&a-prev[1]<=16)prev[1]=b;
   else merged.push([a,b]);
 }
 const rows=merged.filter(([a,b])=>b-a+1>=25).map(([a,b])=>[a,b]);
 for(const [a,b] of merged){
   if(b-a+1<12||b-a+1>=25)continue;
   const y=Math.max(274,a-4);
   if(rows.some(([other])=>Math.abs(other-y)<35))continue;
   const filled=positions.some(x=>{
     let hits=0;
     for(let yy=y+2;yy<Math.min(537,y+38);yy+=2)
       for(let xx=x+3;xx<x+127;xx+=8)
         if(isColored(data,xx,yy))hits++;
     return hits>=60;
   });
   if(filled)rows.push([y,Math.max(b,y+24)]);
 }
 return rows.sort((a,b)=>a[0]-b[0]).map(row=>row[0]);
}
function findLastGlyph(data,x,y){
 const counts=new Uint8Array(65);
 for(let xx=65;xx<130;xx++){
   let n=0;
   for(let yy=y+9;yy<y+33;yy++){
     const [r,g,b]=rgbAt(data,x+xx,yy);
     if(luminance(r,g,b)<192&&Math.max(r,g,b)-Math.min(r,g,b)<90)n++;
   }
   counts[xx-65]=n;
 }
 let last=null,start=-1;
 for(let i=0;i<=65;i++){
   const on=i<65&&counts[i]>=2;
   if(on&&start<0)start=i;
   else if(!on&&start>=0){
     if(i-start>=6)last=[start+65,i+65];
     start=-1;
   }
 }
 return last?{cx:Math.round(x+(last[0]+last[1])/2),width:last[1]-last[0]}:null;
}
// 2択モデルへ入れる前に、「そもそも末尾に丸い記号があるか」を別途検査。
// 魔力制御／魔法の理解などは最後の漢字を無理に○/◎分類しない。
function looksLikeMarkGlyph(data,cx,y,width){
 if(width<10||width>22)return false;
 let dark=0,count=0;
 for(let yy=y+18;yy<y+29;yy++)for(let xx=cx-5;xx<cx+5;xx++){
   const [r,g,b]=rgbAt(data,xx,yy);
   const lum=luminance(r,g,b);
   if(lum<172&&Math.max(r,g,b)-Math.min(r,g,b)<80)dark++;
   count++;
 }
 // 丸印は中心が空洞。漢字・文字片は中心が密集する。
 return count>0&&dark/count<.67;
}
function markCells(data){
 const rows=detectRows(data),out=[];
 for(const [ri,y] of rows.entries()){
   for(const [ci,x] of positions.entries()){
     let color=0,yellow=0;
     for(let yy=y+5;yy<Math.min(537,y+35);yy++)
       for(let xx=x+3;xx<x+127;xx+=8){
         const [r,g,b]=rgbAt(data,xx,yy);
         if(isColored(data,xx,yy))color++;
         if(r>175&&g>125&&b<120&&r>b+65&&g>b+35)yellow++;
       }
     if(color<=30||yellow>=20)continue; // 金色セルは超特殊能力、○／◎対象外。
     const glyph=findLastGlyph(data,x,y);
     const label={row:ri+1,col:ci+1};
     if(!glyph||glyph.cx<13||glyph.cx+13>=1536||!looksLikeMarkGlyph(data,glyph.cx,y,glyph.width)){
       out.push({...label,value:'なし',confidence:null});
       continue;
     }
     const p=predict('marks',markFeatures(data,glyph.cx,y));
     out.push({...label,value:p.confidence>=.65?p.value:'未確定',confidence:p.confidence});
   }
 }
 return out;
}
function digitCharacters(data,col){
 const [left,right]=expXs[col],top=223,bottom=257,width=right-left,height=bottom-top;
 const binary=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const l=lumAt(data,left+x,top+y);
   binary[y*width+x]=l<116?1:0;
 }
 const visited=new Uint8Array(width*height),results=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const start=y*width+x;
   if(!binary[start]||visited[start])continue;
   const stack=[start];visited[start]=1;
   let x0=x,x1=x,y0=y,y1=y,area=0;
   while(stack.length){
     const i=stack.pop(),cx=i%width,cy=Math.floor(i/width);area++;
     x0=Math.min(x0,cx);x1=Math.max(x1,cx);y0=Math.min(y0,cy);y1=Math.max(y1,cy);
     for(let yy=Math.max(0,cy-1);yy<=Math.min(height-1,cy+1);yy++)
       for(let xx=Math.max(0,cx-1);xx<=Math.min(width-1,cx+1);xx++){
         const ni=yy*width+xx;
         if(binary[ni]&&!visited[ni]){visited[ni]=1;stack.push(ni);}
       }
   }
   const w=x1-x0+1,h=y1-y0+1;
   if(w>=2&&h>=8&&area>=7&&y0<=23&&y1>=12)results.push({x:x0,y:y0,w,h});
 }
 results.sort((a,b)=>a.x-b.x);
 if(!results.length||results.length>4)return {value:'未読',confidence:0};
 const characters=[];
 for(const part of results){
   if(part.w>18||part.h>19)return {value:'未読',confidence:0};
   const sample=new Float64Array(18*21).fill(240);
   const ox=Math.floor((18-part.w)/2);
   for(let y=0;y<part.h;y++)for(let x=0;x<part.w;x++)
     sample[(y+2)*18+ox+x]=lumAt(data,left+part.x+x,top+part.y+y);
   const small=areaResize(sample,18,21,14,18);
   const result=predict('digits',Float64Array.from(small,v=>v/255));
   characters.push(result);
 }
 return {value:characters.map(c=>c.value).join(''),confidence:Math.min(...characters.map(c=>c.confidence))};
}
function experience(data){
 const items=EXP_NAMES.map((name,i)=>({name,...digitCharacters(data,i)}));
 // Modal images obscure the experience digits; do not present them as readings.
 if(items.filter(i=>i.confidence>=.75&&i.value!=='未読').length<4)return [];
 return items;
}
const root=document.getElementById('aiResults');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=p=>Math.round(100*p)+'%';
async function inspectImage(img){
 if(img.width<img.height)return {error:'縦向きの画像は対象外です。ゲーム画面の横向きスクショを選んでください。'};
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=706;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(img,0,0,1536,706);
 const pixels=ctx.getImageData(0,0,1536,706).data;
 return {marks:markCells(pixels),experience:experience(pixels)};
}
async function inspect(file){
 const url=URL.createObjectURL(file);
 try{
   const img=new Image();
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
   return inspectImage(img);
 }finally{URL.revokeObjectURL(url);}
}
// 読み取り比較用。既存の査定入力とは独立し、返り値を使って自動入力しない。
window.__PAWAADO_AI_PROBE__=Object.freeze({inspectImage});
if(document.getElementById('aiPhotos'))document.getElementById('aiPhotos').addEventListener('change',async event=>{
 const files=[...event.target.files].slice(0,12);
 root.textContent='解析中…';document.getElementById('aiPhotos').disabled=true;
 try{
   const blocks=[];
   for(const file of files){
     const v=await inspect(file);
     if(v.error){blocks.push('<section><h2>'+esc(file.name)+'</h2><p>'+esc(v.error)+'</p></section>');continue;}
     const exp=v.experience.length?'<table><thead><tr><th>経験点</th><th>AI読取</th><th>確信度</th></tr></thead><tbody>'+v.experience.map(e=>'<tr><td>'+e.name+'</td><td>'+esc(e.value)+'</td><td>'+pct(e.confidence)+'</td></tr>').join('')+'</tbody></table>':'<p>この画像では経験点を検出しませんでした。</p>';
     const marks=v.marks.length?'<table><thead><tr><th>表示位置</th><th>○/◎候補</th><th>確信度</th></tr></thead><tbody>'+v.marks.map(e=>'<tr><td>'+e.row+'行'+e.col+'列</td><td>'+e.value+'</td><td>'+pct(e.confidence)+'</td></tr>').join('')+'</tbody></table>':'<p>特殊能力マスを検出しませんでした。</p>';
     blocks.push('<section><h2>'+esc(file.name)+'</h2><h3>経験点（実験）</h3>'+exp+'<h3>特殊能力の末尾マーク（候補）</h3>'+marks+'</section>');
   }
   root.innerHTML=blocks.join('');
 }catch(error){root.textContent='解析エラー：'+String(error.message||error);}
 finally{document.getElementById('aiPhotos').disabled=false;}
});
})();