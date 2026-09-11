/* Local workshop; user content is rendered only with textContent/value. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id),styles=FontGarden.list();
  for(const s of styles){const option=document.createElement('option');option.value=s.id;option.textContent=s.name+' · '+s.family;$('register').append(option);}
  const registerPreference='ashwood:zalgo-mux3:register:v1';
  $('register').value='chaos-noodle-ii';
  // Remember a catalog ID only. Plain is the custom-carrier mode; its text is never stored.
  try{const saved=localStorage.getItem(registerPreference);if(styles.some(s=>s.id===saved))$('register').value=saved;}catch{/* Storage can be disabled; the workshop still works. */}
  let packet=null;
  function preview(){
    packet=null;$('encoded').value='';
    const source=$('carrier').value;
    if(source.length>ZalgoMux.LIMITS.carrier){$('status').textContent='Carrier exceeds 20,000 UTF-16 units.';return;}
    const s=styles.find(s=>s.id===$('register').value);
    $('registerNote').textContent=s.role;$('carrierPreview').textContent=FontGarden.apply(s.id,source);
    $('receipt').textContent='source changed · bind both voices again';
  }
  function guarded(fn){try{fn();$('status').textContent='';}catch(error){$('status').textContent=error.message;}}
  function bind(){packet=null;$('encoded').value='';guarded(()=>{const source=$('carrier').value;if(source.length>ZalgoMux.LIMITS.carrier)throw new Error('Carrier exceeds 20,000 UTF-16 units.');
    packet=ZalgoMux.encode(FontGarden.apply($('register').value,source),$('payloadA').value,$('payloadB').value);
    $('encoded').value=packet.encoded;$('receipt').textContent=JSON.stringify(packet.receipt,null,2);
  });}
  function recover(){for(const id of ['aStatus','bStatus','aOutput','bOutput','carrierStatus','restored'])$(id).textContent='';guarded(()=>{
    const result=ZalgoMux.decode($('input').value);
    for(const lane of ['a','b']){const value=result[lane];$(lane+'Status').textContent=value.status+(value.reason?' · '+value.reason:'');$(lane+'Status').className=value.status==='exact'?'ok':'bad';$(lane+'Output').textContent=value.payload??'';}
    $('carrierStatus').textContent=result.carrier.status+(result.carrier.reason?' · '+result.carrier.reason:'');
    $('carrierStatus').className=result.carrier.status==='exact'?'ok':'bad';$('restored').textContent=result.carrier.value??'';
  });}
  $('carrier').addEventListener('input',preview);
  $('register').addEventListener('input',()=>{
    try{if(styles.some(s=>s.id===$('register').value))localStorage.setItem(registerPreference,$('register').value);}catch{/* Preferences are optional. */}
    preview();
  });
  for(const id of ['payloadA','payloadB'])$(id).addEventListener('input',()=>{packet=null;$('encoded').value='';$('receipt').textContent='payload changed · bind both voices again';});
  $('encode').onclick=bind;$('decode').onclick=recover;
  $('send').onclick=()=>{if(!packet){$('status').textContent='Bind both voices first.';return;}$('input').value=packet.encoded;recover();$('input').scrollIntoView({block:'center'});};
  $('copy').onclick=async()=>{if(!packet){$('status').textContent='Bind both voices first.';return;}try{await navigator.clipboard.writeText(packet.encoded);$('status').textContent='exact text copied';}catch{$('encoded').focus();$('encoded').select();$('status').textContent='Text selected. Press your normal Copy shortcut.';}};
  $('download').onclick=()=>{if(!packet){$('status').textContent='Bind both voices first.';return;}const url=URL.createObjectURL(new Blob([packet.encoded],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='zalgo-mux-v3.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  preview();bind();
})();
