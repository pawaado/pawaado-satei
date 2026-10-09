/* Experimental review-only gate. NOT wired to public appraisal input. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PAWAADO_AI_SAFETY_GATE=api;
})(typeof globalThis==='undefined'?null:globalThis,function(){
  'use strict';
  const MODES=Object.freeze(['original','jpeg85','brightness90','brightness110']);
  function compare({recognizedName=false,currentFinalMark=null,variants={}}={}){
    const final=['○','◎'].includes(currentFinalMark)?currentFinalMark:null;
    const points=MODES.map(k=>variants[k]);
    const agreed=points.every(p=>p&&['○','◎','なし'].includes(p.mark)
      &&Number.isFinite(p.confidence)&&p.confidence>=.95&&p.confidence<=1)
      &&points.every(p=>p.mark===points[0].mark);
    const ai=agreed?points[0].mark:null;
    const wrap=(disposition,candidate=null,reason='')=>({
      disposition,aiCandidate:candidate,currentFinalMark:final,automaticChange:false,reason
    });
    if(!recognizedName)return wrap('ignore',null,'no independently confirmed skill name');
    if(!agreed)return wrap(final?'keep-current-review':'unresolved',null,'quality or confidence disagreement');
    if(ai==='なし')return wrap(final?'keep-current-review':'no-mark',null,'AI says no mark');
    if(final===ai)return wrap('corroborated',ai,'independent agreement');
    return wrap(final?'keep-current-review':'review-only',ai,'never override or invent acquired abilities');
  }
  return Object.freeze({compare,REQUIRED:MODES,MIN_CONFIDENCE:.95});
});