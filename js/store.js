/* ================= state & storage =================
   Storage format v3 is shared with earlier versions of the app, so data saved
   on a phone keeps loading after an update. New fields are optional. */
const LS_KEY='dachamoney_v3';
function h32(s,seed){let h=seed||5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h.toString(36);}
function hid(prefix,key){return prefix+h32(key)+h32(key,9973);} /* short double-hash id */
function blank(){return{
  accessUrl:null,proxyUrl:'',lastSync:0,lastSyncMsg:'',seenIds:{}, /* seenIds is runtime-only, rebuilt on load */
  incomes:{},   // name -> {icon}
  accounts:{},  // name -> {icon,balance,currency,hidden,manual}
  cats:{},      // name -> {icon,budget,order}
  txns:[],      // {uid,uid2?,date,kind:'exp'|'inc'|'tf',amount,cat?,src?,from?,to?,acct?,payee,note,cur}
  payeeMap:{},  // normalized payee -> category
  sfLinks:{},   // simplefin account id -> our account name
  sfAccounts:{},// simplefin account id -> {name,org,balance,currency,seen}
  deleted:{},   // tombstones: uids the user deleted (so imports/syncs don't resurrect them)
  prefs:{autoSync:true,showBudget:true,colorOver:true,largeFont:false,period:'month'},
};}
function pack(){
  const catN=Object.keys(S.cats),acctN=Object.keys(S.accounts),incN=Object.keys(S.incomes),curs=[];
  const ci={},ai={},ii={},cui={};
  catN.forEach((n,x)=>ci[n]=x);acctN.forEach((n,x)=>ai[n]=x);incN.forEach((n,x)=>ii[n]=x);
  const cu=c=>{c=c||'USD';if(!(c in cui)){cui[c]=curs.length;curs.push(c);}return cui[c];};
  const T=S.txns.map(t=>{
    const base=[t.date,Math.round(t.amount*100),cu(t.cur),t.uid,t.note||''];
    let r;
    if(t.kind==='exp')r=[0,...base,ci[t.cat],ai[t.acct],t.payee===t.cat?'':t.payee];
    else if(t.kind==='inc')r=[1,...base,ii[t.src],ai[t.acct],t.payee===t.src?'':t.payee];
    else r=[2,...base,ai[t.from],ai[t.to],t.payee==='Transfer'?'':t.payee];
    if(t.uid2)r.push(t.uid2);
    return r;});
  return JSON.stringify({v:3,accessUrl:S.accessUrl,proxyUrl:S.proxyUrl,lastSync:S.lastSync,lastSyncMsg:S.lastSyncMsg,
    incomes:S.incomes,accounts:S.accounts,cats:S.cats,payeeMap:S.payeeMap,sfLinks:S.sfLinks,
    sfAccounts:S.sfAccounts,prefs:S.prefs,
    catN,acctN,incN,curs,T,del:Object.keys(S.deleted||{})});
}
function unpack(d){
  const s=blank();
  for(const k of['accessUrl','proxyUrl','lastSync','lastSyncMsg','incomes','accounts','cats','payeeMap','sfLinks','sfAccounts'])s[k]=d[k]??s[k];
  s.prefs=Object.assign(s.prefs,d.prefs||{});
  const KIND=['exp','inc','tf'];
  s.txns=(d.T||[]).map(a=>{
    const[k,date,cents,cui,uid,note,i1,i2,payee,uid2]=a;
    const t={uid,date,kind:KIND[k],amount:cents/100,note,cur:d.curs[cui]||'USD'};
    if(uid2)t.uid2=uid2;
    if(t.kind==='exp'){t.cat=d.catN[i1];t.acct=d.acctN[i2];t.payee=payee||t.cat;}
    else if(t.kind==='inc'){t.src=d.incN[i1];t.acct=d.acctN[i2];t.payee=payee||t.src;}
    else{t.from=d.acctN[i1];t.to=d.acctN[i2];t.payee=payee||'Transfer';}
    return t;});
  for(const t of s.txns){if(t.uid)s.seenIds[t.uid]=1;if(t.uid2)s.seenIds[t.uid2]=1;}
  (d.del||[]).forEach(u=>s.deleted[u]=1);
  return s;
}
function load(){
  try{const raw=localStorage.getItem(LS_KEY);
    if(raw){const d=JSON.parse(raw);if(d&&d.v===3)return unpack(d);}
  }catch(e){}
  try{const old=JSON.parse(localStorage.getItem('dachamoney_v2'));
    if(old&&old.txns){const s=Object.assign(blank(),old);
      for(const t of s.txns)if(t.uid)s.seenIds[t.uid]=1;return s;}
  }catch(e){}
  return blank();
}
let S=load();
let storageOk=true;
function save(){
  try{localStorage.setItem(LS_KEY,pack());storageOk=true;hideWarn();}
  catch(e){storageOk=false;showWarn('Could not save to this browser’s storage ('+(e.name||'error')+'). Your data is loaded for this session but will be lost when you close the page. Open the app from its real web address (or the home-screen icon), not a preview.');}
}
function showWarn(msg){const w=document.getElementById('warnbar');if(w){w.textContent=msg;w.classList.remove('hidden');}}
function hideWarn(){const w=document.getElementById('warnbar');if(w)w.classList.add('hidden');}
function probeStorage(){
  try{const k='__probe';localStorage.setItem(k,'1');localStorage.removeItem(k);}
  catch(e){showWarn('This browser is blocking storage (private browsing?). Anything you load will disappear when you close the page.');return;}
  if(location.protocol==='file:'||location.protocol==='blob:')
    showWarn('You are opening a local copy of the app. Data saved here may not survive. Open it from your GitHub Pages address and use the home-screen icon.');
}

/* ================= icons ================= */
/* original thin-line pictograms, drawn for this app */
const SVG_ICONS={
cart:'<path d="M3 5h2.2l2 10.5h10.6l2-7.5H6.4"/><circle cx="9.4" cy="19" r="1.4"/><circle cx="16.6" cy="19" r="1.4"/>',
mug:'<path d="M6 7h9v7.5a3.5 3.5 0 01-3.5 3.5h-2A3.5 3.5 0 016 14.5z"/><path d="M15 9h1.6a2.4 2.4 0 010 4.8H15"/><path d="M6 11.5h9"/>',
martini:'<path d="M4.5 5h15L12 13.5z"/><path d="M12 13.5V19M8.5 19h7"/><circle cx="14.6" cy="7.6" r="1.1"/>',
dining:'<path d="M13.5 8.5h7M13.5 11h7a3.5 3.5 0 01-7 0z" /><path d="M17 5.5c1.8 0 3 1.2 3.2 3M8 4v15M8 19h0M5.5 4v3.5a2.5 2.5 0 005 0V4"/>',
fuel:'<path d="M5 19V6a2 2 0 012-2h5a2 2 0 012 2v13"/><path d="M4 19h11"/><path d="M7 7h6v4H7z"/><path d="M14 10h2.2l1.8 2v4.6a1.4 1.4 0 01-2.8 0V13"/>',
car:'<path d="M5 16.5V12l1.8-4.5a1.5 1.5 0 011.4-1h7.6a1.5 1.5 0 011.4 1L19 12v4.5"/><path d="M4 12h16v4.5H4z"/><circle cx="7.5" cy="14.3" r=".9" fill="currentColor" stroke="none"/><circle cx="16.5" cy="14.3" r=".9" fill="currentColor" stroke="none"/><path d="M6 16.5v2M18 16.5v2"/>',
house:'<path d="M4.5 11.5L12 4.5l7.5 7"/><path d="M6.5 10v9.5h11V10"/><path d="M10.3 19.5v-5h3.4v5"/>',
phone:'<path d="M7.6 3.5h3l1.2 4.6-2 1.2a11.5 11.5 0 005 5l1.2-2 4.5 1.3v3a2 2 0 01-2.2 2A15.5 15.5 0 015.6 5.7a2 2 0 012-2.2z"/>',
display:'<rect x="3.5" y="5" width="17" height="11.5" rx="1"/><path d="M9.5 20.5h5M12 16.5v4"/>',
trophy:'<path d="M8 4.5h8V10a4 4 0 01-8 0z"/><path d="M8 5.5H5a3 3 0 003.2 3.6M16 5.5h3A3 3 0 0115.8 9.1"/><path d="M12 14v3.5M8.5 20h7"/>',
plug:'<path d="M9 3.5V8M15 3.5V8"/><path d="M7 8h10v2.6a5 5 0 01-10 0z"/><path d="M12 15.6v5"/>',
ghost:'<path d="M20.2 8.2A9 9 0 1020.2 15.8L12.5 12z"/><circle cx="13.5" cy="6.8" r="1" fill="currentColor" stroke="none"/>',
hanger:'<path d="M12 8.5c0-1.6 2-1.6 2-3.3a2 2 0 10-4 0"/><path d="M12 8.5v1.2l8.3 5.6a.8.8 0 01-.45 1.45H4.15a.8.8 0 01-.45-1.45L12 9.7"/>',
globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.3 3.9 5.2 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.2-3.9-8.5s1.3-6.2 3.9-8.5z"/>',
plane:'<path d="M10.5 4.5c0-1 .7-1.5 1.5-1.5s1.5.5 1.5 1.5V10l7 4v2l-7-2v4l2 1.5V21L12 20l-3.5 1v-1.5l2-1.5v-4l-7 2v-2l7-4z"/>',
percent:'<path d="M18.5 5.5l-13 13"/><circle cx="7.3" cy="7.3" r="2.4"/><circle cx="16.7" cy="16.7" r="2.4"/>',
web:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M7.5 9.4a8 5.3 0 019 0M7.5 14.6a8 5.3 0 009 0M7.5 9.4v5.2M16.5 9.4v5.2"/>',
bus:'<rect x="4.5" y="4.5" width="15" height="12.5" rx="2"/><path d="M4.5 11h15M8 20v-3M16 20v-3"/><circle cx="8.3" cy="14" r=".9" fill="currentColor" stroke="none"/><circle cx="15.7" cy="14" r=".9" fill="currentColor" stroke="none"/>',
medcase:'<rect x="3.5" y="7.5" width="17" height="12" rx="1.5"/><path d="M9 7.5V6a2 2 0 012-2h2a2 2 0 012 2v1.5"/><path d="M12 10.8v5M9.5 13.3h5"/>',
coins:'<rect x="7.5" y="7" width="13" height="9" rx="1"/><circle cx="14" cy="11.5" r="2.1"/><path d="M4.8 6.5a1.9 1.1 0 100 2.2M4.8 10.5a1.9 1.1 0 100 2.2M4.8 14.5a1.9 1.1 0 100 2.2"/>',
dice:'<rect x="4.5" y="4.5" width="15" height="15" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none"/>',
cards:'<rect x="3.5" y="8.5" width="13" height="9" rx="1.5"/><path d="M7 8.5V7a1.5 1.5 0 011.5-1.5H19A1.5 1.5 0 0120.5 7v8a1.5 1.5 0 01-1.5 1.5h-2.5"/><path d="M5.5 12.2l4-2.4"/>',
card:'<rect x="3" y="6" width="18" height="12.5" rx="2"/><path d="M3 10.2h18M6 14.8h5"/>',
wallet:'<path d="M4 7.5V6.8A1.8 1.8 0 015.8 5H17"/><path d="M4 7.5A1.5 1.5 0 005.5 9H19a1.5 1.5 0 011.5 1.5v7A1.5 1.5 0 0119 19H5.5A1.5 1.5 0 014 17.5z"/><circle cx="16.4" cy="13.9" r="1.1"/>',
bank:'<path d="M3.5 9.5L12 4.5l8.5 5z"/><path d="M5.5 9.5V17M9.8 9.5V17M14.2 9.5V17M18.5 9.5V17M3.5 19.5h17M3.5 17h17"/>',
piggy:'<path d="M6.5 10.5c.6-2.9 3-4.5 6-4.5 3.5 0 6.5 2.2 6.5 5.5 0 1.6-.7 3-1.8 4l.3 2.5h-2.4l-.5-1.2a8.6 8.6 0 01-4.2 0l-.5 1.2H7.5l.3-2.6A5.6 5.6 0 016 12.6l-1.8-.4v-1.4z"/><circle cx="15.8" cy="10.6" r=".8" fill="currentColor" stroke="none"/>',
user:'<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20a7.2 7.2 0 0114.4 0"/>',
book:'<path d="M5 4.5h11.5A1.5 1.5 0 0118 6v13a1.5 1.5 0 00-1.5-1.5H5z"/><path d="M5 4.5v13"/><path d="M8.5 8h6"/>',
tag:'<path d="M4.5 4.5H11l8.5 8.5-6.5 6.5L4.5 11z"/><circle cx="8.7" cy="8.7" r="1.2"/>',
gift:'<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-1.5-3.5-5-3.5-5-1.5S10 9 12 9c2 0 5 0 5-1.5S13.5 5.5 12 9z"/>',
paw:'<circle cx="7" cy="10" r="1.6"/><circle cx="10.3" cy="6.6" r="1.6"/><circle cx="13.7" cy="6.6" r="1.6"/><circle cx="17" cy="10" r="1.6"/><path d="M12 11.5c-3 0-5 3.6-5 5.5 0 1.6 1.4 2.5 3 2l2-.6 2 .6c1.6.5 3-.4 3-2 0-1.9-2-5.5-5-5.5z"/>',
baby:'<circle cx="12" cy="12" r="8.5"/><circle cx="9.3" cy="11" r=".9" fill="currentColor" stroke="none"/><circle cx="14.7" cy="11" r=".9" fill="currentColor" stroke="none"/><path d="M9.5 15c1.4 1.2 3.6 1.2 5 0M12 3.5c-1 1.5-.5 3 1 3"/>',
music:'<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
bike:'<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l3 7h-7M14 6h2.5"/>',
camera:'<path d="M4 8.5h3.5l1.5-2h6l1.5 2H20v10H4z"/><circle cx="12" cy="13.3" r="3.3"/>',
scissors:'<circle cx="6.5" cy="7" r="2.5"/><circle cx="6.5" cy="17" r="2.5"/><path d="M8.6 8.4L20 17M8.6 15.6L20 7"/>',
book2:'<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5zM12 6.5v13"/>',
heart:'<path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0112 7a4.2 4.2 0 017.5 2.5c0 5.4-7.5 10-7.5 10z"/>',
tool:'<path d="M14.5 5.5a4 4 0 00-5 5L4 16l4 4 5.5-5.5a4 4 0 005-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
chart:'<path d="M4 20h16M7 16v-5M11 16V8M15 16v-3M19 16V5"/>',
plus:'<path d="M12 5.5v13M5.5 12h13"/>'};
const ICON_CHOICES=['cart','mug','martini','dining','car','fuel','house','phone','display','web','plug','trophy','hanger','globe','plane','bus','medcase','heart','percent','coins','piggy','card','cards','wallet','bank','gift','paw','baby','music','bike','camera','scissors','book','book2','tool','chart','dice','ghost','user','tag'];
function renderIcon(ic){
  if(ic&&ic.startsWith('svg:')){const p=SVG_ICONS[ic.slice(4)]||SVG_ICONS.tag;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;}
  return `<span class="em">${esc(ic||'')}</span>`;}
/* stored-emoji migration (data saved by earlier versions) */
const EMOJI_MIG={'🛒':'svg:cart','☕':'svg:mug','🍸':'svg:martini','🍽️':'svg:dining','⛽':'svg:fuel','🏠':'svg:house','📞':'svg:phone','📺':'svg:display','🏆':'svg:trophy','🔌':'svg:plug','👾':'svg:ghost','🛍️':'svg:hanger','✈️':'svg:globe','🌐':'svg:globe','📈':'svg:percent','🕸️':'svg:web','🚕':'svg:bus','💊':'svg:medcase','💵':'svg:coins','🎲':'svg:dice','💳':'svg:card','👛':'svg:wallet','🏦':'svg:bank','🐷':'svg:piggy','👩':'svg:user','📓':'svg:book','▫️':'svg:tag'};
function migrateIcons(s){
  const fix=o=>{if(o&&EMOJI_MIG[o.icon])o.icon=EMOJI_MIG[o.icon];};
  Object.values(s.cats).forEach(fix);Object.values(s.accounts).forEach(fix);Object.values(s.incomes).forEach(fix);}
/* CoinKeeper icon names -> ours */
const CK_ICONS={Salary:'svg:coins',Dice:'svg:dice',Cards:'svg:cards',Card:'svg:card',Cash:'svg:wallet',
  Bank:'svg:bank',Globe:'svg:globe',Savings:'svg:piggy',Woman:'svg:user',Book:'svg:book',
  Travelling:'svg:globe',Hitech:'svg:plug',Phone:'svg:phone',Display:'svg:display',
  Transport:'svg:bus',Fuel:'svg:fuel',Investments:'svg:percent',Coffee:'svg:mug',House:'svg:house',
  Spiderweb:'svg:web',Eating:'svg:dining',Wardrobe:'svg:hanger',ShoppingCart:'svg:cart',
  Sport:'svg:trophy',Miscellaneous:'svg:ghost',Bars:'svg:martini',Medical:'svg:medcase'};
/* old category names -> current */
const CAT_ALIAS={'restaurants/cafes':'Restaurants/Cafes','bars / alcohol':'Alcohol/bars',
  'coffee':'Coffee / Smoothie','tv':'Internet/TV','entertainment/haircut':'Other expenses'};
const INCOME_SOURCES=new Set(['income','salary','other']);

/* ================= helpers ================= */
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const CUR_SYM={USD:'$',RUB:'₽',EUR:'€',KYD:'KYD'};
function fmt(n,cur){const s=CUR_SYM[cur||'USD']||cur+' ';
  const v=Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:Math.abs(n)%1?2:0,maximumFractionDigits:2}).replace(/,/g,' ');
  return s+' '+v;}
function fmtS(n,cur){return(n<0?'-':'')+fmt(n,cur);} /* signed */
const normPayee=p=>(p||'').toLowerCase().replace(/[^a-zа-я0-9 ]/gi,'').replace(/\s+/g,' ').trim().slice(0,40);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function canonCat(name){name=(name||'').trim();const a=CAT_ALIAS[name.toLowerCase()];return a||name||'Other expenses';}
function nextCatOrder(){const os=Object.values(S.cats).map(c=>c.order).filter(o=>typeof o==='number');
  return os.length?Math.max(...os)+1:0;}
function assignOrders(s){
  const names=Object.keys(s.cats);
  const have=names.filter(n=>typeof s.cats[n].order==='number').sort((a,b)=>s.cats[a].order-s.cats[b].order);
  const miss=names.filter(n=>typeof s.cats[n].order!=='number')
    .sort((a,b)=>((s.cats[b].budget||0)-(s.cats[a].budget||0))||a.localeCompare(b));
  [...have,...miss].forEach((n,i)=>s.cats[n].order=i);}
function orderedCats(){return Object.keys(S.cats).sort((a,b)=>(S.cats[a].order??1e9)-(S.cats[b].order??1e9));}
function ensureCat(name,icon){name=canonCat(name);
  if(!S.cats[name])S.cats[name]={icon:icon||'svg:tag',budget:0,order:nextCatOrder()};
  else if(icon)S.cats[name].icon=icon;
  return name;}
function ensureAcct(name,props){name=(name||'').trim();if(!name)return null;
  if(!S.accounts[name])S.accounts[name]={icon:'svg:card',balance:0,currency:'USD',hidden:false,manual:true};
  Object.assign(S.accounts[name],props||{});return name;}
function ensureIncome(name,icon){name=(name||'').trim()||'Other';
  const key=Object.keys(S.incomes).find(k=>k.toLowerCase()===name.toLowerCase())||name;
  if(!S.incomes[key])S.incomes[key]={icon:icon||'svg:coins'};else if(icon)S.incomes[key].icon=icon;
  return key;}
function catIcon(n){return(S.cats[n]||{}).icon||'svg:tag';}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function isoDay(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function newUid(){return'm'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);}
function sortTxns(){S.txns.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);}

/* ================= periods ================= */
/* A period is {type, anchor}: type in week|month|quarter|year, anchor any Date in it */
const PERIODS=['week','month','quarter','year'];
function periodRange(type,anchor){
  const a=new Date(anchor);a.setHours(12,0,0,0);let s,e;
  if(type==='week'){s=new Date(a);s.setDate(a.getDate()-((a.getDay()+6)%7));e=new Date(s);e.setDate(s.getDate()+6);}
  else if(type==='quarter'){const q=Math.floor(a.getMonth()/3)*3;s=new Date(a.getFullYear(),q,1,12);e=new Date(a.getFullYear(),q+3,0,12);}
  else if(type==='year'){s=new Date(a.getFullYear(),0,1,12);e=new Date(a.getFullYear(),11,31,12);}
  else{s=new Date(a.getFullYear(),a.getMonth(),1,12);e=new Date(a.getFullYear(),a.getMonth()+1,0,12);}
  return{start:isoDay(s),end:isoDay(e),s,e};}
function shiftPeriod(type,anchor,dir){const a=new Date(anchor);
  if(type==='week')a.setDate(a.getDate()+7*dir);
  else if(type==='quarter')a.setMonth(a.getMonth()+3*dir,1);
  else if(type==='year')a.setFullYear(a.getFullYear()+dir,0,1);
  else a.setMonth(a.getMonth()+dir,1);
  return a;}
function periodLabel(type,anchor,short){const r=periodRange(type,anchor);
  if(type==='week'){const o={month:'short',day:'numeric'};return r.s.toLocaleDateString('en-US',o)+' – '+r.e.toLocaleDateString('en-US',o);}
  if(type==='quarter')return'Q'+(Math.floor(r.s.getMonth()/3)+1)+(short?" '"+String(r.s.getFullYear()).slice(2):' '+r.s.getFullYear());
  if(type==='year')return String(r.s.getFullYear());
  return r.s.toLocaleString('en-US',short?{month:'short'}:{month:'long',year:'numeric'});}
function inRange(t,r){return t.date>=r.start&&t.date<=r.end;}

/* ================= CSV import ================= */
function parseCSV(text){
  let lines=text.replace(/^﻿/,'');
  if(/^sep=(.)/i.test(lines)) lines=lines.slice(lines.indexOf('\n')+1);
  const first=lines.split('\n')[0];
  const delim=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<lines.length;i++){const c=lines[i];
    if(q){if(c==='"'){if(lines[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=c;}
    else if(c==='"')q=true;
    else if(c===delim){row.push(cell);cell='';}
    else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
    else cell+=c;}
  if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}
  return rows;
}
function parseDate(s){s=(s||'').trim();
  let m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if(m)return`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[0];
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m)return`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  return null;}

function importCoinKeeper(text){
  const rows=parseCSV(text);
  const hi=rows.findIndex(r=>r.some(c=>/^(date|data|дата)$/i.test((c||'').trim())));
  if(hi<0)throw new Error('No header row with a Date column found. Is this a CoinKeeper CSV export?');
  const head=rows[hi].map(c=>(c||'').trim().toLowerCase());
  const col=ns=>head.findIndex(h=>ns.includes(h));
  const cDate=col(['date','data','дата']),cType=col(['type','тип']),cFrom=col(['from']),cTo=col(['to']),
        cTags=col(['tags']),cAmt=col(['amount','сумма']),cCur=col(['currency']),cNote=col(['note','comment']);
  let added=0,skipped=0,section=0,res={inc:0,exp:0,tf:0};
  const occ={}; /* per-file occurrence counter: identical rows (same coffee twice a day) are distinct txns,
                   and re-imports reproduce the same numbering so duplicates are skipped */
  const firstImport=Object.keys(S.cats).length===0;

  for(let i=hi+1;i<rows.length;i++){
    const r=rows[i];if(!r)continue;
    const c0=(r[0]||'').trim();

    /* trailing metadata sections: accounts / income & category budgets */
    if(r.length<=1&&!c0){continue;}
    if(c0==='Name'){
      const h2=r.map(x=>(x||'').trim());
      section = h2.includes('Current amount')?'accounts' : h2.includes('Budget')?'budget' : 'tags';
      continue;}
    if(section==='accounts'&&r.length>=4){
      const[name,bal,icon,cur]=r.map(x=>(x||'').trim());
      if(name){const n=ensureAcct(name,{balance:parseFloat(bal)||0,currency:cur||'USD'});
        if(CK_ICONS[icon])S.accounts[n].icon=CK_ICONS[icon];}
      continue;}
    if(section==='budget'&&r.length>=5){
      const[name,budget]=[r[0].trim(),parseFloat(r[1])||0];
      const icon=CK_ICONS[(r[3]||'').trim()];
      if(INCOME_SOURCES.has(name.toLowerCase())) ensureIncome(name,icon);
      else{const n=ensureCat(name,icon);S.cats[n].budget=budget;}
      continue;}
    if(section==='tags')continue;

    /* transaction rows */
    if(cType<0||!r[cType])continue;
    const type=(r[cType]||'').trim();
    if(!/^(Expense|Income|Transfer)$/i.test(type))continue;
    const date=parseDate(r[cDate]);if(!date){skipped++;continue;}
    const amt=Math.abs(parseFloat((r[cAmt]||'').replace(/\s/g,'').replace(',','.')));
    if(!amt&&amt!==0){skipped++;continue;}
    const from=(r[cFrom]||'').trim(),to=(r[cTo]||'').trim();
    const note=(cNote>=0?r[cNote]:'')||'',tags=(cTags>=0?r[cTags]:'')||'';
    const cur=(cCur>=0?r[cCur]:'USD')||'USD';
    const h=hid('c',[date,type,from,to,amt,note,tags].join('|'));
    occ[h]=(occ[h]||0)+1;
    const uid=h+'#'+occ[h];
    if(S.seenIds[uid]||S.deleted[uid]){skipped++;continue;}

    let t;
    if(/expense/i.test(type)){
      const cat=ensureCat(to),acct=ensureAcct(from)||'Wallet';
      t={uid,date,kind:'exp',amount:amt,cat,acct,payee:note||cat,note:tags,cur};
      const np=normPayee(note);if(np)S.payeeMap[np]=cat;res.exp++;
    }else if(/income/i.test(type)||INCOME_SOURCES.has(from.toLowerCase())){
      const src=ensureIncome(from),acct=ensureAcct(to)||'Wallet';
      t={uid,date,kind:'inc',amount:amt,src,acct,payee:note||src,note:tags,cur};res.inc++;
    }else{ /* account-to-account transfer */
      const fa=ensureAcct(from),ta=ensureAcct(to);
      t={uid,date,kind:'tf',amount:amt,from:fa,to:ta,payee:note||'Transfer',note:tags,cur};res.tf++;
    }
    S.seenIds[uid]=1;S.txns.push(t);added++;
  }
  /* hide legacy accounts: zero balance and no activity in the last 12 months */
  const cutoff=new Date();cutoff.setFullYear(cutoff.getFullYear()-1);
  const cut=cutoff.toISOString().slice(0,10);
  const active=new Set();
  for(const t of S.txns)if(t.date>=cut){if(t.acct)active.add(t.acct);if(t.from)active.add(t.from);if(t.to)active.add(t.to);}
  for(const n in S.accounts){const a=S.accounts[n];a.hidden=(Math.abs(a.balance)<0.005&&!active.has(n));}
  sortTxns();
  if(firstImport)for(const n in S.cats)delete S.cats[n].order; /* seed layout by budget size */
  assignOrders(S);
  save();
  return{added,skipped,...res,cats:Object.keys(S.cats).length,accts:Object.values(S.accounts).filter(a=>!a.hidden).length};
}

/* ================= export / backup ================= */
function download(name,blob){const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
function exportCSV(){
  const rows=[['Data','Type','From','To','Tags','Amount','Currency','Note']];
  for(const t of S.txns){
    const d=t.date.split('-');const dd=`${+d[1]}/${+d[2]}/${d[0]}`;
    if(t.kind==='exp')rows.push([dd,'Expense',t.acct,t.cat,t.note||'',t.amount.toFixed(2),t.cur||'USD',t.payee||'']);
    else if(t.kind==='inc')rows.push([dd,'Transfer',t.src,t.acct,t.note||'',t.amount.toFixed(2),t.cur||'USD',t.payee||'']);
    else rows.push([dd,'Transfer',t.from,t.to,t.note||'',t.amount.toFixed(2),t.cur||'USD',t.payee||'']);}
  const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  download('dachamoney_export_'+today()+'.csv',new Blob(['﻿'+csv],{type:'text/csv'}));}
function downloadBackup(){
  download('dachamoney_backup_'+today()+'.json',new Blob([pack()],{type:'application/json'}));}
function restoreBackup(text){
  let d;try{d=JSON.parse(text);}catch(e){throw new Error('That file is not a DachaMoney backup (not valid JSON).');}
  if(!d||d.v!==3||!Array.isArray(d.T)||!Array.isArray(d.catN))throw new Error('That file is not a DachaMoney backup.');
  S=unpack(d);migrateIcons(S);assignOrders(S);save();
  return S.txns.length;}

migrateIcons(S);assignOrders(S);
