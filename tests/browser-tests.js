(async function(){
  'use strict';
  const M=ZalgoMux,results=[];
  const assert=(v,m='assertion failed')=>{if(!v)throw new Error(m);};
  const equal=(a,b)=>assert(a===b,JSON.stringify(a)+' != '+JSON.stringify(b));
  const rejects=fn=>{let thrown=false;try{fn();}catch{thrown=true;}assert(thrown,'expected rejection');};
  async function test(name,fn){try{await fn();results.push('PASS '+name);}catch(e){results.push('FAIL '+name+': '+e.message);}}
  const make=(c='𝔱̷̛̝̈́ 猫 👩🏽‍💻 🏳️‍🌈 e\u0301 \r\n',a='Lily\t\n\r\0 🐈‍⬛ café 𝒜',b='\uFEFFdifferent\n声音')=>M.encode(c,a,b).encoded;
  const tokens=(digits,lane)=>Array.from(digits,d=>M.GUARDS[lane]+M[lane.toUpperCase()][Number(d)]).join('');
  const withoutLane=(input,lane)=>{
    const chars=Array.from(input),out=[],guard=M.GUARDS[lane],alphabet=lane==='a'?[...M.A,...M.A_BOTTOM]:M.B;
    for(let i=0;i<chars.length;i++) {if(chars[i]===guard && alphabet.includes(chars[i+1])){i++;continue;}out.push(chars[i]);}
    return out.join('');
  };
  await test('UTF-8, BOM, NUL, whitespace, case and exact carrier',()=>{
    const carrier='𝔱̷̛̝̈́ 猫 👩🏽‍💻 🏳️‍🌈 e\u0301 \r\n',result=M.decode(make());
    equal(result.a.payload,'Lily\t\n\r\0 🐈‍⬛ café 𝒜');equal(result.b.payload,'\uFEFFdifferent\n声音');equal(result.carrier.value,carrier);equal(result.carrier.status,'exact');
  });
  await test('both empty payloads are exact, not absent',()=>{const r=M.decode(make('◉','',''));equal(r.a.status,'exact');equal(r.b.payload,'');});
  await test('all reserved escapes and literal mark alphabets survive',()=>{
    const c=M.GUARDS.a+M.A.join('')+M.GUARDS.b+M.B.join('')+M.SEAM+M.DOT+M.GUARDS.a.repeat(5)+M.GUARDS.b.repeat(4);
    const r=M.decode(make(c));equal(r.carrier.value,c);equal(r.carrier.status,'exact');
  });
  await test('each lane remains exact after complete removal of the other',()=>{const e=make('body');equal(M.decodeLane(withoutLane(e,'a'),'b').payload,'\uFEFFdifferent\n声音');equal(M.decodeLane(withoutLane(e,'b'),'a').payload,'Lily\t\n\r\0 🐈‍⬛ café 𝒜');});
  await test('corruption, insertion and malformed A tokens do not change B',()=>{const e=make('body');for(const changed of [e.replace(M.GUARDS.a+M.A[0],M.GUARDS.a+M.A[9]),e+M.GUARDS.a,e+tokens('9','a')]){equal(M.decode(changed).a.status,'rejected');equal(M.decode(changed).b.payload,'\uFEFFdifferent\n声音');}});
  await test('corruption and malformed B tokens do not change A',()=>{const e=make('body');for(const changed of [e.replace(M.GUARDS.b+M.B[0],M.GUARDS.b+M.B[9]),e+M.GUARDS.b]){equal(M.decode(changed).b.status,'rejected');equal(M.decode(changed).a.status,'exact');}});
  await test('truncated, duplicated and concatenated streams reject',()=>{const e=make('body');for(const bad of [e.slice(0,-1),e+e]){assert(M.decode(bad).a.status==='rejected'||M.decode(bad).b.status==='rejected');}rejects(()=>M.decodeLane(tokens('03','a'),'a'));});
  await test('invalid header, oversized byte and UTF-8 reject',()=>{
    rejects(()=>M.decodeLane(tokens('03199999900000000000000000000','a'),'a'));
    const good=M.extractDigits(make('body','A','B'),'a');
    rejects(()=>M.decodeLane(tokens(good.slice(0,29)+'999','a'),'a'));
    const crc=String(M.crc32(new Uint8Array([255]))).padStart(10,'0');
    rejects(()=>M.decodeLane(tokens('031000001'+crc+'0000000000'+'255','a'),'a'));
  });
  await test('unsupported lane and non-string/surrogate/size errors reject',()=>{
    for(const fn of [()=>M.encode(''),()=>M.encode('x','\uD800',''),()=>M.encode('\uDC00'),()=>M.decode(3),()=>M.decodeLane(make(),'z'),()=>M.encode('x','🎵'.repeat(20000)),()=>M.encode('x'.repeat(20001))]) rejects(fn);
  });
  await test('NFC / NFD / NFKC / NFKD never silently change payloads',()=>{
    const e=make('𝒜 e\u0301 café');
    for(const form of ['NFC','NFD','NFKC','NFKD']) {const r=M.decode(e.normalize(form));equal(r.a.status,'exact');equal(r.b.status,'exact');equal(r.carrier.status,'changed');}
  });
  await test('20-code-point transport cap preserves generated short units',()=>{
    const p=M.encode('👩🏽‍💻','longer than a single carrier can hold','independent second voice');assert(p.receipt.continuationUnits>0);
    const gs=M.graphemes(p.encoded);assert(gs.every(g=>Array.from(g).length<=20));
    const capped=gs.map(g=>Array.from(g).slice(0,20).join('')).join('');equal(M.decode(capped).a.status,'exact');equal(M.decode(capped).b.status,'exact');
  });
  await test('pre-existing long clusters are preserved and reported',()=>{const c='a'+'\u0301'.repeat(40),p=M.encode(c,'a','b');equal(p.receipt.sourceOversize,1);equal(M.decode(p.encoded).carrier.value,c);});
  await test('plain text is absent/unverified, never guessed',()=>{const r=M.decode('an ordinary whisper 𝔞̍');equal(r.a.status,'absent');equal(r.b.status,'absent');equal(r.carrier.status,'unverified');});
  await test('all catalog, wrappers, symbols and 23 synthetic recipes are usable carriers',()=>{
    const styles=FontGarden.list();assert(styles.length>=78,'missing font registers');
    for(const style of styles){const c=FontGarden.apply(style.id,'Nova keeps Every font. 🐈‍⬛ e\u0301 1️⃣');const r=M.decode(make(c,'A ✧','B 🌙'));equal(r.a.payload,'A ✧');equal(r.b.payload,'B 🌙');equal(r.carrier.value,c);equal(r.carrier.status,'exact');}
  });
  await test('house style uses actual serif-bold vowels and sans consonants',()=>equal(FontGarden.apply('chaos-noodle-ii','Ashwood'),'𝐀𝗌𝗁𝗐𝐨𝐨𝖽'));
  await test('mirror and upside preserve combining, ZWJ, flag and keycap clusters',()=>{
    const source='A e\u0301 👩🏽‍💻 🇯🇵 1️⃣ क्ष 가';
    for(const [style,expected] of [['mirror','가 क्ष 1️⃣ 🇯🇵 👩🏽‍💻 ɘ\u0301 ɒ'],['upside','가 क्ष 1️⃣ 🇯🇵 👩🏽‍💻 ǝ\u0301 ∀']]){
      const carrier=FontGarden.apply(style,source);equal(carrier,expected);
      equal(M.graphemes(carrier).length,M.graphemes(source).length);
      const result=M.decode(make(carrier,'orientation A ✨','orientation B 🐈‍⬛'));
      equal(result.a.payload,'orientation A ✨');equal(result.b.payload,'orientation B 🐈‍⬛');equal(result.carrier.value,expected);equal(result.carrier.status,'exact');
    }
  });
  const preferenceKey='ashwood:zalgo-mux3:register:v1';
  await test('orientation leaves input intact if grapheme segmentation is unavailable',()=>{
    const descriptor=Object.getOwnPropertyDescriptor(Intl,'Segmenter'),source='A e\u0301 👩🏽‍💻 🇯🇵 1️⃣';
    try{Object.defineProperty(Intl,'Segmenter',{configurable:true,value:undefined});for(const style of ['mirror','upside'])equal(FontGarden.apply(style,source),source);}
    finally{Object.defineProperty(Intl,'Segmenter',descriptor);}
  });
  const frameLoad=(iframe,navigate)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('workshop page timeout')),10000);
    iframe.onload=()=>{clearTimeout(timer);resolve();};navigate();
  });
  async function workshop(srcdoc){
    const iframe=document.createElement('iframe');iframe.hidden=true;
    if(srcdoc===undefined)iframe.src='../zalgo-cipher-v3.html';else iframe.srcdoc=srcdoc;
    try{await frameLoad(iframe,()=>document.body.append(iframe));return iframe;}catch(error){iframe.remove();throw error;}
  }
  await test('reload remembers font and plain custom mode, never carrier or either message',async()=>{
    const saved=localStorage.getItem(preferenceKey);localStorage.removeItem(preferenceKey);
    const storageBefore=JSON.stringify(Object.entries(localStorage).sort()),sessionBefore=JSON.stringify(Object.entries(sessionStorage).sort());
    let iframe;
    try{
      iframe=await workshop();
      for(const style of ['wing','plain']){
        const w=iframe.contentWindow,d=w.document;
        for(const [id,value] of [['carrier','private carrier e\u0301 👩🏽‍💻'],['payloadA','private first voice'],['payloadB','private second voice']]){d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new w.Event('input'));}
        d.getElementById('register').value=style;d.getElementById('register').dispatchEvent(new w.Event('input'));d.getElementById('encode').click();
        equal(localStorage.getItem(preferenceKey),style);
        equal(JSON.stringify(Object.entries(localStorage).filter(([key])=>key!==preferenceKey).sort()),storageBefore);
        equal(JSON.stringify(Object.entries(sessionStorage).sort()),sessionBefore);
        await frameLoad(iframe,()=>w.location.reload());
        const reloaded=iframe.contentWindow.document;
        equal(reloaded.getElementById('register').value,style);
        equal(reloaded.getElementById('carrier').value,'the diacritics are now free 🐈‍⬛');
        equal(reloaded.getElementById('payloadA').value,'the archive remembers ✨');
        equal(reloaded.getElementById('payloadB').value,'the cat keeps a second key 🗝️');
        equal(reloaded.getElementById('input').value,'');
        const output=M.decode(reloaded.getElementById('encoded').value);equal(output.a.payload,'the archive remembers ✨');equal(output.b.payload,'the cat keeps a second key 🗝️');
      }
    }finally{iframe?.remove();if(saved===null)localStorage.removeItem(preferenceKey);else localStorage.setItem(preferenceKey,saved);}
  });
  await test('unknown saved font falls back to the default register',async()=>{
    const saved=localStorage.getItem(preferenceKey);let iframe;
    try{localStorage.setItem(preferenceKey,'not-a-catalog-id');iframe=await workshop();equal(iframe.contentWindow.document.getElementById('register').value,'chaos-noodle-ii');}
    finally{iframe?.remove();if(saved===null)localStorage.removeItem(preferenceKey);else localStorage.setItem(preferenceKey,saved);}
  });
  await test('unavailable preference storage does not block initialization or encoding',async()=>{
    const url=new URL('../zalgo-cipher-v3.html',location.href),response=await fetch(url);assert(response.ok);
    const html=(await response.text()).replace('<head>','<head><base href="'+url.href+'"><script>Object.defineProperty(window,"localStorage",{get(){throw new DOMException("disabled","SecurityError")}});</script>');
    const iframe=await workshop(html);
    try{
      const w=iframe.contentWindow,d=w.document;equal(d.getElementById('register').value,'chaos-noodle-ii');
      d.getElementById('register').value='plain';d.getElementById('register').dispatchEvent(new w.Event('input'));
      d.getElementById('carrier').value='👩🏽‍💻 e\u0301';d.getElementById('encode').click();
      const result=M.decode(d.getElementById('encoded').value);equal(result.carrier.value,'👩🏽‍💻 e\u0301');equal(result.a.status,'exact');equal(result.b.status,'exact');equal(d.getElementById('status').textContent,'');
    }finally{iframe.remove();}
  });
  for(const file of ['zalgo-cipher.html','zalgo-cipher-v2.html']) await test('preserved '+file+' actual browser round trip',async()=>{
    const iframe=document.createElement('iframe');iframe.hidden=true;iframe.src='../'+file;
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('legacy page timeout')),10000);iframe.onload=()=>{clearTimeout(timer);resolve();};document.body.append(iframe);});
    try{const w=iframe.contentWindow;w.document.getElementById('hiddenMessage').value='lily';w.document.getElementById('carrierText').value='hi';w.document.getElementById('overlayRatio').value='0';w.encode({silent:true});w.document.getElementById('zalgoInput').value=w.document.getElementById('zalgoOutput').value;w.decode();equal(w.document.getElementById('decodedMessageOutput').value,'lily');}finally{iframe.remove();}
  });
  const report=results.join('\n')+'\n'+results.filter(x=>x.startsWith('PASS')).length+'/'+results.length+' passed';
  document.getElementById('results').textContent=report;
  document.title='ZALGO_TESTS:'+(results.some(x=>x.startsWith('FAIL'))?'fail':'pass')+':'+encodeURIComponent(report);
})();
