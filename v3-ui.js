/* Local workshop; user content is rendered only with textContent/value. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id),styles=FontGarden.list();
  // Authored interface prose only. Never pass carrier, payload or receipt data here.
  const house=text=>String(text).replace(/[A-Za-z]/g,ch=>{const lower=ch.toLowerCase();return String.fromCodePoint(('aeiou'.includes(lower)?0x1D41A:0x1D5BA)+lower.charCodeAt(0)-97);});
  function prose(id,text){const el=$(id);el.removeAttribute('data-literal');el.setAttribute('aria-label',text);el.textContent=house(text);}
  function literal(id,text){const el=$(id);el.removeAttribute('aria-label');el.setAttribute('data-literal','');el.textContent=text;}
  function dressInterface(){
    const walker=document.createTreeWalker(document.querySelector('main'),NodeFilter.SHOW_TEXT,{acceptNode(node){
      return /[A-Za-z]/.test(node.textContent)&&!node.parentElement.closest('script,style,textarea,input,select,pre,code,#carrierPreview,[data-literal],.ui-plain,[aria-hidden="true"]')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){const plain=document.createElement('span'),visible=document.createElement('span');plain.className='ui-plain';plain.textContent=node.textContent;visible.setAttribute('aria-hidden','true');visible.textContent=house(node.textContent);node.replaceWith(visible,plain);}
    document.title=house(document.title);
  }
  for(const s of styles){const option=document.createElement('option');option.value=s.id;option.setAttribute('aria-label',s.name+' · '+s.family);option.textContent=house(s.name+' · '+s.family);$('register').append(option);}
  const registerPreference='ashwood:zalgo-mux3:register:v1';
  $('register').value='chaos-noodle-ii';
  // Remember a catalog ID only. Plain is the custom-carrier mode; its text is never stored.
  try{const saved=localStorage.getItem(registerPreference);if(styles.some(s=>s.id===saved))$('register').value=saved;}catch{/* Storage can be disabled; the workshop still works. */}
  const linkedRegister=new URLSearchParams(location.search).get('register');
  if(styles.some(s=>s.id===linkedRegister))$('register').value=linkedRegister;
  let packet=null;
  function preview(){
    packet=null;$('encoded').value='';
    prose('receipt','source changed · bind both voices again');prose('status','');
    const source=$('carrier').value;
    if(source.length>ZalgoMux.LIMITS.carrier){$('carrierPreview').textContent='';prose('status','Carrier exceeds 20,000 UTF-16 units.');return;}
    const s=styles.find(s=>s.id===$('register').value);
    prose('registerNote',s.role);$('carrierPreview').textContent=FontGarden.apply(s.id,source);
  }
  function guarded(fn){try{fn();prose('status','');}catch(error){prose('status',error.message);}}
  function bind(){packet=null;$('encoded').value='';prose('receipt','No verified inscription · bind both voices after correcting the source.');guarded(()=>{const source=$('carrier').value;if(source.length>ZalgoMux.LIMITS.carrier)throw new Error('Carrier exceeds 20,000 UTF-16 units.');
    packet=ZalgoMux.encode(FontGarden.apply($('register').value,source),$('payloadA').value,$('payloadB').value);
    $('encoded').value=packet.encoded;literal('receipt',JSON.stringify(packet.receipt,null,2));
  });}
  function recover(){for(const id of ['aStatus','bStatus','aOutput','bOutput','carrierStatus','restored'])literal(id,'');guarded(()=>{
    const result=ZalgoMux.decode($('input').value);
    for(const lane of ['a','b']){const value=result[lane];prose(lane+'Status',value.status+(value.reason?' · '+value.reason:''));$(lane+'Status').className=value.status==='exact'?'ok':'bad';literal(lane+'Output',value.payload??'');}
    prose('carrierStatus',result.carrier.status+(result.carrier.reason?' · '+result.carrier.reason:''));
    $('carrierStatus').className=result.carrier.status==='exact'?'ok':'bad';$('restored').textContent=result.carrier.value??'';
  });}
  $('carrier').addEventListener('input',preview);
  $('register').addEventListener('input',()=>{
    try{if(styles.some(s=>s.id===$('register').value))localStorage.setItem(registerPreference,$('register').value);}catch{/* Preferences are optional. */}
    preview();
  });
  for(const id of ['payloadA','payloadB'])$(id).addEventListener('input',()=>{packet=null;$('encoded').value='';prose('receipt','payload changed · bind both voices again');});
  $('encode').onclick=bind;$('decode').onclick=recover;
  $('send').onclick=()=>{if(!packet){prose('status','Bind both voices first.');return;}$('input').value=packet.encoded;recover();$('input').scrollIntoView({block:'center'});};
  $('copy').onclick=async()=>{if(!packet){prose('status','Bind both voices first.');return;}try{await navigator.clipboard.writeText(packet.encoded);prose('status','exact text copied');}catch{$('encoded').focus();$('encoded').select();prose('status','Text selected. Press your normal Copy shortcut.');}};
  $('download').onclick=()=>{if(!packet){prose('status','Bind both voices first.');return;}const url=URL.createObjectURL(new Blob([packet.encoded],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='zalgo-mux-v3.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  dressInterface();preview();bind();
})();
