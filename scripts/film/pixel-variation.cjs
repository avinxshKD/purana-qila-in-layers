'use strict';
function variationEnvelope(first,second,candidate){
  if(first.length!==second.length||first.length!==candidate.length||first.length%4)throw new Error('RGBA lengths differ');
  let baselineVaryingPixels=0,maxBaselineChannelDelta=0,candidateOutsideEnvelopePixels=0,maxOutsideEnvelopeChannelDelta=0;
  const varyingPixelIndices=[];
  for(let i=0;i<first.length;i+=4){
    let varying=false,outside=false;
    for(let c=0;c<4;c++){
      const a=first[i+c],b=second[i+c],value=candidate[i+c],low=Math.min(a,b),high=Math.max(a,b),delta=value<low?low-value:value>high?value-high:0;
      varying||=a!==b;outside||=delta!==0;maxBaselineChannelDelta=Math.max(maxBaselineChannelDelta,high-low);maxOutsideEnvelopeChannelDelta=Math.max(maxOutsideEnvelopeChannelDelta,delta);
    }
    if(varying){baselineVaryingPixels++;if(varyingPixelIndices.length<16)varyingPixelIndices.push(i/4);}
    candidateOutsideEnvelopePixels+=Number(outside);
  }
  return {baselineVaryingPixels,maxBaselineChannelDelta,varyingPixelIndices,candidateWithinEnvelope:candidateOutsideEnvelopePixels===0,candidateOutsideEnvelopePixels,maxOutsideEnvelopeChannelDelta,pixelsCompared:first.length/4};
}
module.exports={variationEnvelope};
