/* Zalgo MUX 3.0.0 — new independent-channel format, Lily of Ashwood, 2026.
 * This is a recoverable Unicode container, not encryption or authentication. */
(function (root) {
  'use strict';
  const VERSION = '3.0.0';
  const A = ['\u030D','\u0357','\u033F','\u030A','\u035D','\u030E','\u033D','\u0346','\u0311','\u0306'];
  const A_BOTTOM = ['\u0329','\u0339','\u0333','\u0325','\u035C','\u0348','\u0353','\u032A','\u032F','\u032E'];
  const B = ['\u20DD','\u20DE','\u0489','\u20E4','\u0488','\u0338','\u20E5','\u20D2','\u20EA','\u20EB'];
  const GUARDS = {a:'\u034F', b:'\uFE0E'};
  const SEAM = '\u2063', DOT = '\u25CC';
  const LIMITS = Object.freeze({carrier:20000, payloadBytes:65536, encoded:1200000, unitCodepoints:20});
  const segmenter = new Intl.Segmenter('en', {granularity:'grapheme'});
  const utf8 = new TextEncoder();
  const alphabets = {a:A,b:B};
  const markDigit=(lane,mark)=>lane==='a'?(A.includes(mark)?A.indexOf(mark):A_BOTTOM.indexOf(mark)):B.indexOf(mark);
  const reserved = new Set([GUARDS.a,GUARDS.b,SEAM]);
  function text(value, max, label) {
    if (typeof value !== 'string') throw new TypeError(label+' must be a string.');
    if (value.length > max) throw new RangeError(label+' exceeds the resource limit.');
    for (const ch of value) if (ch.codePointAt(0)>=0xD800 && ch.codePointAt(0)<=0xDFFF)
      throw new TypeError(label+' contains an unpaired surrogate.');
    return value;
  }
  function crc32(bytes) {
    let crc=0xFFFFFFFF;
    for (const byte of bytes) {
      crc ^= byte;
      for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xEDB88320:0);
    }
    return (crc^0xFFFFFFFF)>>>0;
  }
  const padded=(n,width)=>String(n).padStart(width,'0');
  const graphemes=value=>Array.from(segmenter.segment(value),x=>x.segment);
  function frame(payload,lane,carrierCRC) {
    text(payload,LIMITS.payloadBytes,'Payload '+lane.toUpperCase());
    const bytes=utf8.encode(payload);
    if(bytes.length>LIMITS.payloadBytes) throw new RangeError('Payload exceeds 65536 UTF-8 bytes.');
    return '03'+(lane==='a'?'1':'2')+padded(bytes.length,6)+padded(crc32(bytes),10)+padded(carrierCRC,10)
      +Array.from(bytes,b=>padded(b,3)).join('');
  }
  function escapeCarrier(value) {
    return Array.from(value,ch=>reserved.has(ch)?ch+ch:ch).join('');
  }
  function encode(carrier,payloadA='',payloadB='') {
    text(carrier,LIMITS.carrier,'Carrier');
    if(!carrier) throw new RangeError('Give the marks a visible carrier.');
    const checksum=crc32(utf8.encode(carrier));
    const streams={a:frame(payloadA,'a',checksum),b:frame(payloadB,'b',checksum)};
    const positions={a:0,b:0}; let next='a', continuationUnits=0;
    const units=graphemes(carrier).map(escapeCarrier);
    const sourceOversize=units.filter(u=>Array.from(u).length>LIMITS.unitCodepoints).length;
    function hasMore(){return positions.a<streams.a.length||positions.b<streams.b.length;}
    function decorate(unit) {
      let slots=Math.max(0,Math.floor((LIMITS.unitCodepoints-Array.from(unit).length)/2));
      while(slots-- && hasMore()) {
        if(positions[next]>=streams[next].length) next=next==='a'?'b':'a';
        const digit=Number(streams[next][positions[next]++]);
        const marks=next==='a'&&positions.a%2===0?A_BOTTOM:alphabets[next];
        unit+=GUARDS[next]+marks[digit];
        next=next==='a'?'b':'a';
      }
      return unit;
    }
    const out=units.map(decorate);
    while(hasMore()) {out.push(decorate(SEAM+DOT));continuationUnits++;}
    const encoded=out.join('');
    text(encoded,LIMITS.encoded,'Encoded text');
    return {format:'zalgo-mux',version:VERSION,encoded,receipt:{
      carrierGraphemes:units.length,continuationUnits,sourceOversize,
      payloadABytes:utf8.encode(payloadA).length,payloadBBytes:utf8.encode(payloadB).length,
      generatedUnitLimit:LIMITS.unitCodepoints,codepoints:Array.from(encoded).length,
      note:'Continuation circles carry overflow. Raw code points must survive the destination.'
    }};
  }
  function extractDigits(encoded,lane) {
    text(encoded,LIMITS.encoded,'Encoded text');
    if(!Object.hasOwn(GUARDS,lane)) throw new RangeError('Lane must be a or b.');
    const chars=Array.from(encoded),guard=GUARDS[lane];
    let digits='';
    for(let i=0;i<chars.length;i++) {
      if(chars[i]!==guard) continue;
      if(chars[i+1]===guard) {i++;continue;}
      const digit=markDigit(lane,chars[++i]);
      if(digit<0) throw new Error('Malformed '+lane.toUpperCase()+' token at code point '+(i-1)+'.');
      digits+=digit;
      if(digits.length>29+LIMITS.payloadBytes*3) throw new RangeError('Lane exceeds the resource limit.');
    }
    return digits;
  }
  function decodeLane(encoded,lane) {
    const digits=extractDigits(encoded,lane);
    if(!digits.length) return {status:'absent',lane};
    if(digits.length<29) throw new Error('Truncated '+lane.toUpperCase()+' header.');
    if(digits.slice(0,3)!=='03'+(lane==='a'?'1':'2')) throw new Error('Unsupported version or lane identity.');
    const count=Number(digits.slice(3,9)),expectedCRC=Number(digits.slice(9,19)),carrierCRC=Number(digits.slice(19,29));
    if(count>LIMITS.payloadBytes || expectedCRC>0xFFFFFFFF || carrierCRC>0xFFFFFFFF)
      throw new Error('Header value outside allowed range.');
    if(digits.length!==29+count*3) throw new Error('Length mismatch: truncated, appended, or concatenated lane.');
    const bytes=new Uint8Array(count);
    for(let i=0;i<count;i++) {
      const value=Number(digits.slice(29+i*3,32+i*3));
      if(value>255) throw new Error('Invalid byte value in lane '+lane+'.');
      bytes[i]=value;
    }
    if(crc32(bytes)!==expectedCRC) throw new Error('Checksum mismatch in lane '+lane+'.');
    const payload=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
    return {status:'exact',lane,payload,bytes:count,carrierCRC};
  }
  function restoreCarrier(encoded) {
    text(encoded,LIMITS.encoded,'Encoded text');
    const chars=Array.from(encoded);let carrier='';
    for(let i=0;i<chars.length;i++) {
      const ch=chars[i];
      if(!reserved.has(ch)) {carrier+=ch;continue;}
      if(chars[i+1]===ch) {carrier+=ch;i++;continue;}
      if(ch===SEAM && chars[i+1]===DOT) {i++;continue;}
      const lane=ch===GUARDS.a?'a':ch===GUARDS.b?'b':null;
      if(lane && markDigit(lane,chars[i+1])>=0) {i++;continue;}
      throw new Error('Malformed carrier escape or mark token at code point '+i+'.');
    }
    return carrier;
  }
  function decode(encoded) {
    text(encoded,LIMITS.encoded,'Encoded text');
    const attempt=fn=>{try{return fn();}catch(error){return {status:'rejected',reason:error.message};}};
    const a=attempt(()=>decodeLane(encoded,'a')),b=attempt(()=>decodeLane(encoded,'b'));
    const carrier=attempt(()=>{
      const value=restoreCarrier(encoded),checksum=crc32(utf8.encode(value));
      const checks=[a,b].filter(l=>l.status==='exact');
      if(!checks.length) return {status:'unverified',value,reason:'No verified lane contains a carrier checksum.'};
      if(checks.some(l=>l.carrierCRC!==checksum)) return {status:'changed',value,reason:'Carrier checksum differs; normalization or edits may have changed it.'};
      return {status:'exact',value};
    });
    return {format:'zalgo-mux',version:VERSION,a,b,carrier};
  }
  const api=Object.freeze({VERSION,LIMITS,A:Object.freeze(A),A_BOTTOM:Object.freeze(A_BOTTOM),B:Object.freeze(B),GUARDS:Object.freeze(GUARDS),SEAM,DOT,
    encode,decode,decodeLane,restoreCarrier,extractDigits,crc32,graphemes});
  root.ZalgoMux=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(globalThis);
