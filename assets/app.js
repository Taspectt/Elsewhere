/* Elsewhere 3.1 — relevant visuals, flexible music, motion-first GitHub Pages edition. No AI or developer credentials.
   Third-party services, CORS, catalog and playback policies can change.
   Artist playback always uses visible official service embeds. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = {
    world:$('world'), form:$('form'), prompt:$('prompt'), stack:$('stack'),
    bg:[$('bg0'),$('bg1')],
    bgVideo:[$('bg0').querySelector('.bg-video'), $('bg1').querySelector('.bg-video')],
    bgImage:[$('bg0').querySelector('.bg-image'), $('bg1').querySelector('.bg-image')],
    weather:$('weather'), flash:$('flash'),
    toast:$('toast'), live:$('live'), audio:$('audio'), dock:$('playerDock'),
    playerName:$('playerName'), embed:$('embedSlot'), hint:$('playerHint'),
    spotify:$('spotifyBtn'), apple:$('appleBtn'), next:$('nextBtn'),
    closePlayer:$('closePlayer'), info:$('info'), sources:$('sources'), closeInfo:$('closeInfo')
  };
  const SCENES = {
    rain:'neon', snow:'snow', water:'ocean', forest:'forest', space:'space',
    fire:'desert', neon:'neon', dark:'night', cozy:'cabin', desert:'desert',
    pizza:'pizza', food:'pizza',
    medieval:'cabin', arabic:'desert', default:'night'
  };
  const LEXICON = {
    rain:/\b(rain|rainy|thunder|storm|monsoon|drizzle)\b/i,
    snow:/\b(snow|winter|snowy|blizzard|frost|icy|ice|arctic)\b/i,
    water:/\b(ocean|sea|beach|river|lake|underwater|wave|waves)\b/i,
    forest:/\b(forest|woods|trees?|jungle|nature|mountains?|garden)\b/i,
    space:/\b(space|galaxy|universe|cosmic|stars?|nebula|moon|planets?)\b/i,
    fire:/\b(fire|flames?|embers?|lava|volcano|burning)\b/i,
    neon:/\b(tokyo|cyberpunk|neon|synthwave|arcade|nightcity|futuristic)\b/i,
    dark:/\b(night|midnight|haunted|lonely|dark|gothic|horror|abandoned)\b/i,
    cozy:/\b(cozy|cabin|fireplace|coffee|autumn|cottage|home|warm)\b/i,
    desert:/\b(desert|dunes?|sahara|sand|arabia|arabian|arabic|middle eastern|bedouin)\b/i,
    arabic:/\b(arab|arabian|arabic|saudi|egyptian|khaleeji|oud|maqam)\b/i,
    medieval:/\b(medieval|ancient|castle|knight|viking|fantasy)\b/i,
    jazz:/\b(jazz|blues|saxophone|swing)\b/i,
    sad:/\b(sad|melancholy|nostalgia|lonely|loneliness|wistful|heartbreak)\b/i,
    energy:/\b(party|rave|dance|festival|energetic|happy|celebration)\b/i,
    japan:/\b(japan|japanese|tokyo|kyoto|osaka|anime)\b/i,
    lofi:/\b(lofi|lo-fi|chillhop|study|downtempo)\b/i,
    pizza:/\b(pizza|pizzeria|pepperoni|margherita)\b/i
  };
  const COLOR = {
    rain:['#29485f','#c0d5e6'],snow:['#657e93','#e9f4fa'],water:['#135d76','#9ccbd5'],
    forest:['#245c42','#c7deb0'],space:['#31215d','#b7a2fb'],fire:['#8c3d25','#e0aa7c'],
    neon:['#412f80','#d19cfa'],dark:['#243349','#a6c2dc'],cozy:['#73533c','#e8d2a7'],
    desert:['#8d543b','#e9b691'],arabic:['#765a3a','#f0ca8b'],medieval:['#53513d','#dcd2af'],
    jazz:['#70474f','#e6b493'],sad:['#354e6f','#a4b6c9'],energy:['#9a4265','#e8a6be'],
    japan:['#4a3966','#e2a4c3'],lofi:['#52537c','#b4c5ea'],pizza:['#965035','#f0be77'],default:['#283d56','#abc8dc']
  };
  const FALLBACK = './assets/fallback/';
  const MAX_IMAGES = 28;
  const ST = {
    prompts:[],seq:0,activeBg:0,cats:[],image:null,imagePool:[],imageUsed:new Set(),
    mediaKind:'image',motionPool:[],mode:'pending',mediaTicket:0,visualTicket:0,sceneAt:0,
    lastVideoTime:0,videoStalled:0,videoRetries:0,visualTrackId:'',sceneQuery:'',recentMedia:[],
    evolving:false, musicTier:'',fallbackArtist:'',
    songs:[],index:-1,track:null,artist:null,artistTracks:[],spotifyUrl:'',
    officialUrl:'',officialKind:'',playerSource:'',playerTouched:false,
    muted:false,audioAllowed:false,showingPlayer:false,pending:false,
    recent:loadRecent(),lastQueries:[],searching:false,aborters:[],playing:false,playToken:0
  };
  const setLive = msg => {el.live.textContent=msg;};
  const compact = s => String(s||'').trim().replace(/\s+/g,' ').slice(0,180);
  const wait = t => new Promise(r=>setTimeout(r,t));
  const norm = s => String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  function loadRecent(){try{return JSON.parse(localStorage.getItem('elsewhere_recent_tracks_v2')||'[]').slice(0,35)}catch{return []}}
  function remember(id){if(!id)return;ST.recent=[id,...ST.recent.filter(x=>x!==id)].slice(0,35);try{localStorage.setItem('elsewhere_recent_tracks_v2',JSON.stringify(ST.recent))}catch{}}
  function catsFor(s){return Object.entries(LEXICON).filter(([,re])=>re.test(s)).map(([key])=>key)}
  function hexToRgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
  function blendHex(a,b,p){const A=hexToRgb(a),B=hexToRgb(b);return '#'+A.map((x,i)=>Math.round(x*(1-p)+B[i]*p).toString(16).padStart(2,'0')).join('')}
  function palette(cats){let primary=COLOR[cats[0]||'default'][0],accent=COLOR[cats[0]||'default'][1];for(let i=1;i<Math.min(cats.length,5);i++){const p=COLOR[cats[i]]||COLOR.default;primary=blendHex(primary,p[0],.19);accent=blendHex(accent,p[1],.19)}return [primary,accent]}
  let toastTimeout;
  function toast(msg,ms=2600){clearTimeout(toastTimeout);el.toast.textContent=msg;el.toast.classList.add('show');toastTimeout=setTimeout(()=>el.toast.classList.remove('show'),ms)}
  function safeUrl(s){try{const u=new URL(s);if(u.protocol==='https:')return u.href}catch{}return ''}
  function queryTerms(full,track=null){
    // Never split an artist's name into common nouns: "Frank Ocean" is not "ocean".
    const set=new Set(); const add=x=>{x=compact(x);if(x)set.add(x)};
    if((ST.mode==='artist'||ST.mode==='similar'||ST.mode==='unverified')&&ST.artist){
      if(track?.trackName)add(ST.artist+' '+track.trackName);
      add(full);add(ST.artist);
      add(ST.artist+' concert');
      return [...set].slice(0,4);
    }
    add(full);
    const pieces=ST.prompts.slice(-3);
    const last=pieces.at(-1)||'';
    if(pieces.length>1)add(pieces.slice(-2).join(' '));
    if(last!==full)add(last);
    // Broaden while retaining a substantial piece of the user's own words.
    const words=norm(full).split(' ').filter(w=>w.length>2);
    if(words.length>=3)add(words.slice(-2).join(' '));
    if(words.length>=2)add(words.slice(0,2).join(' '));
    return [...set].slice(0,5);
  }

  async function relatedTerms(q){
    const key=norm(q);const builtin={
      arabian:['arabic','middle eastern'],winter:['snow','cold landscape'],
      nostalgic:['nostalgia','retro'],lonely:['solitude','melancholy'],
      storm:['thunderstorm','rain'],cyberpunk:['neon futuristic','synthwave'],
      medieval:['historic castle','middle ages'],japan:['japanese','tokyo']
    };
    if(builtin[key])return builtin[key];
    // A *single optional* dictionary lookup only after direct searches underperform.
    try{
      const p=new URLSearchParams({ml:q,max:'7'});
      const rows=await json('https://api.datamuse.com/words?'+p,3900);
      return (Array.isArray(rows)?rows:[]).map(r=>r.word).filter(w=>w&&w.length>=3&&w.length<=28&&norm(w)!==key).slice(0,2);
    }catch{return []}
  }
  function audioQueries(full){const q=ST.prompts.at(-1)||full;const s=norm(full);const a=[full];
    if(/\barab(i|ian|ic)|middle eastern|bedouin\b/.test(s))a.push('arabic music','oud music','arabic instrumental','khaleeji');
    else if(/\bmedieval|castle|knight\b/.test(s))a.push('medieval music','medieval instrumental');
    else if(/\bjazz\b/.test(s))a.push('jazz music','smooth jazz');
    else if(/\bcyberpunk|neon\b/.test(s))a.push('synthwave','cyberpunk electronic');
    else if(/\bjapan|tokyo\b/.test(s))a.push('japanese music','japanese ambient');
    else if(/\brain|snow|winter\b/.test(s))a.push('ambient piano','atmospheric instrumental');
    else if(/\bspace|galaxy\b/.test(s))a.push('space ambient','cinematic electronic');
    else if(/\bforest|ocean\b/.test(s))a.push('ambient instrumental','acoustic music');
    else a.push(q+' music',q+' instrumental');
    return [...new Set(a.map(compact))].slice(0,4);
  }
  function setTheme(full){
    let cats=(ST.mode==='artist'||ST.mode==='similar'||ST.mode==='unverified')?[]:catsFor(full);
    if(ST.mode==='artist'||ST.mode==='similar'||ST.mode==='unverified'){
      const g=norm(ST.artistCurrent?.primaryGenreName||'');
      cats=/hip hop|rap|electronic|dance/.test(g)?['neon','dark']:/soul|r b|jazz|blues/.test(g)?['jazz','dark']:/rock/.test(g)?['dark','fire']:['dark'];
      // Scene modifiers still matter, but names should never be parsed as scenery.
      const modifiers=ST.prompts.slice(1).join(' ');
      cats.push(...catsFor(modifiers).filter(c=>!cats.includes(c)));
    }
    ST.cats=cats;
    const [base,accent]=palette(cats);
    document.documentElement.style.setProperty('--t',base);
    document.documentElement.style.setProperty('--a',accent);
    document.documentElement.style.setProperty('--shade',cats.includes('dark')?'rgba(7,9,17,.43)':'rgba(8,12,22,.32)');
    effects.configure(cats);ambient.setMood(cats);
  }

  function fallbackName(){for(const cat of ST.cats)if(SCENES[cat])return SCENES[cat];return SCENES.default}
  function fallbackUrl(){const name=fallbackName();return FALLBACK+name+(name==='pizza'?'.svg':'.jpg')}
  async function preloadImage(url,timeout=5200){
    return new Promise(resolve=>{
      const img=new Image();img.decoding='async';let done=false;
      const finish=ok=>{if(done)return;done=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(ok)};
      const timer=setTimeout(()=>finish(false),timeout);
      img.onload=()=>{if(img.naturalWidth>=420&&img.naturalHeight>=260){if(img.decode)img.decode().then(()=>finish(true)).catch(()=>finish(true));else finish(true)}else finish(false)};
      img.onerror=()=>finish(false);img.src=url;
    });
  }
  const motionFails=new Set();
  function pauseLayer(i){el.bgVideo[i].pause()}
  function stopInactiveVideos(active){for(let i=0;i<el.bgVideo.length;i++)if(i!==active)pauseLayer(i)}
  function releaseVideo(v){
    v.pause();v.onended=null;v.onerror=null;v.onstalled=null;
    v.removeAttribute('src');v.removeAttribute('poster');try{v.load()}catch{}
  }
  function waitVideoFrame(v,timeout=7000){
    return new Promise(resolve=>{
      let finished=false;
      const done=ok=>{if(finished)return;finished=true;clearTimeout(timer);
        v.removeEventListener('loadeddata',ready);v.removeEventListener('error',bad);resolve(ok)};
      const ready=async()=>{
        if((v.videoWidth||0)<360||(v.videoHeight||0)<240){done(false);return}
        try{await v.play();done(!v.error)}catch{done(false)}
      };
      const bad=()=>done(false),timer=setTimeout(()=>done(false),timeout);
      v.addEventListener('loadeddata',ready);v.addEventListener('error',bad);
      if(v.readyState>=2)ready();else try{v.load()}catch{done(false)};
    });
  }
  async function setBackgroundMedia(item,seq,{fast=false}={}){
    if(!item||seq!==ST.seq)return false;
    const ticket=++ST.mediaTicket;
    const type=item.type||'image', next=1-ST.activeBg;
    const layer=el.bg[next],img=el.bgImage[next],vid=el.bgVideo[next];
    let good=false;
    if(type==='video'){
      if(motionFails.has(item.url))return false;
      releaseVideo(vid);
      layer.classList.remove('image-mode','gif-mode');
      layer.classList.add('video-mode');
      // The video itself is loaded in the NEXT hidden layer. No duplicate downloads.
      vid.muted=true;vid.defaultMuted=true;vid.loop=true;vid.playsInline=true;
      vid.preload='auto';vid.poster=item.poster||'';vid.src=item.url;
      good=await waitVideoFrame(vid,fast?4300:7600);
      if(!good)motionFails.add(item.url);
    }else{
      good=await preloadImage(item.url,fast?2500:4800);
      if(good&&ticket===ST.mediaTicket&&seq===ST.seq){
        releaseVideo(vid);
        img.style.backgroundImage=`url(${JSON.stringify(item.url)})`;
        layer.classList.remove('video-mode','image-mode','gif-mode');
        layer.classList.add(type==='gif'?'gif-mode':'image-mode');
      }
    }
    if(!good||seq!==ST.seq||ticket!==ST.mediaTicket){
      if(type==='video')releaseVideo(vid);
      return false;
    }
    // Keep the old scene visible until this scene is demonstrably ready.
    const old=ST.activeBg;
    layer.classList.add('visible');el.bg[old].classList.remove('visible');
    ST.activeBg=next;ST.mediaKind=type;ST.sceneAt=Date.now();
    ST.lastVideoTime=0;ST.videoStalled=0;ST.videoRetries=0;
    effects.setMedia(type);
    if(type==='video'){
      vid.onended=()=>{if(ST.activeBg===next&&vid.currentTime>=0){try{vid.currentTime=0}catch{};vid.play().catch(()=>{})}};
      vid.onerror=()=>{if(ST.activeBg===next&&ST.seq===seq)recoverScene('error')};
    }
    setTimeout(()=>{if(ST.activeBg===next){const oldVid=el.bgVideo[old];if(oldVid.src)releaseVideo(oldVid)}},1000);
    return true;
  }
  async function recoverScene(reason){
    if(ST.evolving||document.hidden)return;
    ST.evolving=true;
    const old=ST.image;
    if(old?.url)motionFails.add(old.url);
    try{const ok=await rerollImage({skipUsed:true});if(!ok){await setBackgroundMedia({type:'image',url:fallbackUrl(),title:'Local atmosphere',source:'Included with Elsewhere'},ST.seq,{fast:true});ST.image=null;refreshCredits()}}finally{ST.evolving=false}
  }
  function monitorVideo(){
    if(document.hidden||ST.mediaKind!=='video')return;
    const v=el.bgVideo[ST.activeBg];if(!v||!v.src)return;
    const time=v.currentTime||0;
    if(!v.paused&&time>ST.lastVideoTime+.07){ST.lastVideoTime=time;ST.videoStalled=0;return}
    if(v.ended){try{v.currentTime=0}catch{};v.play().catch(()=>{});return}
    ST.videoStalled++;
    if(ST.videoStalled===3){ST.videoRetries++;v.play().catch(()=>{});}
    if(ST.videoStalled>=6){
      if(ST.videoRetries<=2){ST.videoStalled=2;v.pause();try{v.currentTime=Math.max(0,v.currentTime-.25)}catch{};v.play().catch(()=>{})}
      else recoverScene('stalled');
    }
  }

  const memoryCache=new Map();
  async function json(url,ms=6000){
    if(memoryCache.has(url)){const v=memoryCache.get(url);if(Date.now()-v.at<300000)return v.data;memoryCache.delete(url)}
    const controller=new AbortController(), t=setTimeout(()=>controller.abort(),ms);ST.aborters.push(controller);
    try{const r=await fetch(url,{mode:'cors',signal:controller.signal,cache:'default'});if(!r.ok)throw new Error('HTTP '+r.status);
      const data=await r.json();memoryCache.set(url,{at:Date.now(),data});if(memoryCache.size>100)memoryCache.delete(memoryCache.keys().next().value);return data;
    }finally{clearTimeout(t);ST.aborters=ST.aborters.filter(x=>x!==controller)}
  }
  function abortOld(){for(const a of ST.aborters)a.abort();ST.aborters=[]}
  function licOK(license){const l=norm(license);return l==='cc0'||l==='by'||l==='by sa'||l==='pdm'||l==='public domain'||l==='public domain mark'||l==='cc by'||l==='cc by sa'}
  function commonsLicenseOK(s){const l=String(s||'').toLowerCase();if(/non.?commercial|no.?deriv|\bnc\b|\bnd\b/.test(l))return false;return /(cc[ -]?by|cc[ -]?zero|cc0|public domain|\bpd[ -]|pdm|gfdl|gnu free documentation|free art license|copyrighted free use)/.test(l)}
  function imageCandidate(i,source){
    const url=safeUrl(i.thumburl||i.url);if(!url)return null;
    return {id:i.id||url,url,title:i.title||'',creator:i.creator||'',license:i.license||'License indicated on source',licenseUrl:safeUrl(i.license_url||''),page:safeUrl(i.foreign_landing_url||i.descriptionurl||''),source, width:Number(i.width||1200),height:Number(i.height||750)};
  }
  function mediaCandidate(i,source,type='image'){
    const url=safeUrl(i.url||i.thumburl);if(!url)return null;
    const poster=safeUrl(i.poster||i.thumburl||'');
    return {id:i.id||url,url,poster,title:i.title||'',creator:i.creator||'',license:i.license||'License indicated on source',licenseUrl:safeUrl(i.license_url||''),page:safeUrl(i.foreign_landing_url||i.descriptionurl||''),source, width:Number(i.width||1280),height:Number(i.height||720), type};
  }
  async function commonsMotion(q){
    const queries=[q+' filetype:video',q+' filetype:bitmap'];
    const results=await Promise.allSettled(queries.map(async query=>{
      const out=[];
      const p=new URLSearchParams({action:'query',format:'json',origin:'*',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'16',prop:'imageinfo|videoinfo',iiprop:'url|mime|size|extmetadata',viprop:'url|mime|size|extmetadata|derivatives',iiurlwidth:'1200'});
      const d=await json('https://commons.wikimedia.org/w/api.php?'+p,7200).catch(()=>null);
      const pages=Object.values(d?.query?.pages||{});
      for(const pg of pages){
        const inf=pg.videoinfo?.[0]||pg.imageinfo?.[0]; if(!inf) continue;
        const mime=String(inf.mime||'').toLowerCase();
        const lic=inf.extmetadata?.LicenseShortName?.value||'';
        if(!commonsLicenseOK(lic)) continue;
        const author=String(inf.extmetadata?.Artist?.value||'').replace(/<[^>]*>/g,' ').replace(/&[^;]{1,15};/g,' ').replace(/\s+/g,' ').trim().slice(0,160);
        if(/^video\/(webm|ogg|mp4)$/.test(mime)){
          if((inf.size||0)>65*1024*1024)continue;
          if((inf.width||0)<480||(inf.height||0)<300) continue;
          const derivatives=(inf.derivatives||[]).filter(x=>/^video\/webm/.test(x.type||x.mime||'')&&x.src);
          const best=derivatives.filter(x=>(x.height||0)>=360&&(x.height||0)<=1080).sort((a,b)=>(a.height||0)-(b.height||0))[0];
          const item=mediaCandidate({id:'commons-motion:'+pg.pageid,url:best?.src||inf.url,poster:inf.thumburl,width:inf.width,height:inf.height,title:pg.title.replace(/^File:/,''),creator:author||'Wikimedia Commons contributor',license:lic||'See source',license_url:inf.extmetadata?.LicenseUrl?.value,descriptionurl:inf.descriptionurl},'Wikimedia Commons','video');
          if(item) out.push(item);
        } else if(mime==='image/gif') {
          if((inf.size||0)>15*1024*1024)continue;
          if((inf.width||0)<550||(inf.height||0)<300) continue;
          const item=mediaCandidate({id:'commons-gif:'+pg.pageid,url:inf.url,width:inf.width,height:inf.height,title:pg.title.replace(/^File:/,''),creator:author||'Wikimedia Commons contributor',license:lic||'See source',license_url:inf.extmetadata?.LicenseUrl?.value,descriptionurl:inf.descriptionurl},'Wikimedia Commons','gif');
          if(item) out.push(item);
        }
      }
      return out;
    }));
    return results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
  }
  async function commonsImages(q){
    const p=new URLSearchParams({action:'query',format:'json',origin:'*',generator:'search',gsrsearch:q+' filetype:bitmap',gsrnamespace:'6',gsrlimit:'24',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'1680'});
    const d=await json('https://commons.wikimedia.org/w/api.php?'+p,6800);
    return Object.values(d.query?.pages||{}).flatMap(p=>{
      const inf=p.imageinfo?.[0];if(!inf||!/^image\/(jpeg|png|webp)$/.test(inf.mime||''))return [];
      if((inf.width||0)<640||(inf.height||0)<360)return [];
      const lic=inf.extmetadata?.LicenseShortName?.value||'';
      if(!commonsLicenseOK(lic))return [];
      const author=String(inf.extmetadata?.Artist?.value||'').replace(/<[^>]*>/g,' ').replace(/&[^;]{1,15};/g,' ').replace(/\s+/g,' ').trim().slice(0,160);
      const src=imageCandidate({id:'commons:'+p.pageid,thumburl:inf.thumburl||inf.url,width:inf.thumbwidth||inf.width,height:inf.thumbheight||inf.height,title:p.title.replace(/^File:/,''),creator:author||'Wikimedia Commons contributor',license:lic||'See source',license_url:inf.extmetadata?.LicenseUrl?.value,descriptionurl:inf.descriptionurl},'Wikimedia Commons');
      return src?[src]:[];
    });
  }
  async function openverseImages(q){
    const p=new URLSearchParams({q,page_size:'30',mature:'false'});
    const d=await json('https://api.openverse.org/v1/images/?'+p,7200);
    return (d.results||[]).flatMap(i=>{
      if(!licOK(i.license)||(i.width||0)<600||(i.height||0)<350)return [];
      if(i.width/i.height<.9)return [];
      // Prefer reasonably sized originals. Openverse thumbnails may be tiny.
      const full=Number(i.width)<3500?safeUrl(i.url):'';
      const url=full||safeUrl(i.thumbnail)||safeUrl(i.url);
      const item=imageCandidate({...i,url},'Openverse');return item?[item]:[];
    });
  }
  const STOP_VISUAL=new Set(['with','and','the','this','that','from','into','then','plus','vibe','vibes','music','song','songs','like','feeling','aesthetic']);
  function visualWords(q){return norm(q).split(' ').filter(x=>x.length>2&&!STOP_VISUAL.has(x))}
  function tokenMatches(word,hay){const synonyms={rainy:['rain'],arabian:['arabic','arab','middle eastern'],arabic:['arab','arabian'],snowy:['snow'],japanese:['japan'],medieval:['castle','middle ages'],nostalgic:['nostalgia'],cyberpunk:['neon','futuristic']};return hay.includes(word)||(synonyms[word]||[]).some(x=>hay.includes(x))}
  function scoreMedia(item,q){
    const hay=norm(item.title+' '+(item.creator||''));
    const words=visualWords(q),exact=norm(q);
    let relevance=0;
    if(ST.mode==='artist'||ST.mode==='similar'||ST.mode==='unverified'){
      // Explicit full name is mandatory. Never map "Ocean" to a storm.
      const artist=norm(ST.artist||musicSubject());
      if(!hay.includes(artist))return -999;
      relevance+=70;
      if(ST.artistCurrent?.trackName&&hay.includes(norm(ST.artistCurrent.trackName)))relevance+=13;
      const extra=ST.prompts.slice(1).flatMap(visualWords);
      relevance+=Math.min(12,extra.filter(t=>hay.includes(t)).length*4);
    }else{
      if(!words.length)return -999;
      const anchors=visualWords(ST.prompts[0]||q);
      if(anchors.length&&!anchors.some(w=>tokenMatches(w,hay)))return -999;
      const hits=words.filter(w=>tokenMatches(w,hay));
      const ratio=hits.length/words.length;
      if(!hits.length)return -999;
      // Keep an anchor for combined terms, but don't demand every adjective.
      relevance=hits.length*15+ratio*18;
      if(exact&&hay.includes(exact))relevance+=32;
      if(words.length>1&&ratio<.5)relevance-=16;
    }
    if(item.width/item.height>=1.3)relevance+=4;
    if(item.type==='video')relevance+=11;
    else if(item.type==='gif')relevance+=6;
    if(ST.imageUsed.has(item.id))relevance-=17;
    return relevance;
  }
  async function imageSearch(full,seq,track=null){
    const ticket=++ST.visualTicket;
    const queries=queryTerms(full,track);ST.lastQueries=queries;
    const pool=[],seen=new Set();
    const add=items=>{for(const item of items||[])if(item&&!seen.has(item.id)){seen.add(item.id);pool.push(item)}};
    let provisional=null;
    async function showEarlyStill(){
      if(provisional||seq!==ST.seq||ticket!==ST.visualTicket)return;
      // Show an exact relevant photograph quickly rather than waiting for a long video API call.
      const stills=pool.filter(i=>i.type!=='video'&&scoreMedia(i,full)>=14)
        .sort((a,b)=>scoreMedia(b,full)-scoreMedia(a,full)).slice(0,4);
      for(const candidate of stills){
        if(seq!==ST.seq||ticket!==ST.visualTicket)return;
        if(await setBackgroundMedia(candidate,seq)){
          provisional=candidate;ST.image=candidate;ST.imageUsed.add(candidate.id);
          ST.sceneQuery=queries[0]||full;refreshCredits();return;
        }
      }
    }
    for(let i=0;i<Math.min(queries.length,4)&&seq===ST.seq&&ticket===ST.visualTicket;i++){
      const q=queries[i];
      // Start both types together, but do NOT let video search delay ordinary photos.
      const motion=commonsMotion(q).catch(()=>[]);
      const stills=await Promise.allSettled([commonsImages(q),openverseImages(q)]);
      for(const p of stills)if(p.status==='fulfilled')add(p.value);
      if(!provisional)await showEarlyStill();
      if(seq!==ST.seq||ticket!==ST.visualTicket)return;
      add(await motion);
      const matching=pool.filter(m=>scoreMedia(m,full)>0);
      if(matching.some(x=>x.type==='video')&&matching.length>=2)break;
      if(i>=1&&matching.length>=3)break;
      if((ST.mode==='artist'||ST.mode==='similar')&&i>=1&&matching.length>=1)break;
    }
    if(seq!==ST.seq||ticket!==ST.visualTicket)return;
    let ranked=pool.filter(x=>scoreMedia(x,full)>=14);
    if(!ranked.length&&ST.mode==='vibe'){
      const synonyms=(await relatedTerms(ST.prompts.at(-1)||full)).slice(0,2);
      for(const term of synonyms){
        if(seq!==ST.seq||ticket!==ST.visualTicket)break;
        const parts=await Promise.allSettled([commonsImages(term),openverseImages(term),commonsMotion(term)]);
        for(const p of parts)if(p.status==='fulfilled')add(p.value);
      }
      ranked=pool.filter(x=>scoreMedia(x,full)>=14);
    }
    if(seq!==ST.seq||ticket!==ST.visualTicket)return;
    ST.imagePool=ranked.sort((a,b)=>scoreMedia(b,full)-scoreMedia(a,full)).slice(0,MAX_IMAGES);
    // The photo already on-screen is valid. Upgrade it only if the candidate is better.
    const currentScore=provisional?scoreMedia(provisional,full):-Infinity;
    for(const item of ST.imagePool.slice(0,12)){
      if(seq!==ST.seq||ticket!==ST.visualTicket)return;
      if(motionFails.has(item.url)||item.id===provisional?.id)continue;
      if(provisional&&scoreMedia(item,full)<=currentScore+3)continue;
      const ok=await setBackgroundMedia(item,seq);
      if(ok){ST.image=item;ST.imageUsed.add(item.id);ST.sceneQuery=queries[0]||full;
        setLive(`Found ${item.type||'image'} matching ${full}`);refreshCredits();return}
    }
    if(seq===ST.seq)setLive(provisional?'Relevant image displayed.':'No matching online background available; showing the local fallback.');
    refreshCredits();
  }

  const CULTURAL=new Set(['arabian','arabic','arab','brazil','brazilian','japan','japanese','india','indian','african','korean','spanish','latin','medieval','cyberpunk','jazz','christmas','winter','spring','summer','autumn','rain','snow','forest','space','desert','nostalgia','lofi','lo fi','country','metal','house','rock','blues','ambient','tokyo','kyoto','osaka','paris','london','rome','new york']);
  function musicSubject(){
    const first=ST.prompts[0]||'';
    // Preserve whole named-entity input when first prompt is "Steve Lacy".
    const stripped=compact(first).replace(/\s*\+\s*/g,' ').replace(/\b(and|with|plus|rain|rainy|night|space|vibes?|snow|storm|jazz)\b/gi,' ').replace(/\s+/g,' ').trim();
    return stripped||first;
  }
  function looksLikeName(s){
    const key=norm(s);
    if(RELATED_ARTISTS[key])return true;
    // Visual subjects with clear object/place meaning are not musician names.
    if(/\b(pizza|pizzeria|pepperoni|margherita|forest|tokyo|snow|rain|rainy|beach|desert|coffee|food|cabin|mountain|sunset|sunrise|castle|garden|city|street|cat|dog|oceanfront)\b/.test(key))return false;
    const w=key.split(' ');
    if(w.length<2||w.length>4)return false;
    if(catsFor(s).length>1)return false;
    return !w.some(x=>['rainy','winter','tokyo','medieval','arabian','japanese','music','cyberpunk','sunset','forest','sunrise','mountain','city','cozy','night','lofi','horror','desert','ocean','space'].includes(x));
  }
  // Explicit related-artist fallbacks are only used if an exact artist has no playable catalog entries.
  // These are search seeds, not claims that a given artist sounds identical.
  const RELATED_ARTISTS={
    'travis scott':{artists:['Don Toliver','Future','Young Thug'],genres:['psychedelic trap','trap hip hop','atmospheric hip hop']},
    'steve lacy':{artists:['Omar Apollo','Daniel Caesar','The Internet'],genres:['indie soul','alternative r&b','neo soul']},
    'frank ocean':{artists:['Daniel Caesar','SZA','Blood Orange'],genres:['alternative r&b','dreamy soul','neo soul']},
    'the weeknd':{artists:['PARTYNEXTDOOR','Tory Lanez','Bryson Tiller'],genres:['dark r&b','alternative r&b','synth pop']},
    'drake':{artists:['PARTYNEXTDOOR','Future','J. Cole'],genres:['melodic rap','hip hop','r&b']},
    'playboi carti':{artists:['Lil Uzi Vert','Ken Carson','Destroy Lonely'],genres:['rage rap','trap hip hop']},
    'tyler the creator':{artists:['Kali Uchis','Childish Gambino','Steve Lacy'],genres:['alternative hip hop','neo soul']},
    'kendrick lamar':{artists:['J. Cole','Baby Keem','Isaiah Rashad'],genres:['conscious hip hop','rap']},
    'billie eilish':{artists:['Lorde','Clairo','Lana Del Rey'],genres:['alternative pop','indie pop']},
    'lana del rey':{artists:['Mitski','Lorde','Faye Webster'],genres:['dream pop','indie folk']}
  };
  function fallbackPlan(subject,results=[]){
    const key=norm(subject),known=RELATED_ARTISTS[key];
    if(known)return known;
    // Query returned artist/genre context can serve as a fallback when a new artist isn't hardcoded.
    const genre=results.find(r=>r.primaryGenreName)?.primaryGenreName||'';
    const generic=/rock/i.test(genre)?'alternative rock':/soul|r&b/i.test(genre)?'indie soul':/rap|hip hop/i.test(genre)?'melodic hip hop':/electronic|dance/i.test(genre)?'electronic music':'alternative music';
    return {artists:[],genres:[generic,'instrumental music']};
  }
  function playableArtistTracks(tracks,name){
    const seen=new Set();return tracks.filter(t=>{
      if(norm(t.artistName)!==norm(name)||!albumEmbed(t))return false;
      const key=norm(t.trackName);if(seen.has(key))return false;seen.add(key);return true;
    });
  }
  async function relatedOfficialTracks(subject,results,seq){
    const plan=fallbackPlan(subject,results);
    // Three diverse artists checked concurrently; the user-specified artist remains the visual anchor.
    const searches=await Promise.allSettled(plan.artists.slice(0,3).map(a=>appleSearch(a)));
    if(seq!==ST.seq)return {tracks:[],plan};
    const seen=new Set(),all=[];
    searches.forEach((row,i)=>{
      if(row.status!=='fulfilled')return;
      for(const track of playableArtistTracks(row.value,plan.artists[i])){
        const key=norm(track.artistName+' '+track.trackName);
        if(!seen.has(key)){seen.add(key);all.push(track)}
      }
    });
    const fresh=all.filter(t=>!ST.recent.includes('apple:'+t.trackId));
    return {tracks:(fresh.length?fresh:all).slice(0,45),plan};
  }
  async function appleSearch(term){
    const p=new URLSearchParams({term,media:'music',entity:'song',limit:'100',country:'US'});
    const d=await json('https://itunes.apple.com/search?'+p,7600);
    return (d.results||[]).filter(x=>x.kind==='song'&&x.trackId&&x.trackViewUrl&&x.artistName);
  }

  function albumEmbed(track){
    const src=safeUrl(track.trackViewUrl);if(!src)return '';
    const u=new URL(src);
    if(!['music.apple.com','itunes.apple.com'].includes(u.hostname))return '';
    return 'https://embed.music.apple.com'+u.pathname+u.search;
  }
  function recognizeArtist(tracks,subject){
    const target=norm(subject);if(!target||CULTURAL.has(target))return [];
    const seen=new Set();
    return tracks.filter(t=>{
      if(norm(t.artistName)!==target)return false;
      const key=norm(t.trackName);if(seen.has(key))return false;
      seen.add(key);return !!albumEmbed(t);
    });
  }

  function spotifyLink(s){
    try{const u=new URL(s);if(!['open.spotify.com','spotify.com'].includes(u.hostname))return '';
      const m=u.pathname.match(/^\/(artist|track|playlist|album)\/([A-Za-z0-9]{10,40})/);return m?`https://open.spotify.com/embed/${m[1]}/${m[2]}`:'';
    }catch{return ''}
  }
  function youtubeLink(s){
    try{const u=new URL(s);let id='';if(u.hostname==='youtu.be')id=u.pathname.slice(1);
      else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.searchParams.get('v')||u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/)?.[1]||'';
      return /^[a-zA-Z0-9_-]{11}$/.test(id)?'https://www.youtube-nocookie.com/embed/'+id:'';
    }catch{return ''}
  }
  async function findSpotifyArtist(name,seq){
    try{
      const p=new URLSearchParams({query:`artist:"${name.replace(/"/g,'')}"`,fmt:'json',limit:'3'});
      const d=await json('https://musicbrainz.org/ws/2/artist/?'+p,6800);
      const found=(d.artists||[]).find(a=>norm(a.name)===norm(name));if(!found||seq!==ST.seq)return;
      // MusicBrainz requests have an approximately one-request/second guideline.
      await wait(1070);if(seq!==ST.seq)return;
      const detail=await json(`https://musicbrainz.org/ws/2/artist/${encodeURIComponent(found.id)}?inc=url-rels&fmt=json`,6800);
      const relation=(detail.relations||[]).find(r=>spotifyLink(r.url?.resource));
      if(seq!==ST.seq||!relation)return;
      ST.spotifyUrl=spotifyLink(relation.url.resource);
      el.spotify.hidden=false;
      // Keep Apple playback uninterrupted if the visitor has selected it.
      // Spotify artist embeds are optional, never auto-replace the exact Apple track.
    }catch{ /* Spotify lookup is optional; Apple Music embeds still work. */ }
  }
  function pickArtistTrack(){if(!ST.artistTracks.length)return null;let candidates=ST.artistTracks.filter(t=>!ST.recent.includes('apple:'+t.trackId));
    if(!candidates.length)candidates=ST.artistTracks;
    return candidates[0]||ST.artistTracks[0];
  }
  function showOfficialPlayer(source){
    if(!ST.artistTracks.length&&!ST.spotifyUrl&&!ST.officialUrl)return;
    const s=source==='spotify'&&ST.spotifyUrl?'spotify':source==='youtube'&&ST.officialKind==='youtube'?'youtube':'apple';
    ST.playerSource=s;ST.showingPlayer=true;el.dock.hidden=false;el.spotify.hidden=!ST.spotifyUrl;el.apple.hidden=!ST.artistTracks.length;
    el.spotify.classList.toggle('selected',s==='spotify');el.apple.classList.toggle('selected',s==='apple');
    el.next.hidden=s!=='apple';el.playerName.textContent=ST.artist||'Your music';
    let url='',height=155;
    if(s==='spotify'){url=ST.spotifyUrl;height=152}
    else if(s==='youtube'){url=ST.officialUrl;height=220}
    else {
      let track=ST.artistCurrent;
      if(!track)track=ST.artistCurrent=pickArtistTrack();
      if(track){url=albumEmbed(track);el.playerName.textContent=track.artistName+' — '+track.trackName;remember('apple:'+track.trackId)}
      height=175;
    }
    if(!url)return;
    // Official playback MUST be visible. Do not overlay or extract its audio.
    el.embed.replaceChildren();const iframe=document.createElement('iframe');
    iframe.title=s==='spotify'?'Spotify music player':s==='youtube'?'YouTube video player':'Apple Music player';
    iframe.src=url;iframe.height=height;iframe.loading='eager';
    iframe.allow='autoplay; encrypted-media; fullscreen; clipboard-write; picture-in-picture';
    iframe.referrerPolicy='strict-origin-when-cross-origin';el.embed.appendChild(iframe);
    el.hint.textContent=s==='youtube'?'Play inside YouTube’s visible player.':
      s==='spotify'?'Spotify artist player; selection may differ from the selected song.':
      ST.mode==='similar' ? `Similar artist, not ${ST.artist}. Press Play; availability depends on your account.` :
      'Press Play in Apple Music. Full playback depends on your account.';
    stopOpenMusic();ambient.gainTo(0);refreshCredits();setLive('Official '+(s==='spotify'?'Spotify':s==='apple'?'Apple Music':'YouTube')+' player loaded. Press its Play control.');
  }
  function closeOfficial(){ST.showingPlayer=false;el.dock.hidden=true;el.embed.replaceChildren();if(!ST.muted)ambient.gainTo(.018);}
  function maybeEmbeddedLink(s){const spot=spotifyLink(s),yt=youtubeLink(s);if(!spot&&!yt)return false;
    ST.artist='Music link';ST.spotifyUrl=spot;ST.officialUrl=yt;ST.officialKind=spot?'spotify':'youtube';ST.artistTracks=[];
    showOfficialPlayer(spot?'spotify':'youtube');return true;
  }
  function validAudioLicense(i){const lic=norm(i.license);return licOK(lic)&&!i.mature}
  function songID(item){return item.source+':'+(item.id||norm(item.artist+'-'+item.title))}
  function cleanSongs(arr){const seen=new Set();return arr.filter(x=>{
    const name=norm((x.artist||'')+' '+(x.title||''));const key=name||songID(x);
    if(!x.src||seen.has(key))return false;seen.add(key);return true;
  })}
  async function audiusSearch(q){
    const p=new URLSearchParams({query:q,app_name:'elsewhere-web',limit:'25'});
    const d=await json('https://api.audius.co/v1/tracks/search?'+p,7400);
    return (d.data||[]).flatMap(t=>{
      if(!t.id||!t.title||t.is_streamable===false||t.duration<50||t.duration>1500)return [];
      const artist=t.user?.name||t.user?.handle||'Audius artist';
      return [{id:t.id,src:`https://api.audius.co/v1/tracks/${encodeURIComponent(t.id)}/stream?app_name=elsewhere-web`,title:t.title,artist,
        source:'Audius',license:'Creator-streamed on Audius',page:safeUrl(t.permalink?'https://audius.co'+t.permalink:''),duration:t.duration}];
    });
  }
  async function openverseMusic(q){
    const p=new URLSearchParams({q,page_size:'30',mature:'false',category:'music'});
    const d=await json('https://api.openverse.org/v1/audio/?'+p,7400);
    return (d.results||[]).flatMap(t=>{
      if(!validAudioLicense(t)||!t.url)return [];
      const src=safeUrl(t.url);if(!src)return [];
      // Avoid obvious non-audio links. Extension-free Jamendo files are allowed.
      if(/\.(pdf|zip|flac|mid|midi)(?:\?|$)/i.test(src))return [];
      const duration=Number(t.duration||0)/1000;
      if(duration>0&&(duration<50||duration>1600))return [];
      if((t.category||'')==='sound_effect')return [];
      return [{id:t.id,src,title:t.title||'Untitled composition',artist:t.creator||'Unknown creator',
        source:'Openverse',license:t.license,licenseUrl:safeUrl(t.license_url),page:safeUrl(t.foreign_landing_url),duration}];
    });
  }
  function rankAudio(song,query){
    const tokens=norm(query).split(' ').filter(x=>x.length>2),hay=norm(song.title+' '+song.artist);
    const hits=tokens.filter(t=>tokenMatches(t,hay)||
      (t==='arabian'&&/\b(oud|maqam|khaleeji)\b/.test(hay)));
    if(!hits.length)return -999;
    let score=hits.length*13+(hay.includes(norm(query))?22:0);
    if(song.duration>=110&&song.duration<640)score+=5;
    if(ST.recent.includes(songID(song)))score-=70;
    if(/field recording|sound effect|loop test|ringtone|voice message|podcast|interview/i.test(song.title))score-=25;
    return score;
  }
  async function freeMusicSearch(full,seq,{queries=null,allowNear=false}={}){
    const terms=[...new Set((queries||audioQueries(full)).map(compact).filter(Boolean))].slice(0,6);
    const found=[];
    for(let i=0;i<terms.length&&seq===ST.seq;i++){
      const results=await Promise.allSettled([audiusSearch(terms[i]),openverseMusic(terms[i])]);
      for(const r of results)if(r.status==='fulfilled')found.push(...r.value);
      if(found.length>=32)break;
    }
    if(seq!==ST.seq)return [];
    const candidates=cleanSongs(found).map(song=>({song,score:Math.max(...terms.map((q,index)=>rankAudio(song,q)-(index*2)))}));
    candidates.sort((a,b)=>b.score-a.score);
    // Fallback is allowed to relax exact artist matching, but never play arbitrary podcast clips.
    return candidates.filter(x=>x.score>(allowNear?-15:0)).map(x=>x.song).slice(0,60);
  }

  async function playArtistFallback(subject,appleResults,seq){
    ST.mode='similar';ST.artist=subject;ST.musicTier='related';
    setTheme(buildContext());
    // Run visual discovery concurrently; the original artist is still the visual subject.
    const visual=imageSearch(buildContext(),seq).catch(()=>{});
    const {tracks,plan}=await relatedOfficialTracks(subject,appleResults,seq);
    if(seq!==ST.seq)return;
    if(tracks.length){
      ST.artistTracks=tracks;ST.artistCurrent=pickArtistTrack();
      ST.fallbackArtist=ST.artistCurrent?.artistName||'';
      showOfficialPlayer('apple');
      el.hint.textContent=`Similar artist: ${ST.artistCurrent.artistName}. Original ${subject} tracks were unavailable.`;
      setLive(`Playing a related artist: ${ST.artistCurrent.artistName} (not ${subject}).`);
    }else{
      // Openly available genre recordings are the last resort, not a fake verified artist hit.
      const terms=[...plan.genres,subject+' type beat',subject+' inspired instrumental'];
      ST.songs=await freeMusicSearch(subject,seq,{queries:terms,allowNear:true}).catch(()=>[]);
      if(seq!==ST.seq)return;
      if(ST.songs.length&&!ST.muted){ST.musicTier='genre';await playNext(seq)}
      else {ST.musicTier='ambient';ambient.gainTo(.015);setLive('No licensed recording available; atmospheric audio continues.');}
    }
    await visual;
    refreshCredits();
  }

  function stopOpenMusic(){el.audio.pause();el.audio.removeAttribute('src');el.audio.load();ST.track=null;}
  async function playNext(seq=ST.seq){
    if(seq!==ST.seq||ST.showingPlayer||ST.muted)return;
    const token=++ST.playToken;
    if(!ST.songs.length){ambient.gainTo(.012);return;}
    const unsung=ST.songs.filter(t=>!ST.recent.includes(songID(t)));
    const pool=unsung.length?unsung:ST.songs;
    const top=pool.slice(0,Math.min(pool.length,14));
    ST.playing=true;
    try {
      let attempted=0;
      while(attempted++<Math.min(top.length,4)&&seq===ST.seq&&token===ST.playToken){
        const i=Math.floor(Math.random()*top.length),track=top.splice(i,1)[0];if(!track)break;
        stopOpenMusic();ST.track=track;el.audio.src=track.src;el.audio.volume=.74;
        try {
          await Promise.race([
            el.audio.play(),
            wait(5500).then(()=>{throw new Error('media timeout')})
          ]);
          if(seq!==ST.seq||token!==ST.playToken){el.audio.pause();return}
          remember(songID(track));ambient.gainTo(.003);
          setLive('Playing '+track.title+' by '+track.artist);
          refreshCredits();return;
        } catch(error){
          if(error?.name==='NotAllowedError'){
            ST.audioAllowed=false;setLive('Tap the page to allow audio.');toast('Tap anywhere to enable music',3400);return;
          }
        }
      }
      ST.track=null;ambient.gainTo(.02);
      setLive('No playable track found. Ambient sound is available.');refreshCredits();
    } finally {if(token===ST.playToken)ST.playing=false}
  }

  async function discoverMusic(full,seq){
    const subject=musicSubject(),likelyArtist=looksLikeName(subject)||!!RELATED_ARTISTS[norm(subject)];
    // Everyday subjects should display imagery immediately, regardless of music-search latency.
    if(!likelyArtist){
      ST.mode='vibe';setTheme(full);
      // Change the local scene immediately so common subjects never remain on neutral night.
      await setBackgroundMedia({type:'image',url:fallbackUrl(),title:'Local subject fallback',source:'Included with Elsewhere'},seq,{fast:true});
      if(seq!==ST.seq)return;
      const visual=imageSearch(full,seq).catch(()=>{});
      const music=freeMusicSearch(full,seq).catch(()=>[]);
      const songs=await music;
      if(seq!==ST.seq)return;
      ST.songs=songs;ST.musicTier=songs.length?'matched':'ambient';
      if(songs.length&&!ST.muted)await playNext(seq);
      else if(!songs.length)ambient.gainTo(.015);
      await visual;refreshCredits();return;
    }
    let results=[];
    try{results=await appleSearch(subject)}catch{}
    if(seq!==ST.seq)return;
    const exact=recognizeArtist(results,subject);
    if(exact.length){
      ST.mode='artist';ST.musicTier='exact';ST.artist=exact[0].artistName;
      ST.artistTracks=exact;ST.artistCurrent=pickArtistTrack();ST.spotifyUrl='';ST.playerTouched=false;
      setTheme(full);showOfficialPlayer('apple');
      // Keep the requested artist's name intact for visual search, even if the title contains common nouns.
      const visual=imageSearch(full,seq,ST.artistCurrent).catch(()=>{});
      findSpotifyArtist(ST.artist,seq);
      await visual;return;
    }
    // A real music result may be unavailable or API-blocked; do not stop the entire scene.
    await playArtistFallback(subject,results,seq);
  }

  const ambient={ac:null,noise:null,noiseGain:null,filter:null,active:false,mood:[],
    activate(){if(ST.muted)return;try{
      if(!this.ac){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
        const ac=this.ac=new AC();const buffer=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);
        const d=buffer.getChannelData(0);let x=0;for(let i=0;i<d.length;i++){x=x*.985+(Math.random()*2-1)*.015;d[i]=x*.65}
        const src=ac.createBufferSource();src.buffer=buffer;src.loop=true;
        this.filter=ac.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=400;
        this.noiseGain=ac.createGain();this.noiseGain.gain.value=0;
        src.connect(this.filter).connect(this.noiseGain).connect(ac.destination);src.start();this.noise=src;
      }
      if(this.ac.state!=='running')this.ac.resume().catch(()=>{});this.active=true;this.setMood(ST.cats);this.gainTo(.024);
    }catch{}
    },setMood(cats){this.mood=cats;if(!this.ac)return;
      this.filter.frequency.setTargetAtTime(cats.includes('rain')?1600:cats.includes('forest')?500:200,this.ac.currentTime,.6);
    },gainTo(n){if(!this.ac)return;this.noiseGain.gain.setTargetAtTime(ST.muted?0:n,this.ac.currentTime,.4)},
    toggle(){if(ST.muted){this.gainTo(0);this.ac?.suspend().catch(()=>{})}else this.activate()}
  };
  const effects={
    ctx:el.weather.getContext('2d',{alpha:true}),width:0,height:0,kind:'none',p:[],last:0,started:false,frames:0,slow:0,paused:false,mediaKind:'image',
    setMedia(kind){this.mediaKind=kind||'image';this.populate();},
    resize(){const w=window.innerWidth,h=window.innerHeight;this.width=w;this.height=h;
      // Single-device pixel ratio is intentional: fullscreen canvas at high DPR was a major FPS risk.
      el.weather.width=Math.floor(w);el.weather.height=Math.floor(h);
      this.ctx.setTransform(1,0,0,1,0,0);this.populate();
    },configure(cats){this.kind=cats.includes('rain')?'rain':cats.includes('snow')?'snow':cats.includes('fire')?'ember':cats.includes('space')?'star':cats.includes('forest')?'firefly':cats.includes('water')?'bubble':'dust';
      this.populate();if(!this.started&&!matchMedia('(prefers-reduced-motion:reduce)').matches)this.start();
    },populate(){const area=this.width*this.height;
      // Deliberately cap particles and limit redraws. No filters or shadowBlur.
      const factor=this.mediaKind==='video'?0.58:this.mediaKind==='gif'?0.72:1;
      const base=Math.max(10,Math.min(58,Math.round(area/24000*factor)));
      const n=this.kind==='rain'?Math.min(76,base*1.2):this.kind==='snow'?base:Math.floor(base*.6);
      this.p=Array.from({length:Math.floor(n)},()=>this.particle(true));
    },particle(anywhere){const w=this.width,h=this.height,kind=this.kind;
      const x=Math.random()*w,y=anywhere?Math.random()*h:-15;
      if(kind==='rain')return {x,y,vx:-70-Math.random()*55,vy:360+Math.random()*250,s:8+Math.random()*12};
      if(kind==='snow')return {x,y,vx:-12+Math.random()*24,vy:20+Math.random()*35,s:1+Math.random()*2.5};
      if(kind==='ember')return {x,y:anywhere?y:h+10,vx:-15+Math.random()*30,vy:-20-Math.random()*65,s:1+Math.random()*2};
      if(kind==='bubble')return {x,y:anywhere?y:h+10,vx:-10+Math.random()*20,vy:-15-Math.random()*25,s:2+Math.random()*3};
      return {x,y,vx:-5+Math.random()*10,vy:-3+Math.random()*6,s:.5+Math.random()*1.8};
    },start(){this.started=true;this.last=0;this.boundTick=t=>this.tick(t);requestAnimationFrame(this.boundTick);},
    tick(t){if(!this.started)return;requestAnimationFrame(this.boundTick);
      if(document.hidden||this.paused||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
      // Cap at 30 FPS, automatically drop to ~20 FPS on consistently slow machines.
      const interval=this.slow>8?50:this.slow>3?33:15.5;
      if(t-this.last<interval)return;
      const dt=Math.min((t-this.last)/1000||.033,.065);this.last=t;
      const c=this.ctx;c.clearRect(0,0,this.width,this.height);const kind=this.kind;
      if(kind==='rain'){c.strokeStyle='rgba(204,224,245,.28)';c.lineWidth=1;c.beginPath()}
      else c.fillStyle=kind==='ember'?'rgba(255,185,117,.44)':kind==='firefly'?'rgba(245,243,156,.53)':'rgba(237,245,255,.38)';
      for(let i=0;i<this.p.length;i++){
        const a=this.p[i];a.x+=a.vx*dt;a.y+=a.vy*dt;
        if(kind==='rain'){c.moveTo(a.x,a.y);c.lineTo(a.x-3,a.y+a.s)}
        else{c.beginPath();c.arc(a.x,a.y,a.s,0,Math.PI*2);c.fill()}
        if(a.x<-25||a.x>this.width+25||a.y>this.height+25||a.y<-25&&a.vy<0)this.p[i]=this.particle(false);
      }
      if(kind==='rain')c.stroke();
      this.frames++;if(dt>.027)this.slow=Math.min(20,this.slow+1);else this.slow=Math.max(0,this.slow-.09);
      if(ST.cats.includes('rain')&&ST.cats.includes('dark')&&Math.random()<.0006) {el.flash.classList.remove('active');void el.flash.offsetWidth;el.flash.classList.add('active')}
    }
  };
  function srcLink(url,label){const s=safeUrl(url);if(!s)return document.createTextNode(label||'');
    const a=document.createElement('a');a.href=s;a.target='_blank';a.rel='noreferrer noopener';a.textContent=label||s;return a;}
  function refreshCredits(){el.sources.replaceChildren();function section(label,item,backup){
      const h=document.createElement('h3');h.textContent=label;el.sources.append(h);
      const p=document.createElement('p');p.textContent=item?`${item.title||item.trackName||'Track'} — ${item.creator||item.artist||item.artistName||'Artist'}. ${item.source||item.license||''}. `:backup;
      if(item?.page)p.append(' ',srcLink(item.page,'Source'));
      if(item?.licenseUrl)p.append(' · ',srcLink(item.licenseUrl,'License'));
      el.sources.append(p);
    }
    section('Background',ST.image,'Built-in original fallback scene; replaced when an internet video, GIF, or image loads.');
    if(ST.showingPlayer)section('Music',{title:ST.artistCurrent?.trackName||ST.artist,artist:ST.artistCurrent?.artistName||ST.artist,source:ST.playerSource+(ST.musicTier==='related'?' official embed · related artist fallback':' official embed')},'');
    else section('Music',ST.track,ST.songs.length?'Available tracks (press N for next).':'Procedural ambient sound; no live track confirmed.');
    const h=document.createElement('h3');h.textContent='Availability & rights';el.sources.append(h);
    const p=document.createElement('p');p.textContent='Internet sources may fail or restrict hotlinking. Check each creator’s terms before redistributing. Spotify, YouTube and Apple Music embeds remain visible and require their own player controls. Moving backgrounds are preferred when a playable video or GIF is found.';el.sources.append(p);
  }
  function buildContext(){return compact(ST.prompts.join(' '))}
  async function transform(value){
    const text=compact(value);if(!text)return;
    ST.seq++;const seq=ST.seq;abortOld();ST.visualTicket++;ST.mediaTicket++;
    if(el.stack.checked&&ST.prompts.length)ST.prompts.push(text);else ST.prompts=[text];
    ST.songs=[];ST.index=-1;ST.imagePool=[];ST.image=null;ST.artist=null;
    ST.artistTracks=[];ST.artistCurrent=null;ST.spotifyUrl='';ST.officialUrl='';ST.showingPlayer=false;
    ST.mode='pending';ST.musicTier='';ST.fallbackArtist='';ST.imageUsed.clear();ST.recentMedia=[];
    closeOfficial();ST.playToken++;stopOpenMusic();el.prompt.value='';
    el.prompt.placeholder=el.stack.checked?'add to this moment…':'another thought…';
    const full=buildContext();setTheme('');el.world.classList.add('searching');ST.searching=true;
    setLive('Finding music and visuals for '+full);ambient.activate();
    // Neutral while verifying artists, so "Frank Ocean" never briefly becomes a storm.
    const fallback={type:'image',url:FALLBACK+'night.jpg',title:'Neutral visual',source:'Included with Elsewhere'};
    await setBackgroundMedia(fallback,seq,{fast:true});
    if(seq!==ST.seq)return;
    if(maybeEmbeddedLink(text)){
      // A pasted Spotify/YouTube link stays within the platform's visible player.
      el.world.classList.remove('searching');ST.searching=false;return;
    }
    try{await discoverMusic(full,seq)}finally{
      if(seq===ST.seq){el.world.classList.remove('searching');ST.searching=false;refreshCredits()}
    }
  }

  async function rerollImage({skipUsed=false}={}){
    if(!ST.prompts.length)return false;
    const seq=ST.seq, pool=ST.imagePool.filter(x=>!motionFails.has(x.url));
    const unused=pool.filter(x=>!ST.imageUsed.has(x.id));
    const choices=unused.length?unused:pool.slice(1);
    for(const x of choices.slice(0,10)){
      if(seq!==ST.seq)return false;
      if(await setBackgroundMedia(x,seq)){
        ST.image=x;ST.imageUsed.add(x.id);refreshCredits();return true;
      }
    }
    // Keep the current visual if no related alternative works; never switch to an unrelated scene.
    return false;
  }

  function toggleMute(){ST.muted=!ST.muted;if(ST.muted){el.audio.pause();ambient.toggle();toast('Sound off')}else{ambient.toggle();if(!ST.showingPlayer&&ST.songs.length)playNext();toast('Sound on') }}
  el.form.addEventListener('submit',e=>{e.preventDefault();transform(el.prompt.value)});
  el.stack.addEventListener('change',()=>{setLive(el.stack.checked?'Stacking enabled':'Stacking disabled');el.prompt.focus()});
  el.audio.addEventListener('ended',()=>playNext());
  el.audio.addEventListener('error',()=>{if(ST.track&&!ST.showingPlayer&&!ST.playing){const dead=songID(ST.track);ST.songs=ST.songs.filter(t=>songID(t)!==dead);playNext()} });
  el.spotify.addEventListener('click',()=>{ST.playerTouched=true;showOfficialPlayer('spotify')});
  el.apple.addEventListener('click',()=>{ST.playerTouched=true;showOfficialPlayer('apple')});
  async function nextArtistTrack(){if(!ST.artistTracks.length)return;ST.playerTouched=true;ST.artistCurrent=pickArtistTrack();if(ST.mode==='similar')ST.fallbackArtist=ST.artistCurrent?.artistName||'';showOfficialPlayer('apple');const seq=ST.seq;setTheme(buildContext());if(ST.mode==='artist')await imageSearch(buildContext(),seq,ST.artistCurrent)}
  el.next.addEventListener('click',()=>{nextArtistTrack().catch(()=>{})});
  el.closePlayer.addEventListener('click',()=>{closeOfficial();setLive('Player closed. Press P to reopen.');refreshCredits()});
  el.closeInfo.addEventListener('click',()=>{el.info.hidden=true;el.prompt.focus()});
  document.addEventListener('pointerdown',e=>{
    if(!ST.muted&&ST.prompts.length&&!ST.showingPlayer&&el.audio.paused&&ST.track){el.audio.play().catch(()=>{});ambient.activate()}
    if(!el.info.hidden&&!el.info.contains(e.target)&&!el.form.contains(e.target))el.info.hidden=true;
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){el.info.hidden=true;return}
    if(e.target===el.prompt&&!e.altKey&&!e.ctrlKey&&!e.metaKey)return;
    const k=e.key.toLowerCase();
    if(k==='m'){toggleMute();e.preventDefault()}
    else if(k==='n'){if(ST.showingPlayer&&ST.playerSource==='apple'){nextArtistTrack().catch(()=>{})}else playNext();e.preventDefault()}
    else if(k==='r'){rerollImage();e.preventDefault()}
    else if(k==='p'){if(ST.showingPlayer)closeOfficial();else if(ST.artistTracks.length||ST.spotifyUrl||ST.officialUrl)showOfficialPlayer(ST.spotifyUrl?'spotify':ST.officialKind==='youtube'?'youtube':'apple');e.preventDefault()}
    else if(k==='i'){refreshCredits();el.info.hidden=!el.info.hidden;e.preventDefault()}
    else if(k==='f'){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.().catch(()=>{});e.preventDefault()}
  });
  let resizeT;window.addEventListener('resize',()=>{clearTimeout(resizeT);resizeT=setTimeout(()=>effects.resize(),120)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){el.audio.pause();ambient.gainTo(0);pauseLayer(0);pauseLayer(1)}else {const active=ST.activeBg;const v=el.bgVideo[active];if(v&&v.src){const p=v.play();if(p&&p.catch)p.catch(()=>{})}if(!ST.muted&&ST.prompts.length)ambient.gainTo(.014)}});
  setInterval(monitorVideo,1600);
  setInterval(()=>{if(document.hidden||ST.searching||ST.evolving||!ST.image||Date.now()-ST.sceneAt<75000)return;ST.evolving=true;rerollImage().finally(()=>{ST.evolving=false})},12000);
  effects.resize();setBackgroundMedia({type:'image',url:FALLBACK+'night.jpg',title:'Fallback scene',source:'Included with Elsewhere'},ST.seq,{fast:true});refreshCredits();
  // Debug-friendly, read-only diagnostics for verification without affecting UI.
  window.__elsewhereDebug=()=>({prompts:[...ST.prompts],query:buildContext(),mode:ST.mode,musicTier:ST.musicTier,fallbackArtist:ST.fallbackArtist,category:[...ST.cats],image:ST.image?.url||null,imageTitle:ST.image?.title||null,mediaKind:ST.mediaKind,images:ST.imagePool.length,songs:ST.songs.length,track:ST.track?.title||null,artist:ST.artist,selectedSong:ST.artistCurrent?.trackName||null,artistTracks:ST.artistTracks.length,spotify:!!ST.spotifyUrl,player:ST.playerSource,videoTime:el.bgVideo[ST.activeBg]?.currentTime||0,particles:effects.p.length,canvasScale:1,fpsCap:effects.slow>8?20:effects.slow>3?30:60});
})();
