/* ================= UI =================
   Screens follow the CoinKeeper-style reference in design/: coin grid home,
   calculator entry, category/account detail, feed, green category form,
   side drawer, iOS-style settings, alerts and action sheets. */
const IC={
menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',up:'<path d="M6 14l6-6 6 6"/>',back:'<path d="M15 5l-7 7 7 7"/>',
close:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
cal:'<rect x="4" y="5.5" width="16" height="14" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M8 13.5h2M11 13.5h2M14 13.5h2M8 16.5h2M11 16.5h2"/>',
sync:'<path d="M19.5 12a7.5 7.5 0 01-13.2 4.9M4.5 12a7.5 7.5 0 0113.2-4.9"/><path d="M17.7 3.5v3.6h-3.6M6.3 20.5v-3.6h3.6"/>',
feed:'<rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M8 9.5h8M8 12.5h8M8 15.5h5"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6"/>',
mail:'<rect x="3.5" y="6" width="17" height="12" rx="1.5"/><path d="M4 7l8 6 8-6"/>',
comment:'<path d="M5 6h14v9H10l-4 3.5V15H5z"/>',repeat:'<path d="M5 10a5 5 0 015-5h6M14 3l2.5 2L14 7M19 14a5 5 0 01-5 5H8M10 21l-2.5-2L10 17"/>',
pencil:'<path d="M5 19l1-4L16 5l3 3L9 18z"/>',user:'<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20a7 7 0 0114 0"/>',
bank:'<path d="M3.5 9.5L12 4.5l8.5 5z"/><path d="M5.5 9.5V17M9.8 9.5V17M14.2 9.5V17M18.5 9.5V17M3.5 19.5h17"/>',
download:'<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',upload:'<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.5h14"/>',
file:'<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4"/>',eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
palette:'<path d="M12 4a8 8 0 100 16c1 0 1.5-.7 1.5-1.5 0-1-.8-1.3-.8-2.2 0-.9.7-1.5 1.6-1.5H17a3.5 3.5 0 003.5-3.5C20.5 7.2 16.7 4 12 4z"/><circle cx="8" cy="11" r="1"/><circle cx="11" cy="7.8" r="1"/><circle cx="15.2" cy="8.4" r="1"/>',
text:'<path d="M5 18L9.5 6h1L15 18M6.7 14h6.6M15.5 18l3-8 3 8M16.4 15.6h4.2"/>',trash:'<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13"/>'};
function ic(n,sw){return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw||1.7}" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;}

let anchor=new Date();
const curRange=()=>periodRange(S.prefs.period,anchor);
const BUDGET_FACTOR={week:12/52,month:1,quarter:3,year:12};
function budgetFor(n,type){return(S.cats[n]&&S.cats[n].budget||0)*BUDGET_FACTOR[type||S.prefs.period];}
function domCur(tx){const c={};for(const t of tx)c[t.cur||'USD']=(c[t.cur||'USD']||0)+1;
  return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||'USD';}
function ago(ms){const s=(Date.now()-ms)/1000;if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+' min ago';
  if(s<86400)return Math.floor(s/3600)+' h ago';return Math.floor(s/86400)+' d ago';}
function dayLabel(d){const t=today(),y=isoDay(new Date(Date.now()-86400000));
  const long=new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  return d===t?'Today, '+long:d===y?'Yesterday, '+long:long;}

/* ================= home ================= */
function coinSVG(frac,color,base){
  const id='c'+Math.random().toString(36).slice(2,8);
  const h=58*Math.min(Math.max(frac,0),1);
  return`<svg width="58" height="58" viewBox="0 0 58 58"><defs><clipPath id="${id}"><rect x="0" y="${58-h}" width="58" height="${h}"/></clipPath></defs>
    <circle cx="29" cy="29" r="29" fill="${base||'var(--coin)'}"/><circle cx="29" cy="29" r="29" fill="${color}" clip-path="url(#${id})"/></svg>`;}
function nodeHTML(kind,name,icon,coin,amt,bud,extraCls){
  return`<div class="node ${kind} ${extraCls||''}" data-kind="${kind}" data-name="${esc(name)}">
    <div class="cname">${esc(name)||'&nbsp;'}</div>
    <div class="cwrap">${coin}<div class="cicon">${renderIcon(icon)}</div></div>
    <span class="xbadge">✕</span><span class="pencil">${ic('pencil',2)}</span>
    ${amt||''}${bud||''}</div>`;}
const addSlot=kind=>nodeHTML(kind+' add','','svg:plus',coinSVG(0,'var(--coin)','#e9eaee'),'','','');

function renderHome(){
  const r=curRange(),tx=S.txns.filter(t=>inRange(t,r)),cur=domCur(tx);
  $('#periodLbl').textContent=periodLabel(S.prefs.period,anchor);
  const vis=Object.values(S.accounts).filter(a=>!a.hidden);
  const bal=vis.filter(a=>(a.currency||'USD')===cur).reduce((s,a)=>s+a.balance,0);
  const exp=tx.filter(t=>t.kind==='exp'&&(t.cur||'USD')===cur).reduce((s,t)=>s+t.amount,0);
  const plan=Object.keys(S.cats).reduce((s,n)=>s+budgetFor(n),0);
  $('#hBal').textContent=fmtS(Math.round(bal*100)/100,cur);$('#hExp').textContent=fmt(exp,cur);$('#hPlan').textContent=fmt(Math.round(plan),cur);

  let h='';
  for(const name of Object.keys(S.incomes)){
    const got=tx.filter(t=>t.kind==='inc'&&t.src===name&&(t.cur||'USD')===cur).reduce((s,t)=>s+t.amount,0);
    h+=nodeHTML('income drag',name,S.incomes[name].icon,coinSVG(1,'var(--blue)'),`<div class="camt num">${fmt(got,cur)}</div>`);}
  $('#gridIncome').innerHTML=h+addSlot('income');

  h='';
  for(const name of Object.keys(S.accounts)){const a=S.accounts[name];if(a.hidden)continue;
    h+=nodeHTML('acct drag',name,a.icon,coinSVG(1,'var(--yellow)'),`<div class="camt num ${a.balance<0?'neg':''}">${fmtS(a.balance,a.currency)}</div>`);}
  $('#gridAccounts').innerHTML=h+addSlot('acct');

  const byCat={};
  for(const t of tx)if(t.kind==='exp'&&(t.cur||'USD')===cur)byCat[t.cat]=(byCat[t.cat]||0)+t.amount;
  h='';
  for(const name of orderedCats()){
    const spent=Math.round((byCat[name]||0)*100)/100,budget=budgetFor(name);
    const over=budget&&spent>budget;
    const color=over&&S.prefs.colorOver?'var(--red)':'var(--green)';
    const frac=spent<=0?0:budget?spent/budget:1;
    h+=nodeHTML('cat',name,catIcon(name),coinSVG(frac,color),
      `<div class="camt num" style="color:${spent>0?color:'var(--muted)'}">${fmt(spent,cur)}</div>`,
      budget&&S.prefs.showBudget?`<div class="cbud num">${Math.round(budget).toLocaleString('en-US').replace(/,/g,' ')}</div>`:'');}
  $('#gridCats').innerHTML=h+addSlot('cat');

  const td=today(),tdTx=S.txns.filter(t=>t.date===td&&t.kind==='exp'),tdCur=domCur(tdTx.length?tdTx:tx);
  const tdSum=tdTx.filter(t=>(t.cur||'USD')===tdCur).reduce((s,t)=>s+t.amount,0);
  $('#todayDot').innerHTML=S.txns.length?`Today <b class="num">${fmt(Math.round(tdSum*100)/100,tdCur)}</b>`:'';
  const none=!S.txns.length&&!S.accessUrl;
  $('#homeEmpty').classList.toggle('hidden',!none);
  if(none)$('#homeEmpty').innerHTML=`Connect your bank and every card's transactions will show up here by themselves.<br>
    <button class="btn" onclick="openSettings()">Connect bank</button>`;
  $('#dragHint').classList.toggle('hidden',none||document.body.classList.contains('editing'));
  renderSyncDot();}

let syncErr='';
function renderSyncDot(busy){
  const d=$('#syncDot');busy=busy??syncing;
  d.className='syncdot'+(busy?' spin':'')+(syncErr&&!busy?' err':'');
  if(!S.accessUrl){d.innerHTML='Connect bank';d.title='';return;}
  d.innerHTML=ic('sync')+(busy?'Syncing…':syncErr?'Sync failed':S.lastSync?ago(S.lastSync):'');
  renderDrawer();}
function onSyncState(busy){renderSyncDot(busy);}
async function runSync(manual){
  if(!S.accessUrl){if(manual)openSettings();return;}
  const r=await syncNow();
  syncErr=r.ok?'':r.msg;
  renderAll();
  if(manual||!r.ok||r.added||r.finalized){
    const lines=r.ok?r.msg.split('\n').filter(l=>!l.startsWith('Bank notes')):[r.msg];
    toast(r.ok&&!r.added&&!r.finalized&&!r.dropped?'Up to date. No new transactions.':lines.slice(0,4).join('\n'));}}
function autoSync(){if(syncDue())runSync(false);}

/* ---------- pointer: tap, long-press (edit mode), drag ---------- */
let ptr=null;
function nodeInfo(el){return{kind:el.dataset.kind.split(' ')[0],name:el.dataset.name,el};}
document.getElementById('homeScroll').addEventListener('pointerdown',e=>{
  const el=e.target.closest('.node');if(!el||e.button>0)return;
  const info=nodeInfo(el),add=el.classList.contains('add'),editing=document.body.classList.contains('editing');
  const canDrag=!add&&(editing?info.kind==='cat':(info.kind==='income'||info.kind==='acct'));
  ptr={info,add,canDrag,x0:e.clientX,y0:e.clientY,started:false,long:false,onX:!!e.target.closest('.xbadge'),
    timer:add||editing?null:setTimeout(()=>{if(ptr&&!ptr.started){ptr.long=true;enterEdit();}},480)};
  if(canDrag)e.preventDefault();});
document.addEventListener('pointermove',e=>{
  if(!ptr)return;
  if(!ptr.started){
    if(Math.hypot(e.clientX-ptr.x0,e.clientY-ptr.y0)<9)return;
    clearTimeout(ptr.timer);
    if(!ptr.canDrag){ptr=null;return;}
    ptr.started=true;
    const k=ptr.info.kind,g=document.createElement('div');g.className='drag-ghost';
    g.style.background=k==='income'?'var(--blue)':k==='acct'?'var(--yellow)':'var(--green)';
    g.innerHTML=renderIcon(k==='income'?S.incomes[ptr.info.name].icon:k==='acct'?S.accounts[ptr.info.name].icon:catIcon(ptr.info.name));
    document.body.appendChild(g);ptr.ghost=g;ptr.info.el.style.opacity=.35;}
  ptr.ghost.style.left=e.clientX+'px';ptr.ghost.style.top=e.clientY+'px';
  $$('.node.droptarget').forEach(n=>n.classList.remove('droptarget'));
  const t=dropAt(e.clientX,e.clientY);if(t)t.el.classList.add('droptarget');},{passive:false});
function endPtr(e,cancel){
  if(!ptr)return;const p=ptr;ptr=null;clearTimeout(p.timer);
  $$('.node.droptarget').forEach(n=>n.classList.remove('droptarget'));
  if(p.ghost){p.ghost.remove();p.info.el.style.opacity='';}
  if(cancel||p.long)return;
  const editing=document.body.classList.contains('editing');
  if(p.started){const t=dropAt(e.clientX,e.clientY,p.info);if(!t)return;
    if(editing){moveCatTo(p.info.name,t.name);renderAll();}
    else openEntry(p.info,t);
    return;}
  if(p.add){openForm(p.info.kind);return;}
  if(editing){if(p.onX)confirmDelete(p.info.kind,p.info.name);else openForm(p.info.kind,p.info.name);return;}
  openDetail({type:p.info.kind,name:p.info.name});}
document.addEventListener('pointerup',e=>endPtr(e));
document.addEventListener('pointercancel',e=>endPtr(e,true));
function dropAt(x,y,src){
  const s=src||(ptr&&ptr.info);
  let el=document.elementFromPoint(x,y);el=el&&el.closest('.node');
  if(!el||el.classList.contains('add')||!s)return null;
  const d=nodeInfo(el);
  if(document.body.classList.contains('editing'))return s.kind==='cat'&&d.kind==='cat'&&d.name!==s.name?d:null;
  if(s.kind==='income')return d.kind==='acct'?d:null;
  if(s.kind==='acct')return d.kind==='cat'||(d.kind==='acct'&&d.name!==s.name)?d:null;
  return null;}
function enterEdit(){if(navigator.vibrate)navigator.vibrate(15);
  document.body.classList.add('editing');$('#editDone').classList.remove('hidden');$('#dragHint').classList.add('hidden');}
function exitEdit(){document.body.classList.remove('editing');$('#editDone').classList.add('hidden');renderHome();}
function moveCatTo(name,target){
  const names=orderedCats().filter(n=>n!==name);names.splice(names.indexOf(target),0,name);
  names.forEach((n,i)=>S.cats[n].order=i);save();}

/* ================= pages ================= */
const pageStack=[];
function pushPage(cls,render,opts={}){
  const el=document.createElement('section');el.className='page pushed '+(opts.up?'up ':'')+cls;
  el._render=()=>{render(el);};render(el);
  $('#pages').appendChild(el);pageStack.push(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('in')));
  return el;}
function popPage(el){el=el||pageStack[pageStack.length-1];if(!el)return;
  pageStack.splice(pageStack.indexOf(el),1);el.classList.remove('in');
  setTimeout(()=>el.remove(),320);}
function renderAll(){renderHome();for(const p of pageStack)if(p._render&&!p._noRerender)p._render();renderDrawer();}

/* ---------- calculator entry ---------- */
function calc(expr){
  const e=expr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  if(!/^[\d.+\-*/]*$/.test(e))return NaN;
  const t=e.replace(/[+\-*/.]+$/,'');if(!t)return 0;
  try{const v=Function('"use strict";return('+t+')')();return isFinite(v)?Math.round(v*100)/100:NaN;}catch(_){return NaN;}}
function openEntry(src,dst){
  let kind,from=src.name,to=dst.name;
  if(src.kind==='income')kind='inc';else if(dst.kind==='cat')kind='exp';else kind='tf';
  const acct=kind==='inc'?to:from;
  const cur=(S.accounts[acct]||{}).currency||'USD';
  let expr='',note='',date=today();
  const yest=isoDay(new Date(Date.now()-86400000));
  const page=pushPage('entry',el=>{
    el.innerHTML=`<div class="etop"><button class="navbtn" data-a="x">${ic('close')}</button>
      <div class="route"><span>${esc(from)}</span><i>›</i><span>${esc(to)}</span></div>
      <button class="navbtn ok" data-a="ok">${ic('check',2)}</button></div>
      <div class="noterow"><input id="eNote" placeholder="Note" maxlength="120" value="${esc(note)}"></div>
      <div class="display" id="eDisp"><div class="amt num"></div><div class="cur">${CUR_SYM[cur]||cur}</div></div>
      <div class="pad">
        <div class="row small"><button class="k" data-a="note">${ic('comment')}</button><button class="k" data-a="last">${ic('repeat')}</button><button class="k" data-k="%">%</button><button class="k" data-k="+">+</button></div>
        <div class="row"><button class="k" data-k="1">1</button><button class="k" data-k="2">2</button><button class="k" data-k="3">3</button><button class="k op" data-k="−">−</button></div>
        <div class="row"><button class="k" data-k="4">4</button><button class="k" data-k="5">5</button><button class="k" data-k="6">6</button><button class="k op" data-k="×">×</button></div>
        <div class="row"><button class="k" data-k="7">7</button><button class="k" data-k="8">8</button><button class="k" data-k="9">9</button><button class="k op" data-k="÷">÷</button></div>
        <div class="row"><button class="k" data-k=".">,</button><button class="k" data-k="0">0</button><button class="k" data-k="del">←</button><button class="k op" data-k="=">=</button></div>
      </div>
      <div class="whenbar"><button data-d="${yest}">Yesterday</button><button data-d="${today()}">Today</button>
        <label class="cal">${ic('cal')}<input type="date" id="eDate" value="${date}"></label></div>`;
    const show=()=>{const d=el.querySelector('#eDisp');d.classList.toggle('zero',!expr);
      d.querySelector('.amt').textContent=(expr||'0').replace(/\./g,',');
      el.querySelectorAll('.whenbar [data-d]').forEach(b=>b.classList.toggle('on',b.dataset.d===date));
      el.querySelector('[data-a=note]').classList.toggle('on',!!note);};
    show();
    el.querySelector('#eNote').oninput=e=>{note=e.target.value;show();};
    el.querySelector('#eDate').onchange=e=>{if(e.target.value){date=e.target.value;show();}};
    el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{date=b.dataset.d;show();});
    el.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k;
      const ops='+−×÷';
      if(k==='del')expr=expr.slice(0,-1);
      else if(k==='='){const v=calc(expr);expr=isNaN(v)?expr:String(v);}
      else if(k==='%'){expr=expr.replace(/(\d+\.?\d*)$/,m=>String(Math.round(parseFloat(m))/100));}
      else if(ops.includes(k)){if(!expr)return;expr=ops.includes(expr.slice(-1))?expr.slice(0,-1)+k:expr+k;}
      else if(k==='.'){const lastNum=expr.split(/[+−×÷]/).pop();if(!lastNum.includes('.'))expr+=(lastNum?'':'0')+'.';}
      else{const lastNum=expr.split(/[+−×÷]/).pop();if(/\.\d\d$/.test(lastNum))return;if(lastNum==='0')expr=expr.slice(0,-1);expr+=k;}
      if(expr.length>18)expr=expr.slice(0,18);show();});
    el.querySelector('[data-a=note]').onclick=()=>el.querySelector('#eNote').focus();
    el.querySelector('[data-a=last]').onclick=()=>{const last=S.txns.find(t=>t.kind===kind&&(kind==='exp'?t.cat===to&&t.acct===from:kind==='inc'?t.src===from:t.from===from&&t.to===to));
      if(last){expr=String(last.amount);if(!note&&last.note)note=last.note;el.querySelector('#eNote').value=note;show();}else toast('Nothing to repeat yet.');};
    el.querySelector('[data-a=x]').onclick=()=>popPage(page);
    el.querySelector('[data-a=ok]').onclick=()=>{
      const amt=calc(expr);
      if(!(amt>0)){alertBox('Enter an amount','Type how much on the keypad.');return;}
      const uid=newUid(),n=note.trim();let t;
      if(kind==='inc'){t={uid,date,kind,amount:amt,src:from,acct:to,payee:from,note:n,cur};adjBal(to,amt);}
      else if(kind==='exp'){t={uid,date,kind,amount:amt,cat:to,acct:from,payee:to,note:n,cur};adjBal(from,-amt);}
      else{t={uid,date,kind,amount:amt,from,to,payee:'Transfer',note:n,cur};adjBal(from,-amt);adjBal(to,amt);}
      S.seenIds[uid]=1;S.txns.push(t);sortTxns();save();popPage(page);renderAll();};
  },{up:true});
  page._noRerender=true;}
function adjBal(name,delta){const a=S.accounts[name];if(a)a.balance=Math.round((a.balance+delta)*100)/100;}

/* ---------- transaction list (shared by detail + feed) ---------- */
function txnSigned(t,ctx){ /* amount as it affects the context */
  if(t.kind==='inc')return t.amount;if(t.kind==='exp')return -t.amount;
  if(ctx&&ctx.type==='acct')return t.to===ctx.name?t.amount:-t.amount;
  return 0;}
function rowHTML(t,ctx){
  let top,main,sub='';
  if(t.kind==='exp'){top=t.acct;main=t.cat;sub=t.payee&&t.payee!==t.cat?t.payee:'';}
  else if(t.kind==='inc'){top=t.src+' › '+t.acct;main=t.src;sub=t.payee&&t.payee!==t.src?t.payee:'';}
  else{top=(t.from||'Bank')+' › '+(t.to||'');main='Transfer';sub=t.note&&t.note!==t.payee?'':t.payee!=='Transfer'?t.payee:'';}
  const v=txnSigned(t,ctx);
  const cls=t.kind==='tf'&&!(ctx&&ctx.type==='acct')?'tf':v>0?'pos':'';
  const noteTxt=t.note&&t.note!==t.payee?t.note:'';
  return`<div class="trow${t.pend?' pending':''}" data-uid="${esc(t.uid)}"><div class="tdel">Delete</div><div class="tin">
    <div class="tl"><div class="ta">${esc(top)}</div><div class="tc">${esc(main)}</div>${sub?`<div class="tp">${esc(sub)}</div>`:''}</div>
    <div class="tr"><div class="tv num ${cls}">${v>0?'+':v<0?'-':''}${fmt(t.amount,t.cur)}</div>${t.pend?'<div class="tn pend">pending</div>':''}${noteTxt?`<div class="tn">${esc(noteTxt)}</div>`:''}</div>
  </div></div>`;}
function dayListHTML(tx,ctx,limit){
  if(!tx.length)return'<div class="empty">No transactions in this period.</div>';
  let h='',day=null,dayTx=[];
  const flush=()=>{if(!day)return;
    const cur=domCur(dayTx);
    const exp=dayTx.filter(t=>t.kind==='exp'&&(t.cur||'USD')===cur).reduce((s,t)=>s+t.amount,0);
    h+=`<div class="dayhead">${dayLabel(day)}</div><div class="dayblock">${dayTx.map(t=>rowHTML(t,ctx)).join('')}
      ${dayTx.length>1&&exp?`<div class="daytotal"><div class="v num">-${fmt(exp,cur)}<small>total</small></div></div>`:''}</div>`;};
  for(const t of tx.slice(0,limit||tx.length)){if(t.date!==day){flush();day=t.date;dayTx=[];}dayTx.push(t);}
  flush();
  if(limit&&tx.length>limit)h+=`<button class="more" data-more>Show ${Math.min(300,tx.length-limit)} more</button>`;
  return h;}
function wireRows(host,onMore){
  host.querySelectorAll('.trow').forEach(row=>{
    const tin=row.querySelector('.tin');let x0=null,y0=0,dx=0,open=false,horiz=false;
    row.addEventListener('pointerdown',e=>{if(row.classList.contains('gone'))return;x0=e.clientX;y0=e.clientY;dx=0;horiz=false;tin.style.transition='none';});
    row.addEventListener('pointermove',e=>{if(x0===null)return;const mx=e.clientX-x0;
      if(!horiz){if(Math.abs(e.clientY-y0)>10){x0=null;tin.style.transition='';return;}if(Math.abs(mx)<8)return;horiz=true;row.classList.add('sw');}
      dx=Math.min(0,Math.max(-110,mx+(open?-88:0)));tin.style.transform=`translateX(${dx}px)`;});
    const end=()=>{if(x0===null)return;x0=null;tin.style.transition='';
      if(horiz){open=dx<-44;tin.style.transform=open?'translateX(-88px)':'';if(!open)setTimeout(()=>row.classList.remove('sw'),200);
        host.querySelectorAll('.trow .tin').forEach(o=>{if(o!==tin)o.style.transform='';});}
      else if(open){open=false;tin.style.transform='';setTimeout(()=>row.classList.remove('sw'),200);}
      else{const t=S.txns.find(x=>x.uid===row.dataset.uid);if(t)openTxnSheet(t);}};
    row.addEventListener('pointerup',end);row.addEventListener('pointercancel',()=>{x0=null;tin.style.transition='';tin.style.transform=open?'translateX(-88px)':'';});
    row.querySelector('.tdel').onclick=e=>{e.stopPropagation();
      const t=S.txns.find(x=>x.uid===row.dataset.uid);if(!t)return;
      const undo=deleteTxn(t);renderHome();
      row.classList.add('gone');row.innerHTML=`<div class="tin">Transaction deleted<button class="undo">Cancel</button></div>`;
      row.querySelector('.undo').onclick=ev=>{ev.stopPropagation();undo();renderAll();};
      setTimeout(()=>{if(row.isConnected&&row.classList.contains('gone')){row.style.transition='opacity .3s';row.style.opacity=0;setTimeout(()=>renderAll(),300);}},4000);};});
  const m=host.querySelector('[data-more]');if(m)m.onclick=onMore;}
function deleteTxn(t){
  const i=S.txns.indexOf(t);if(i<0)return()=>{};
  S.txns.splice(i,1);
  const ids=[t.uid,t.uid2].filter(u=>u&&u[0]!=='?');
  ids.forEach(u=>{S.deleted[u]=1;delete S.seenIds[u];});
  const manual=t.uid[0]==='m',bal=sign=>{if(!manual)return;
    if(t.kind==='exp')adjBal(t.acct,sign*t.amount);else if(t.kind==='inc')adjBal(t.acct,-sign*t.amount);
    else{adjBal(t.from,sign*t.amount);adjBal(t.to,-sign*t.amount);}};
  bal(1);save();
  return()=>{S.txns.push(t);ids.forEach(u=>{delete S.deleted[u];S.seenIds[u]=1;});bal(-1);sortTxns();save();};}

/* ---------- transaction detail sheet ---------- */
function openTxnSheet(t){
  const v=txnSigned(t);
  const sub=t.kind==='exp'?`${t.acct} › ${t.cat}`:t.kind==='inc'?`${t.src} › ${t.acct}`:`${t.from||'Bank'} › ${t.to}`;
  const ov=overlay(`<div class="tsheet"><div class="grab"></div>
    <div class="tamt num ${t.kind}">${v>0?'+':v<0?'-':''}${fmt(t.amount,t.cur)}</div>
    <div class="tpay">${esc(t.payee||'')}</div>
    <div class="tsub">${esc(sub)} · ${new Date(t.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}${t.pend?' · pending':t.uid[0]==='s'||t.uid2?' · from bank':''}</div>
    ${t.pend?'<div class="pendnote">Pending at the bank. The amount can still change (a tip, a hold being adjusted). It updates itself when the charge posts, and keeps this category and comment.</div>':''}
    <label>Comment</label><input id="tCmt" placeholder="Add a note…" value="${esc(t.note&&t.note!==t.payee?t.note:'')}">
    <label>Date</label><input id="tDate" type="date" value="${t.date}">
    ${t.kind==='exp'?`<label>Category${t.payee&&t.payee!==t.cat?' · this payee will follow':''}</label><div class="catpick">${orderedCats().map(n=>
      `<button data-c="${esc(n)}" class="${n===t.cat?'on':''}"><div class="cc">${renderIcon(catIcon(n))}</div><div class="cn">${esc(n)}</div></button>`).join('')}</div>`:''}
    <div class="row2"><button class="del" id="tDel">Delete</button><button id="tDone">Done</button></div></div>`,{close:()=>commit()});
  let done=false;
  const commit=()=>{if(done)return;done=true;
    const c=ov.querySelector('#tCmt').value.trim(),d=ov.querySelector('#tDate').value;
    let ch=false;
    if(c!==(t.note&&t.note!==t.payee?t.note:'')){t.note=c;ch=true;}
    if(d&&d!==t.date){t.date=d;sortTxns();ch=true;}
    if(ch){save();renderAll();}};
  ov.querySelector('#tDone').onclick=()=>{commit();ov.remove();};
  ov.querySelector('#tDel').onclick=()=>{ov.remove();done=true;const undo=deleteTxn(t);renderAll();toast('Transaction deleted',{action:'Undo',fn:()=>{undo();renderAll();}});};
  ov.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{
    t.cat=b.dataset.c;const np=normPayee(t.payee);if(np&&t.payee!==t.cat)S.payeeMap[np]=t.cat;
    commit();save();renderAll();ov.remove();});}

/* ---------- bar chart ---------- */
function barChart(labels,series,opts={}){
  const W=340,H=128,L=34,B=18,T=8,n=labels.length,bw=(W-L-8)/n;
  const all=series.flatMap(s=>s.values).concat(opts.budget||0);
  let max=Math.max(1,...all),min=Math.min(0,...all);
  const mag=Math.pow(10,Math.floor(Math.log10(Math.max(max,-min))));max=Math.ceil(max/mag)*mag;if(min<0)min=-Math.ceil(-min/mag)*mag;
  const y=v=>T+(H-T-B)*(1-(v-min)/(max-min||1));
  let g='';
  for(const v of[min,min+(max-min)/2,max].filter((v,i,a)=>a.indexOf(v)===i)){
    g+=`<line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="#eef0f3"/><text x="${L-4}" y="${y(v)+3}" text-anchor="end">${shortNum(v)}</text>`;}
  if(min<0)g+=`<line x1="${L}" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="#d9dce1"/>`;
  const per=series.length,gap=4,inner=(bw-gap*2)/per;
  labels.forEach((lb,i)=>{const x0=L+i*bw+gap;
    series.forEach((s,j)=>{const v=s.values[i];const c=typeof s.color==='function'?s.color(v):s.color;
      const y1=y(Math.max(v,0)),y2=y(Math.min(v,0));
      g+=`<rect x="${x0+j*inner+1}" y="${y1}" width="${Math.max(inner-2,2)}" height="${Math.max(y2-y1,v?1.5:0)}" rx="2" fill="${c}" opacity="${i===n-1?1:.55}"/>`;});
    g+=`<text x="${x0+(bw-gap*2)/2}" y="${H-4}" text-anchor="middle" ${i===n-1?'style="fill:#6b717b;font-weight:600"':''}>${esc(lb)}</text>`;});
  if(opts.budget)g+=`<line x1="${L}" x2="${W}" y1="${y(opts.budget)}" y2="${y(opts.budget)}" stroke="#9aa0aa" stroke-dasharray="4 3"/><text x="${W-2}" y="${y(opts.budget)-3}" text-anchor="end">budget</text>`;
  return`<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">${g}</svg>`;}
function shortNum(v){const a=Math.abs(v);const s=a>=1e6?(a/1e6).toFixed(1).replace(/\.0$/,'')+'M':a>=1e3?(a/1e3).toFixed(a>=1e4?0:1).replace(/\.0$/,'')+'k':String(Math.round(a));return(v<0?'-':'')+'$'+s;}
function lastPeriods(type,anc,n){const out=[];let a=new Date(anc);for(let i=0;i<n;i++){out.unshift({r:periodRange(type,a),lbl:periodLabel(type,a,true)});a=shiftPeriod(type,a,-1);}return out;}

/* ---------- category / account / income detail ---------- */
function openDetail(sel){
  let type=S.prefs.period,anc=new Date(anchor),limit=150;
  const page=pushPage('detail',el=>{
    const ent=sel.type==='cat'?S.cats[sel.name]:sel.type==='acct'?S.accounts[sel.name]:S.incomes[sel.name];
    if(!ent){popPage(page);return;}
    const all=sel.type==='cat'?S.txns.filter(t=>t.kind==='exp'&&t.cat===sel.name):
              sel.type==='income'?S.txns.filter(t=>t.kind==='inc'&&t.src===sel.name):
              S.txns.filter(t=>t.acct===sel.name||t.from===sel.name||t.to===sel.name);
    const r=periodRange(type,anc),tx=all.filter(t=>inRange(t,r)),cur=domCur(tx.length?tx:all);
    const val=t=>sel.type==='cat'?t.amount:sel.type==='income'?t.amount:txnSigned(t,sel);
    const per=lastPeriods(type,anc,6);
    const vals=per.map(p=>Math.round(all.filter(t=>inRange(t,p.r)&&(t.cur||'USD')===cur).reduce((s,t)=>s+val(t),0)));
    const total=tx.filter(t=>(t.cur||'USD')===cur).reduce((s,t)=>s+val(t),0);
    const title=sel.type==='cat'?'Expenses':sel.type==='acct'?'Cashflow':'Income';
    const budget=sel.type==='cat'?budgetFor(sel.name,type):0;
    const sc=el.querySelector('.scroll'),st=sc?sc.scrollTop:0;
    el.innerHTML=`<div class="nav"><button class="back">${ic('back',2)}</button>
      <div class="filterbox"><span class="chip ${sel.type}"><span>${esc(sel.name)}</span><b>✕</b></span></div>
      <button class="navbtn" data-a="period">${ic('cal')}</button></div>
      <div class="scroll">
      <button class="pill" data-a="edit">Edit</button>
      <div class="chartcard"><div class="charthead"><span style="text-transform:uppercase">${title}</span>
        <span style="display:flex;gap:2px;align-items:center"><button data-a="prev" style="padding:2px 10px">‹</button><b style="font-weight:500">${periodLabel(type,anc)}</b><button data-a="next" style="padding:2px 10px">›</button></span></div>
        <div class="chart">${barChart(per.map(p=>p.lbl),[{values:vals,color:sel.type==='cat'?'#f3374a':sel.type==='income'?'#2dca73':v=>v<0?'#f3374a':'#2dca73'}],{budget})}</div></div>
      ${sel.type==='acct'?`<div class="totalrow"><span class="k">Balance</span><span class="v num">${fmtS(ent.balance,ent.currency)}</span></div>`:''}
      <div class="totalrow"><span class="k">Total</span>${budget?`<span class="num" style="margin-right:14px">budget ${fmt(Math.round(budget),cur)}</span>`:''}<span class="v num" style="color:${sel.type==='cat'&&budget&&total>budget?'var(--red)':''}">${sel.type==='acct'?fmtS(Math.round(total*100)/100,cur):fmt(total,cur)}</span></div>
      <div class="list">${dayListHTML(tx,sel,limit)}</div><div style="height:40px"></div></div>`;
    el.querySelector('.scroll').scrollTop=st;
    el.querySelector('.back').onclick=()=>popPage(page);
    el.querySelector('.chip').onclick=()=>popPage(page);
    el.querySelector('[data-a=edit]').onclick=()=>openForm(sel.type,sel.name);
    el.querySelector('[data-a=prev]').onclick=()=>{anc=shiftPeriod(type,anc,-1);page._render();};
    el.querySelector('[data-a=next]').onclick=()=>{anc=shiftPeriod(type,anc,1);page._render();};
    el.querySelector('[data-a=period]').onclick=()=>periodSheet(type,t=>{type=t;page._render();});
    wireRows(el.querySelector('.list'),()=>{limit+=300;page._render();});});}

/* ---------- feed ---------- */
const REPORTS={ei:'Expenses and income',exp:'Expenses',inc:'Income',cash:'Cashflow'};
function openFeed(){
  let type=S.prefs.period,anc=new Date(anchor),q='',report='ei',limit=200;
  const page=pushPage('feed',el=>{
    const r=periodRange(type,anc);
    const match=t=>!q||[t.payee,t.note,t.cat,t.src,t.acct,t.from,t.to].join(' ').toLowerCase().includes(q);
    const all=S.txns.filter(match),tx=all.filter(t=>inRange(t,r)),cur=domCur(tx.length?tx:S.txns);
    const sum=(list,k)=>list.filter(t=>t.kind===k&&(t.cur||'USD')===cur).reduce((s,t)=>s+(k==='exp'?t.amount:t.amount),0);
    const exp=sum(tx,'exp'),inc=sum(tx,'inc');
    const per=lastPeriods(type,anc,6);
    const ser=per.map(p=>{const l=all.filter(t=>inRange(t,p.r));return{e:Math.round(sum(l,'exp')),i:Math.round(sum(l,'inc'))};});
    const series=report==='ei'?[{values:ser.map(s=>s.i),color:'#2dca73'},{values:ser.map(s=>s.e),color:'#f3374a'}]:
      report==='exp'?[{values:ser.map(s=>s.e),color:'#f3374a'}]:report==='inc'?[{values:ser.map(s=>s.i),color:'#2dca73'}]:
      [{values:ser.map(s=>s.i-s.e),color:v=>v<0?'#f3374a':'#2dca73'}];
    const sc=el.querySelector('.scroll'),st=sc?sc.scrollTop:0;
    const hadFocus=document.activeElement&&document.activeElement.id==='fq';
    el.innerHTML=`<div class="nav"><button class="back">${ic('back',2)}</button>
      <div class="filterbox"><input id="fq" type="search" placeholder="Add a filter" value="${esc(q)}"></div>
      <button class="navbtn" data-a="period">${ic('cal')}</button></div>
      <div class="scroll">
      <div class="chartcard"><div class="charthead"><button class="drop" data-a="report">${REPORTS[report]}</button>
        <span style="display:flex;gap:2px;align-items:center"><button data-a="prev" style="padding:2px 10px">‹</button><b style="font-weight:500">${periodLabel(type,anc)}</b><button data-a="next" style="padding:2px 10px">›</button></span></div>
        <div class="chart">${barChart(per.map(p=>p.lbl),series)}</div></div>
      <div class="sumrows"><div class="sumrow exp"><span class="k">Expenses</span><span class="v num">${fmt(exp,cur)}</span></div>
        <div class="sumrow inc"><span class="k">Income</span><span class="v num">${fmt(inc,cur)}</span></div></div>
      <div class="list">${dayListHTML(tx,null,limit)}</div></div>
      <div class="foot"><div><div class="v num" style="color:${inc-exp<0?'var(--red)':'var(--green)'}">${fmtS(Math.round((inc-exp)*100)/100,cur)}</div><small style="text-align:left">balance</small></div>
        <div><div class="v num" style="color:var(--red)">-${fmt(exp,cur)}</div><small style="text-align:right">total</small></div></div>`;
    el.querySelector('.scroll').scrollTop=st;
    const fq=el.querySelector('#fq');
    if(hadFocus){fq.focus();fq.setSelectionRange(q.length,q.length);}
    let tmr;fq.oninput=e=>{clearTimeout(tmr);tmr=setTimeout(()=>{q=e.target.value.trim().toLowerCase();limit=200;page._render();},250);};
    el.querySelector('.back').onclick=()=>popPage(page);
    el.querySelector('[data-a=prev]').onclick=()=>{anc=shiftPeriod(type,anc,-1);page._render();};
    el.querySelector('[data-a=next]').onclick=()=>{anc=shiftPeriod(type,anc,1);page._render();};
    el.querySelector('[data-a=period]').onclick=()=>periodSheet(type,t=>{type=t;page._render();});
    el.querySelector('[data-a=report]').onclick=()=>actionSheet(Object.keys(REPORTS).map(k=>({label:REPORTS[k],on:k===report,fn:()=>{report=k;page._render();}})));
    wireRows(el.querySelector('.list'),()=>{limit+=300;page._render();});});}

/* ---------- green add / edit form ---------- */
const FORM_TXT={cat:['What do you spend money on?','Expense category','svg:tag'],
  acct:['Where do you keep your money?','Account','svg:card'],income:['Where does your money come from?','Income source','svg:coins']};
function openForm(kind,name){
  const ent=name?(kind==='cat'?S.cats[name]:kind==='acct'?S.accounts[name]:S.incomes[name]):null;
  let icon=ent?ent.icon:FORM_TXT[kind][2],nm=name||'',
      amount=ent?(kind==='cat'?ent.budget||'':kind==='acct'?ent.balance:''):'';
  const linked=kind==='acct'&&name&&Object.values(S.sfLinks).includes(name);
  const page=pushPage('gform',el=>{
    el.innerHTML=`<div class="etop"><button class="navbtn" data-a="x">${ic('close')}</button><button class="navbtn" data-a="ok">${ic('check',2)}</button></div>
      <div class="scroll"><h2>${FORM_TXT[kind][0]}</h2>
      <button class="gicon" data-a="icon">${renderIcon(icon)}</button>
      <div class="gtabs"><div class="on">${FORM_TXT[kind][1]}</div></div>
      <div class="gfield"><input id="gName" placeholder="Enter name" value="${esc(nm)}" maxlength="40"><span class="cur">$</span></div>
      ${kind==='cat'?`<div class="gfield"><input id="gAmt" type="number" inputmode="decimal" placeholder="Planning to spend" value="${amount}"><span class="suf">per month</span></div>`:''}
      ${kind==='acct'?`<div class="gfield"><input id="gAmt" type="number" inputmode="decimal" placeholder="Current balance" value="${amount}" ${linked?'disabled':''}><span class="suf">${linked?'from bank':'balance'}</span></div>`:''}
      ${name?`<button class="gdanger" data-a="del">Delete ${kind==='cat'?'category':kind==='acct'?'account':'income source'}</button>`:''}
      </div>`;
    const nameIn=el.querySelector('#gName'),amtIn=el.querySelector('#gAmt');
    nameIn.oninput=e=>nm=e.target.value;if(amtIn)amtIn.oninput=e=>amount=e.target.value;
    el.querySelector('[data-a=x]').onclick=()=>popPage(page);
    el.querySelector('[data-a=icon]').onclick=()=>iconPicker(el,icon,v=>{icon=v;el.querySelector('.gicon').innerHTML=renderIcon(v);});
    const del=el.querySelector('[data-a=del]');if(del)del.onclick=()=>confirmDelete(kind,name,()=>popPage(page));
    el.querySelector('[data-a=ok]').onclick=()=>{
      const n=nm.trim();
      if(!n){alertBox('Alert','Please, enter name');return;}
      const store=kind==='cat'?S.cats:kind==='acct'?S.accounts:S.incomes;
      if(n!==name&&Object.keys(store).some(k=>k.toLowerCase()===n.toLowerCase())){alertBox('Alert',`"${n}" already exists.`);return;}
      const a=parseFloat(amount);
      if(name){if(n!==name)renameEntity(kind,name,n);store[n].icon=icon;}
      else if(kind==='cat')ensureCat(n,icon);
      else if(kind==='acct')ensureAcct(n,{icon,manual:true,hidden:false});
      else ensureIncome(n,icon);
      if(kind==='cat')S.cats[canonCat(n)].budget=a>0?a:0;
      if(kind==='acct'&&!linked&&!isNaN(a))S.accounts[n].balance=a;
      save();popPage(page);renderAll();};
    if(!name)setTimeout(()=>nameIn.focus(),350);
  },{up:true});
  page._noRerender=true;}
function iconPicker(host,cur,cb){
  const d=document.createElement('div');d.className='iconpick';
  d.innerHTML=`<div class="igrid">${ICON_CHOICES.map(k=>`<button data-i="svg:${k}" class="${cur==='svg:'+k?'on':''}">${renderIcon('svg:'+k)}</button>`).join('')}</div><button class="cancel">Cancel</button>`;
  d.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{cb(b.dataset.i);d.remove();});
  d.querySelector('.cancel').onclick=()=>d.remove();host.appendChild(d);}
function renameEntity(kind,old,nw){
  const ren=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k===old?nw:k,v]));
  if(kind==='cat'){S.cats=ren(S.cats);for(const t of S.txns)if(t.kind==='exp'&&t.cat===old)t.cat=nw;
    for(const k in S.payeeMap)if(S.payeeMap[k]===old)S.payeeMap[k]=nw;}
  else if(kind==='acct'){S.accounts=ren(S.accounts);
    for(const t of S.txns){if(t.acct===old)t.acct=nw;if(t.from===old)t.from=nw;if(t.to===old)t.to=nw;}
    for(const id in S.sfLinks)if(S.sfLinks[id]===old)S.sfLinks[id]=nw;}
  else{S.incomes=ren(S.incomes);for(const t of S.txns)if(t.kind==='inc'&&t.src===old)t.src=nw;}}
function confirmDelete(kind,name,after){
  const n=S.txns.filter(t=>kind==='cat'?t.kind==='exp'&&t.cat===name:kind==='income'?t.kind==='inc'&&t.src===name:
    t.acct===name||t.from===name||t.to===name).length;
  const keepLbl=kind==='acct'?'Only hide icon':'Only delete icon';
  const done=()=>{waitBox('We are saving your changes, please wait…',500);renderAll();if(after)after();};
  alertBox(`Delete "${name}"`,`By deleting "${name}" you want to:`,[
    {label:keepLbl,fn:()=>{
      if(kind==='cat'){if(name==='Other expenses'){toast('"Other expenses" collects uncategorized spending and can’t be removed.');return;}
        const fb=ensureCat('Other expenses');for(const t of S.txns)if(t.kind==='exp'&&t.cat===name)t.cat=fb;
        for(const k in S.payeeMap)if(S.payeeMap[k]===name)S.payeeMap[k]=fb;delete S.cats[name];assignOrders(S);}
      else if(kind==='income'){const fb=ensureIncome(name.toLowerCase()==='other'?'Other income':'Other');
        for(const t of S.txns)if(t.kind==='inc'&&t.src===name)t.src=fb;delete S.incomes[name];}
      else S.accounts[name].hidden=true;
      save();done();}},
    {label:`Delete all transactions${n?` (${n})`:''}`,red:true,fn:()=>{
      const gone=S.txns.filter(t=>kind==='cat'?t.kind==='exp'&&t.cat===name:kind==='income'?t.kind==='inc'&&t.src===name:t.acct===name||t.from===name||t.to===name);
      for(const t of gone)[t.uid,t.uid2].forEach(u=>{if(u&&u[0]!=='?'){S.deleted[u]=1;delete S.seenIds[u];}});
      const set=new Set(gone);S.txns=S.txns.filter(t=>!set.has(t));
      if(kind==='cat'&&name!=='Other expenses'){delete S.cats[name];assignOrders(S);}
      else if(kind==='income')delete S.incomes[name];
      else if(kind==='acct'){delete S.accounts[name];for(const id in S.sfLinks)if(S.sfLinks[id]===name){delete S.sfLinks[id];delete S.sfAccounts[id];}}
      save();done();}},
    {label:'Cancel',bold:true}]);}

/* ---------- drawer ---------- */
function renderDrawer(){
  const d=$('#drawer');if(!d)return;
  const nb=Object.keys(S.sfLinks).length;
  d.innerHTML=`<div class="who"><div class="av">${ic('user')}</div><div>DachaMoney<small>${S.accessUrl?`Bank sync on · ${nb} account${nb===1?'':'s'}`:'Bank not connected'}</small></div></div>
    <button class="item" data-go="feed">${ic('feed')}Feed</button>
    <button class="item" data-go="settings">${ic('gear')}Settings</button>
    <button class="item" data-go="help">${ic('mail')}Help</button>
    <button class="syncrow ${syncing?'spin':''}" data-go="sync">${ic('sync')}<div>${S.accessUrl?'Synchronize data':'Connect your bank'}<small>${syncing?'Syncing…':S.lastSync?'Last sync '+ago(S.lastSync):'Never synced'}</small></div></button>`;
  d.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const g=b.dataset.go;
    if(g==='sync'){if(S.accessUrl)runSync(true);else{closeDrawer();openSettings();}return;}
    closeDrawer();if(g==='feed')openFeed();else if(g==='settings')openSettings();else openHelp();});}
function openDrawer(){renderDrawer();$('#drawer').classList.add('open');$('#drawerBg').classList.add('open');}
function closeDrawer(){$('#drawer').classList.remove('open');$('#drawerBg').classList.remove('open');}

/* ---------- settings ---------- */
const sic=(icon,color)=>`<span class="sic" style="background:${color}">${ic(icon,2)}</span>`;
const tog=(id,on)=>`<label class="toggle"><input type="checkbox" id="${id}" ${on?'checked':''}><i></i></label>`;
function openSettings(){
  let msg='',msgCls='',showTok=!S.accessUrl;
  const page=pushPage('settings',el=>{
    const linked=Object.keys(S.sfAccounts).filter(id=>S.sfLinks[id]);
    const acctNames=Object.keys(S.accounts);
    const sc=el.querySelector('.scroll'),st=sc?sc.scrollTop:0;
    el.innerHTML=`<div class="nav"><button class="back">${ic('back',2)}</button><div class="title">Settings</div><div style="width:34px"></div></div>
    <div class="scroll set">
      <div class="sgroup"><h4>Bank connection</h4><div class="box">
        <div class="srow">${sic('bank','#2dca73')}<div class="sl">SimpleFIN Bridge<small>${S.accessUrl?`Connected · ${linked.length} bank account${linked.length===1?'':'s'}`:'Not connected'}</small></div>
          ${S.accessUrl?`<span class="sv">${S.lastSync?ago(S.lastSync):''}</span>`:''}</div>
        ${showTok?`<div class="sform"><input id="sfToken" placeholder="Paste setup token" autocomplete="off" autocapitalize="off" spellcheck="false">
          <button class="btn" id="btnConnect">Connect</button></div>`:''}
        ${S.accessUrl?`<button class="srow btnrow" id="btnSync">${syncing?'Syncing…':'Sync now'}</button>
          <div class="srow">${sic('sync','#33b8ee')}<div class="sl">Sync automatically<small>Every time you open the app (at most once an hour)</small></div>${tog('pAuto',S.prefs.autoSync)}</div>
          <div class="srow">${sic('cal','#ff9330')}<div class="sl">Show pending charges<small>Count card charges the moment they happen. Each one updates to the final amount (tip included) when it posts.</small></div>${tog('pPend',S.prefs.pending!==false)}</div>`:''}
      </div>
      <div class="sfoot ${msgCls}">${msg?esc(msg).replace(/\n/g,'<br>'):S.accessUrl?(S.lastSyncMsg?'Last sync: '+esc(S.lastSyncMsg):''):
        'Connect once and new card and bank transactions arrive by themselves, already sorted into categories. See Help for the 3-minute setup.'}</div></div>

      ${linked.length?`<div class="sgroup"><h4>Bank accounts → coins</h4><div class="box">
        ${linked.map(id=>{const a=S.sfAccounts[id];return`<div class="srow"><div class="sl">${esc((a.org?a.org+' · ':'')+a.name)}<small class="num">${fmtS(a.balance,a.currency)}</small></div>
          <span class="selwrap"><select data-link="${esc(id)}">${acctNames.map(n=>`<option ${S.sfLinks[id]===n?'selected':''}>${esc(n)}</option>`).join('')}</select>›</span></div>`;}).join('')}
      </div><div class="sfoot">Pick which coin each bank account feeds. Transactions already synced move with it.</div></div>`:''}

      <div class="sgroup"><h4>Accounts on home screen</h4><div class="box">
        ${acctNames.length?acctNames.map(n=>{const a=S.accounts[n];return`<div class="srow"><span class="sic" style="background:var(--yellow)">${renderIcon(a.icon)}</span><div class="sl">${esc(n)}<small class="num">${fmtS(a.balance,a.currency)}</small></div>${tog('',!a.hidden).replace('type="checkbox"',`type="checkbox" data-vis="${esc(n)}"`)}</div>`;}).join(''):
        '<div class="srow"><div class="sl"><small>No accounts yet. They appear after the first sync or CSV import.</small></div></div>'}
      </div></div>

      <div class="sgroup"><h4>Report period</h4><div class="box">
        <button class="srow link" id="pPeriod">${sic('cal','#ff9330')}<div class="sl">Periods</div><span class="sv">${S.prefs.period[0].toUpperCase()+S.prefs.period.slice(1)}</span></button>
      </div></div>

      <div class="sgroup"><h4>Personalization</h4><div class="box">
        <div class="srow">${sic('eye','#2dca73')}<div class="sl">Display budget</div>${tog('pBud',S.prefs.showBudget)}</div>
        <div class="srow">${sic('palette','#f3374a')}<div class="sl">Colored overspendings</div>${tog('pOver',S.prefs.colorOver)}</div>
        <div class="srow">${sic('text','#1a82fb')}<div class="sl">Larger fonts</div>${tog('pLarge',S.prefs.largeFont)}</div>
      </div></div>

      <div class="sgroup"><h4>Data</h4><div class="box">
        <div class="srow link">${sic('file','#8e8e93')}<div class="sl">Import CoinKeeper CSV<small>Duplicates are skipped, so it's safe to run again</small></div><input type="file" id="csvFile" accept=".csv,text/csv"></div>
        <button class="srow link" id="btnExport">${sic('download','#8e8e93')}<div class="sl">Export CSV</div></button>
        <button class="srow link" id="btnBackup">${sic('download','#1a82fb')}<div class="sl">Download backup<small>Everything: transactions, budgets, bank connection</small></div></button>
        <div class="srow link">${sic('upload','#1a82fb')}<div class="sl">Restore backup</div><input type="file" id="bkFile" accept=".json,application/json"></div>
      </div><div class="sfoot" id="dataStats">${S.txns.length.toLocaleString()} transactions · ${Object.keys(S.cats).length} categories · saved on this device</div></div>

      <div class="sgroup"><div class="box">
        ${S.accessUrl?`<button class="srow danger" id="btnDisconnect">Disconnect bank</button>`:''}
        <button class="srow danger" id="btnReset">Erase everything on this device</button>
      </div></div>
    </div>`;
    el.querySelector('.scroll').scrollTop=st;
    const say=(m,c)=>{msg=m;msgCls=c||'';page._render();};
    el.querySelector('.back').onclick=()=>popPage(page);
    const bc=el.querySelector('#btnConnect');
    if(bc)bc.onclick=async()=>{const raw=el.querySelector('#sfToken').value.trim();
      if(!raw){say('Paste the setup token from SimpleFIN Bridge first.','err');return;}
      bc.textContent='Connecting…';
      try{S.accessUrl=looksLikeToken(raw)?await claimToken(raw):raw;S.lastSync=0;save();showTok=false;
        say('Connected. Pulling your transactions…','ok');
        const r=await syncNow();syncErr=r.ok?'':r.msg;renderAll();say(r.ok?'Connected. '+r.msg:r.msg,r.ok?'ok':'err');}
      catch(e){say(/Failed to fetch|Load failed/i.test(e.message)?'Could not reach SimpleFIN. Check your internet connection and try again.':e.message,'err');}};
    const bs=el.querySelector('#btnSync');
    if(bs)bs.onclick=async()=>{bs.textContent='Syncing…';const r=await syncNow();syncErr=r.ok?'':r.msg;renderAll();say(r.msg,r.ok?'ok':'err');};
    const pa=el.querySelector('#pAuto');if(pa)pa.onchange=e=>{S.prefs.autoSync=e.target.checked;save();};
    const pp=el.querySelector('#pPend');if(pp)pp.onchange=e=>{S.prefs.pending=e.target.checked;save();};
    el.querySelectorAll('[data-link]').forEach(s=>s.onchange=()=>{const id=s.dataset.link,old=S.sfLinks[id],nw=s.value;
      if(old===nw)return;S.sfLinks[id]=nw;
      const a=S.sfAccounts[id];if(a)Object.assign(S.accounts[nw],{balance:a.balance,currency:a.currency,manual:false,hidden:false});
      relinkTxns(old,nw);save();renderAll();});
    el.querySelectorAll('[data-vis]').forEach(c=>c.onchange=()=>{S.accounts[c.dataset.vis].hidden=!c.checked;save();renderAll();});
    el.querySelector('#pPeriod').onclick=()=>periodSheet(S.prefs.period,t=>{S.prefs.period=t;save();renderAll();});
    el.querySelector('#pBud').onchange=e=>{S.prefs.showBudget=e.target.checked;save();renderAll();};
    el.querySelector('#pOver').onchange=e=>{S.prefs.colorOver=e.target.checked;save();renderAll();};
    el.querySelector('#pLarge').onchange=e=>{S.prefs.largeFont=e.target.checked;document.body.classList.toggle('large',S.prefs.largeFont);save();};
    el.querySelector('#csvFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;
      try{const r=importCoinKeeper(await f.text());renderAll();
        say(`Imported ${r.added} rows: ${r.exp} expenses, ${r.inc} income, ${r.tf} transfers (${r.skipped} duplicates skipped).`,'ok');}
      catch(err){say(err.message,'err');}};
    el.querySelector('#btnExport').onclick=exportCSV;
    el.querySelector('#btnBackup').onclick=downloadBackup;
    el.querySelector('#bkFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;
      const text=await f.text();
      alertBox('Restore backup?','This replaces everything currently in the app with the backup.',[
        {label:'Restore',red:true,fn:()=>{try{const n=restoreBackup(text);document.body.classList.toggle('large',S.prefs.largeFont);renderAll();say(`Restored ${n.toLocaleString()} transactions.`,'ok');}catch(err){say(err.message,'err');}}},
        {label:'Cancel',bold:true}]);};
    const bd=el.querySelector('#btnDisconnect');
    if(bd)bd.onclick=()=>alertBox('Disconnect bank?','Transactions already here stay. New ones stop arriving until you connect again.',[
      {label:'Disconnect',red:true,fn:()=>{S.accessUrl=null;S.lastSync=0;S.lastSyncMsg='';showTok=true;save();renderAll();}},{label:'Cancel',bold:true}]);
    el.querySelector('#btnReset').onclick=()=>alertBox('Erase everything?','All transactions, budgets and the bank connection are removed from this device. Download a backup first if you might want them back.',[
      {label:'Erase',red:true,fn:()=>{localStorage.removeItem(LS_KEY);S=blank();showTok=true;save();renderAll();}},{label:'Cancel',bold:true}]);});}
function relinkTxns(old,nw){
  /* Synced rows record the coin they were filed under, so moving a bank account moves its synced rows too. */
  for(const t of S.txns){if(t.uid[0]!=='s')continue;
    if(t.acct===old)t.acct=nw;if(t.from===old)t.from=nw;if(t.to===old)t.to=nw;}}

/* ---------- help ---------- */
function openHelp(){
  const page=pushPage('help',el=>{
    el.innerHTML=`<div class="nav"><button class="back">${ic('back',2)}</button><div class="title">Help</div><div style="width:34px"></div></div>
    <div class="scroll help">
      <h3>Connect your bank (once)</h3>
      <ol><li>Sign up at <b>bridge.simplefin.org</b> (about $1.50 a month).</li>
      <li>Add each bank and credit card there. SimpleFIN handles the bank logins; this app never sees your passwords.</li>
      <li>In SimpleFIN, open <b>Apps → New connection</b> and copy the <b>setup token</b>.</li>
      <li>Here: Settings → Bank connection → paste the token → <b>Connect</b>.</li></ol>
      <p>From then on, new transactions arrive whenever you open the app. Pull them on demand from the menu with <b>Synchronize data</b>, or tap the sync status next to the month.</p>
      <h3>What happens to synced transactions</h3>
      <ul style="padding-left:20px"><li>Each one is filed into a category from the merchant type and payees you've sorted before. Move one to another category and that payee follows from then on.</li>
      <li>Card charges appear while still <b>pending</b>, so today's total is real. When the bank posts the final charge (for example a restaurant bill with the tip added), the same entry updates to the final amount. It is never counted twice, and a hold that gets released disappears by itself.</li>
      <li>Card payments from checking show as transfers, not as spending.</li>
      <li>Refunds on a card reduce that category's spending.</li>
      <li>Anything you already entered by hand or imported from CoinKeeper is matched, not duplicated.</li></ul>
      <h3>Keep your data</h3>
      <p>Everything is stored on this phone, tied to this web address. Add the app to your Home Screen (Safari → Share → Add to Home Screen) and always open it from that icon. Download a backup from Settings now and then.</p>
      <h3>Gestures</h3>
      <ul style="padding-left:20px"><li>Drag an account onto a category to record spending, income onto an account to record income, and one account onto another for a transfer.</li>
      <li>Hold any coin to edit, reorder (drag categories) or delete.</li>
      <li>Swipe a transaction left to delete it.</li></ul>
    </div>`;
    el.querySelector('.back').onclick=()=>popPage(page);});}

/* ---------- sheets, alerts, toast ---------- */
function overlay(html,opts={}){
  const ov=document.createElement('div');ov.className='ov'+(opts.center?' center':'');ov.innerHTML=html;
  ov.addEventListener('click',e=>{if(e.target===ov&&!opts.modal){if(opts.close)opts.close();ov.remove();}});
  $('#overlay').appendChild(ov);return ov;}
function actionSheet(items,title){
  const ov=overlay(`<div class="asheet"><div class="grp">${title?`<div class="ttl">${esc(title)}</div>`:''}${items.map((it,i)=>`<button data-i="${i}" class="${it.on?'on':''} ${it.red?'red':''}">${esc(it.label)}</button>`).join('')}</div>
    <div class="grp"><button class="cancel">Cancel</button></div></div>`);
  ov.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{ov.remove();items[+b.dataset.i].fn();});
  ov.querySelector('.cancel').onclick=()=>ov.remove();}
function periodSheet(cur,cb){
  actionSheet(PERIODS.map(p=>({label:{week:'Weeks',month:'Months',quarter:'Quarters',year:'Years'}[p],on:p===cur,fn:()=>cb(p)})),'Period');}
function alertBox(title,msg,buttons){
  buttons=buttons||[{label:'OK',bold:true}];
  const ov=overlay(`<div class="alert"><div class="at"><b>${esc(title)}</b><span>${esc(msg)}</span></div>
    ${buttons.map((b,i)=>`<button data-i="${i}" class="${b.bold?'bold':''} ${b.red?'red':''}">${esc(b.label)}</button>`).join('')}</div>`,{center:true,modal:true});
  ov.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{ov.remove();const f=buttons[+b.dataset.i].fn;if(f)f();});}
function waitBox(msg,ms){const ov=overlay(`<div class="alert wait"><div class="at"><span style="font-size:15px">${esc(msg)}</span></div></div>`,{center:true,modal:true});
  setTimeout(()=>ov.remove(),ms);}
let toastTimer;
function toast(msg,act){const old=document.querySelector('.toast');if(old)old.remove();
  const t=document.createElement('div');t.className='toast';t.textContent=msg;
  if(act){const b=document.createElement('button');b.textContent=act.action;b.style.cssText='color:#7fd3ff;margin-left:12px;font-weight:600';
    b.onclick=()=>{t.remove();act.fn();};t.appendChild(b);}
  document.body.appendChild(t);clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.remove(),act?5000:3500);}

/* ================= wiring ================= */
$('#menuBtn').innerHTML=ic('menu',2);$('#collapseBtn').innerHTML=ic('up',2);
$('#menuBtn').onclick=openDrawer;$('#drawerBg').onclick=closeDrawer;
$('#collapseBtn').onclick=function(){document.body.classList.toggle('collapsed');
  this.firstElementChild.style.transform=document.body.classList.contains('collapsed')?'rotate(180deg)':'';};
$('#prevP').onclick=()=>{anchor=shiftPeriod(S.prefs.period,anchor,-1);renderHome();};
$('#nextP').onclick=()=>{anchor=shiftPeriod(S.prefs.period,anchor,1);renderHome();};
$('#periodLbl').onclick=()=>periodSheet(S.prefs.period,t=>{S.prefs.period=t;anchor=new Date();save();renderAll();});
$('#syncDot').onclick=()=>runSync(true);
$('#todayDot').onclick=()=>openFeed();
$('#editDone').onclick=exitEdit;
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){
  renderHome();autoSync();}});

document.body.classList.toggle('large',!!S.prefs.largeFont);
probeStorage();
renderAll();
autoSync();
