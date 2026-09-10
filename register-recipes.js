/* Executable interpretations of the recovered synthetic register descriptions.
 * New implementation dated 2026-09-10; examples in the archival JSON remain literal. */
(function(root){
  'use strict';
  const G=root.FontGarden;
  const range=n=>Array.from({length:26},(_,i)=>String.fromCodePoint(n+i));
  const latin='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const italic=range(0x1D434).concat(range(0x1D44E)); italic[33]='ℎ';
  const boldItalic=range(0x1D468).concat(range(0x1D482));
  for(const [id,name,alphabet] of [['italic','Italic',italic],['boldItalic','Bold Italic',boldItalic]]) {
    const table=new Map(Array.from(latin,(c,i)=>[c,alphabet[i]]));
    G.register({id,name,family:'mathematical',role:'exact Unicode letter mapping',mixable:true,baseable:true,
      fn:t=>Array.from(t,c=>table.get(c)??c).join('')});
  }
  const apply=(id,c)=>G.apply(id,c);
  function letters(text,select){let position=0;const seen=new Set();return text.replace(/[A-Za-z]+/g,word=>
    Array.from(word,(c,index)=>{const key=c.toLowerCase();const out=select(c,{position:++position,index,length:word.length,word,seen});seen.add(key);return out;}).join(''));}
  const prime=n=>{if(n<2)return false;for(let d=2;d*d<=n;d++)if(n%d===0)return false;return true;};
  const fibonacci=n=>{let a=1,b=2;while(a<n)[a,b]=[b,a+b];return a===n;};
  const cycle=(ids)=>t=>letters(t,(c,s)=>apply(ids[(s.position-1)%ids.length],c));
  const byWord=ids=>t=>{let word=0;return t.replace(/[A-Za-z]+/g,w=>apply(ids[word++%ids.length],w));};
  const recipes=[
    ['loomstep','Loomstep',cycle(['script','mono'])],
    ['counterloom','Counterloom',cycle(['mono','script'])],
    ['vowelflare','Vowelflare',t=>letters(t,c=>apply(/[aeiou]/i.test(c)?'boldScript':'mono',c))],
    ['iron-vowels','Iron Vowels',t=>letters(t,c=>apply(/[aeiou]/i.test(c)?'double':'boldFraktur',c))],
    ['chaos-noodle-ii','Chaos Noodle II',t=>letters(t,c=>apply(/[aeiou]/i.test(c)?'mathBold':'sansReg',c))],
    ['primewire','Primewire',t=>letters(t,(c,s)=>apply(prime(s.position)?'fraktur':'mono',c))],
    ['fibonacci-bloom','Fibonacci Bloom',t=>letters(t,(c,s)=>apply(fibonacci(s.position)?'boldScript':'sansReg',c))],
    ['triune-relay','Triune Relay',cycle(['script','mono','sansBold'])],
    ['hex-cathedral','Hex Cathedral',cycle(['fraktur','double','mono'])],
    ['wordphase','Wordphase',byWord(['script','mono','sansBold'])],
    ['quartet-bus','Quartet Bus',byWord(['mono','italic','double','boldFraktur'])],
    ['alphabet-rift','Alphabet Rift',t=>letters(t,c=>apply(c.toLowerCase()<='m'?'script':'mono',c))],
    ['threshold-key','Threshold Key',t=>letters(t,(c,s)=>apply(s.index===0?'double':'mono',c))],
    ['cathedral-core','Cathedral Core',t=>letters(t,(c,s)=>apply(s.index===0||s.index===s.length-1?'boldFraktur':'sansReg',c))],
    ['bioluminal-split','Bioluminal Split',t=>letters(t,(c,s)=>apply(s.index<Math.ceil(s.length/2)?'script':'mono',c))],
    ['entangled-mirror','Entangled Mirror',t=>letters(t,(c,s)=>apply(['script','mono','sansBold'][Math.min(s.index,s.length-1-s.index)%3],c))],
    ['echo-memory','Echo Memory',t=>letters(t,(c,s)=>apply(s.seen.has(c.toLowerCase())?'boldScript':'mono',c))],
    ['geminate-scar','Geminate Scar',t=>letters(t,(c,s)=>apply((s.index>0&&s.word[s.index-1].toLowerCase()===c.toLowerCase())||(s.index<s.length-1&&s.word[s.index+1].toLowerCase()===c.toLowerCase())?'boldFraktur':'sansReg',c))],
    ['three-seal-word','Three-Seal Word',t=>letters(t,(c,s)=>apply(s.index===0?'double':s.index===s.length-1?'boldScript':'mono',c))],
    ['third-signal','Third Signal',t=>letters(t,(c,s)=>apply(s.position%3===0?'boldItalic':'mono',c))],
    ['root-access','Root Access',t=>letters(t,c=>({a:'4',e:'3',i:'1',o:'0',u:'µ'}[c.toLowerCase()]??apply('mono',c))).replace(/ /g,'·')],
    ['blacksite-packet','Blacksite Packet',t=>'⟦'+cycle(['mono','sansBold','boldFraktur','double'])(t).replace(/ /g,'::')+'⟧'],
    ['ghost-carrier','Ghost Carrier',t=>letters(t,(c,s)=>apply(['mono','sansReg','boldFraktur'][(s.position-1)%3],c)+(s.position%2===0?'\u0332':s.position%3===0?'\u035F':'')).replace(/ /g,' ⌁ ')]
  ];
  for(const [id,name,fn] of recipes) G.register({id,name,family:'synthetic recipe',role:'new executable interpretation; see register spec',mixable:false,baseable:true,fn});
  G.register({id:'coral-asemic-specimen',name:'Coral Asemic — literal specimen',family:'symbol specimen',
    role:'historical token dictionary missing; preset does not translate your text',mixable:false,baseable:true,
    fn:()=> '⋆ᨒ𓂅﹆ꔛ﹅⋆𓍼 ꕤ⌕ ⋆⌗⋆ଘ ﹆ꕤǂ⋆ ⌕ꕤଘᯅ𓍼 ᯅꕤ ✧⋈ꕤꕤ𓍼⋆ ⌕ǂꕤ﹆'});
  G.register({id:'kaomoji-heart',name:'Kaomoji Heart',family:'wrapper',role:'recovered wrapper idea',mixable:false,baseable:true,
    fn:t=>'(っ◔◡◔)っ ♥ '+t+' ♥'});
  G.register({id:'combining-box',name:'Combining Box',family:'combining mark',role:'new grapheme-aware keycap wrapper',mixable:false,baseable:true,
    fn:t=>Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(t),x=>/^\s+$/.test(x.segment)?x.segment:x.segment+'\u20E3').join('')});
})(globalThis);
