const skills=[
{name:"対ドラゴンタートル○",s:10,c:[0,45,0,210,0]},
{name:"対植物○",s:10,c:[77,77,101,0,0]},
{name:"回復効果○",s:10,c:[0,0,105,150,150]},
{name:"癒やしの心",s:10,c:[120,0,50,140,0]},
{name:"ヒーラー魂",s:10,c:[0,100,50,0,99]}
];
document.getElementById('calc').onclick=function(){
const p=+power.value,sp=+speed.value,t=+tech.value,i=+intel.value,m=+mind.value;
let html='<h3>取得可能能力</h3>',score=0;
skills.forEach(x=>{
 if(x.c[0]<=p&&x.c[1]<=sp&&x.c[2]<=t&&x.c[3]<=i&&x.c[4]<=m){
  html+='<div class="skill">✅ '+x.name+' (+'+x.s+')</div>';
  score+=x.s;
 }
});
html+='<h2>合計査定 +'+score+'</h2>';
document.getElementById('result').innerHTML=html;
};