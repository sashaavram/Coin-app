/* ================= SimpleFIN bank sync =================
   SimpleFIN Bridge answers browser requests directly (it sends CORS headers),
   so the app talks to it from the phone with no server of its own.
   The proxy URL setting is only a fallback. */
const SYNC_EVERY_MS=60*60*1000;     /* auto-sync at most once an hour */
const FIRST_SYNC_DAYS=89;           /* SimpleFIN serves at most 90 days per request */
const OVERLAP_DAYS=10;              /* re-read this many days before the last sync */

function looksLikeToken(s){return!/^https?:\/\//.test(s.trim());}
async function claimToken(token){
  let claimUrl;
  try{claimUrl=atob(token.trim());}catch(e){throw new Error('That is not a SimpleFIN setup token. Copy the whole token.');}
  if(!/^https?:\/\//.test(claimUrl))throw new Error('That does not decode to a claim URL. Copy the full setup token.');
  const resp=await fetch(claimUrl,{method:'POST'});
  if(!resp.ok)throw new Error('Claim failed: HTTP '+resp.status+'. Setup tokens work once only, so make a fresh one in SimpleFIN Bridge.');
  const accessUrl=(await resp.text()).trim();
  if(!/^https?:\/\//.test(accessUrl))throw new Error('Unexpected claim response.');
  return accessUrl;}
function splitAccess(u0){const u=new URL(u0);
  return{auth:btoa(decodeURIComponent(u.username)+':'+decodeURIComponent(u.password)),
    base:u.origin+u.pathname,path:u.pathname};}
async function sfGet(q){const{auth,base,path}=splitAccess(S.accessUrl);
  const target=S.proxyUrl?S.proxyUrl.replace(/\/$/,'')+path+q:base+q;
  const resp=await fetch(target,{headers:{Authorization:'Basic '+auth}});
  if(resp.status===403)throw new Error('SimpleFIN refused the connection (403). Reconnect with a new setup token.');
  if(resp.status===402)throw new Error('SimpleFIN says the subscription needs payment (402).');
  if(!resp.ok)throw new Error('SimpleFIN HTTP '+resp.status);
  return resp.json();}

/* The bridge recommends asking for at most 45 days at a time, so longer
   ranges are fetched in windows and merged per account. */
const WINDOW_DAYS=45;
async function sfFetchRange(start,end){
  const wins=[];for(let e=end;e>start;){const s=Math.max(start,e-WINDOW_DAYS*86400);wins.unshift([s,e]);e=s;}
  const out={errors:[],accounts:[]},byId={};
  for(const[s,e]of wins){
    const p=await sfGet(`/accounts?start-date=${s}&end-date=${e}`);
    for(const m of p.errors||[])if(!out.errors.includes(m))out.errors.push(m);
    for(const a of p.accounts||[]){
      if(!byId[a.id]){byId[a.id]={...a,transactions:[]};out.accounts.push(byId[a.id]);}
      const prev=byId[a.id].transactions;
      Object.assign(byId[a.id],a,{transactions:prev.concat(a.transactions||[])});}}
  return out;}

/* ---- account linking ---- */
const CREDIT_RE=/credit|card|amex|american express|visa|mastercard|discover|sapphire|freedom|platinum|gold card/i;
function isCreditAcct(name){
  const sfId=Object.keys(S.sfLinks).find(id=>S.sfLinks[id]===name);
  const sf=sfId&&S.sfAccounts[sfId];
  if(sf&&CREDIT_RE.test((sf.org||'')+' '+sf.name))return true;
  return CREDIT_RE.test(name)||(S.accounts[name]&&S.accounts[name].balance<0);}
function linkSfAccount(id,sfName,short){
  if(S.sfLinks[id]&&S.accounts[S.sfLinks[id]])return S.sfLinks[id];
  const t=sfName.toLowerCase();
  const taken=new Set(Object.values(S.sfLinks));
  const guesses=[[/american express|amex/,'AMEX'],[/chase/,'CHASE Credit'],
    [/bank of america.*(credit|card|cash rewards|travel rewards)/,'BOA credit'],[/bank of america|boa/,'BOA Debit'],[/citi/,'US CITI account']];
  let name=null;
  for(const[re,n]of guesses)if(re.test(t)&&S.accounts[n]&&!taken.has(n)){name=n;break;}
  if(!name){ /* fuzzy against existing names */
    for(const n in S.accounts){if(taken.has(n))continue;const nl=n.toLowerCase();
      if(t.includes(nl)||nl.includes(t.split(' ')[0])){name=n;break;}}}
  if(!name){ /* new coin: the bank's own account name, made unique if needed */
    let n=short||sfName;if(S.accounts[n])n=sfName;
    name=ensureAcct(n,{icon:CREDIT_RE.test(sfName)?'svg:card':'svg:bank'});}
  S.sfLinks[id]=name;return name;}

/* ---- categorization ---- */
const MCC_CATS=[
  [[5411,5422,5441,5451,5462,5499],'Groceries'],
  [[5812,5814],'Restaurants/Cafes'],[[5813,5921],'Alcohol/bars'],
  [[5541,5542,5172,7523,7538,7542,5532,5533],'Car'],
  [[4121],'Taxi'],[[4111,4131],'Taxi'],
  [[4814,4812],'Phone'],[[4899,5815,5816,5817,5818],'Internet/TV'],[[4900],'Utilities'],
  [[5912,8011,8021,8031,8041,8042,8043,8049,8050,8062,8071,8099],'Medical'],
  [[4511,4411,4722,7011,7012,3000],'Travel'],
  [[7941,7997,7992,5940,5941],'Sport'],
  [[5300,5310,5311,5331,5399,5611,5621,5631,5641,5651,5655,5661,5691,5699,5732,5734,5942,5943,5945,5947,5977,5999,5964,5965,5969,5200,5251,5261],'Shopping'],
  [[6211],'Investments']];
const MCC_MAP={};for(const[codes,c]of MCC_CATS)for(const n of codes)MCC_MAP[n]=c;
const KEYWORD_CATS=[[/safeway|raley|grocery|whole foods|trader joe|costco|winco|smith'?s|save mart|kroger|sprouts|aldi/,'Groceries'],
  [/chevron|shell|arco|maverik|fuel|\bgas\b|\b76\b|exxon|valero|jiffy lube|car wash/,'Car'],
  [/starbucks|coffee|peet|dutch bros|smoothie|jamba|boba/,'Coffee / Smoothie'],
  [/restaurant|grill|pizza|sushi|taco|doordash|ubereats|uber eats|grubhub|chipotle|mcdonald|cafe|burger|kitchen|diner/,'Restaurants/Cafes'],
  [/\bbar\b|brewery|liquor|total wine|whisky|winery|pub\b|tavern/,'Alcohol/bars'],
  [/netflix|spotify|soundcloud|hulu|youtube|apple\.com|icloud|ableton|splice|bandcamp|mixcloud|comcast|xfinity|spectrum|disney/,'Internet/TV'],
  [/amazon|amzn|target|walmart|best buy|ikea|home depot|lowe'?s|etsy|ebay/,'Shopping'],[/uber|lyft|taxi|cab\b/,'Taxi'],
  [/nv energy|pg&e|pge|water|utility|electric|sewer|waste/,'Utilities'],[/at&t|verizon|t-mobile|tmobile|mint mobile/,'Phone'],
  [/pharmacy|cvs|walgreens|medical|dental|clinic|hospital|doctor/,'Medical'],
  [/airline|airbnb|hotel|marriott|hilton|hyatt|expedia|southwest|united|delta|alaska air|jetblue|booking\.com/,'Travel'],
  [/rent\b|apartment|property mgmt|leasing/,'Rent'],[/gym|fitness|yoga|climbing|ski /,'Sport']];
function autoCat(payee,desc,mcc){
  const np=normPayee(payee||desc);
  if(np){if(S.payeeMap[np]&&S.cats[S.payeeMap[np]])return S.payeeMap[np];
    for(const k in S.payeeMap)if(k&&k.length>4&&(np.includes(k)||k.includes(np))&&S.cats[S.payeeMap[k]])return S.payeeMap[k];}
  const m=parseInt(mcc,10);
  if(m&&MCC_MAP[m])return ensureCat(MCC_MAP[m]);
  if(m>=3000&&m<=3999)return ensureCat('Travel'); /* airline & hotel brand codes */
  const t=((payee||'')+' '+(desc||'')).toLowerCase();
  for(const[re,c]of KEYWORD_CATS)if(re.test(t))return ensureCat(c);
  return ensureCat('Other expenses');}
function autoIncome(text){
  if(/payroll|direct dep|dir dep|salary|\badp\b|gusto|paychex|marriott|ritz/i.test(text))return ensureIncome('Salary');
  return ensureIncome('Other');}

/* ---- matching bank rows to things already in the app ---- */
const TRANSFER_RE=/payment|autopay|auto pay|epay|e-payment|online pmt|pmt\b|transfer|xfer|thank you|card services|crd\b|to savings|from savings|to checking|from checking/i;
const dayDiff=(a,b)=>Math.abs((new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/86400000);
/* Find an existing entry that is this same movement of money on this account:
   a CSV-imported or hand-entered row, or a transfer whose other side is still open. */
function findClaim(acct,signed,date){
  const amt=Math.abs(signed);
  let best=null,bestD=99;
  for(const t of S.txns){
    if(Math.abs(t.amount-(t.kind==='exp'&&signed>0?-amt:amt))>0.005)continue;
    const d=dayDiff(t.date,date);if(d>4||d>=bestD)continue;
    const local=(t.uid[0]==='c'||t.uid[0]==='m')&&!t.uid2;
    let ok=false;
    if(signed<0)ok=(t.kind==='exp'&&t.acct===acct&&local&&d<=3)||(t.kind==='tf'&&t.from===acct&&(local||t.uid2==='?out'));
    else ok=(t.kind==='inc'&&t.acct===acct&&local&&d<=3)||(t.kind==='tf'&&t.to===acct&&(local||t.uid2==='?in'))||
            (t.kind==='exp'&&t.acct===acct&&local&&d<=3);
    if(ok){best=t;bestD=d;}}
  return best;}
/* Which other account does "AMEX EPAYMENT" / "Payment to Chase card" refer to? */
function namedAccount(text,self){
  const t=text.toLowerCase();
  for(const id in S.sfLinks){const n=S.sfLinks[id];if(n===self||!S.accounts[n])continue;
    const sf=S.sfAccounts[id]||{};
    const keys=[n,sf.org,sf.name].filter(Boolean).map(x=>x.toLowerCase());
    if(/amex|american express/.test(keys.join(' ')))keys.push('amex','american express');
    if(/bank of america/.test(keys.join(' ')))keys.push('bank of america','bk of amer','boa');
    if(keys.some(k=>k.length>2&&t.includes(k.split(' ')[0])&&t.includes(k)))return n;}
  return null;}

let syncing=false;
async function syncNow(opts={}){
  if(!S.accessUrl)return{ok:false,msg:'Connect your bank (SimpleFIN) in Settings first.'};
  if(syncing)return{ok:false,msg:'Already syncing.'};
  syncing=true;onSyncState(true);
  try{
    const startDays=S.lastSync?Math.min(FIRST_SYNC_DAYS,Math.ceil((Date.now()-S.lastSync)/86400000)+OVERLAP_DAYS):FIRST_SYNC_DAYS;
    const start=Math.floor(Date.now()/1000)-startDays*86400;
    const data=await sfFetchRange(start,Math.floor(Date.now()/1000));

    /* 1. collect new rows from every account */
    const rows=[],batch=new Set(),fetched=new Set();
    for(const a of(data.accounts||[])){
      const org=a.org&&a.org.name||'';
      S.sfAccounts[a.id]={name:a.name||'',org,balance:parseFloat(a.balance||'0'),currency:a.currency||'USD',seen:Date.now()};
      const name=linkSfAccount(a.id,(org+' '+(a.name||'')).trim(),(a.name||org||'Bank').trim());
      Object.assign(S.accounts[name],{balance:parseFloat(a.balance||'0'),currency:a.currency||'USD',manual:false,hidden:false});
      for(const t of(a.transactions||[])){
        if(t.pending)continue;
        const uid=hid('s',a.id+'|'+t.id);
        fetched.add(uid);
        if(S.seenIds[uid]||S.deleted[uid]||batch.has(uid))continue;
        batch.add(uid);
        const amount=parseFloat(t.amount||'0');if(!amount)continue;
        const ts=t.transacted_at||t.posted||Date.now()/1000;
        rows.push({uid,acct:name,amount,date:isoDay(new Date(ts*1000)),
          payee:(t.payee||t.description||'').trim(),desc:(t.description||t.memo||'').trim(),mcc:t.mcc,cur:a.currency||'USD',done:false});}}

    let added=0,matched=0,transfers=0;
    const push=t=>{S.txns.push(t);S.seenIds[t.uid]=1;if(t.uid2&&t.uid2[0]!=='?')S.seenIds[t.uid2]=1;added++;};
    const text=r=>r.payee+' '+r.desc;

    /* 1b. the bank re-issued an ID: a synced row identical to this one whose old ID
       is no longer in the bank's data is the same transaction, so adopt the new ID */
    const since=isoDay(new Date(start*1000)),restamped=new Set();
    for(const r of rows){
      const x=S.txns.find(x=>{if(restamped.has(x)||x.date!==r.date||x.date<since||x.kind==='tf')return false;
        const f=x.uid[0]==='s'?'uid':x.uid2&&x.uid2[0]==='s'?'uid2':null;
        return f&&!fetched.has(x[f])&&x.acct===r.acct&&x.payee===r.payee&&
          Math.abs((x.kind==='inc'?x.amount:-x.amount)-r.amount)<0.005;});
      if(!x)continue;
      const f=x.uid[0]==='s'?'uid':'uid2';
      delete S.seenIds[x[f]];x[f]=r.uid;S.seenIds[r.uid]=1;restamped.add(x);r.done=true;}

    /* 2. rows that are the same money as something already in the app */
    for(const r of rows){if(r.done)continue;
      const c=findClaim(r.acct,r.amount,r.date);
      if(c){c.uid2=r.uid;S.seenIds[r.uid]=1;r.done=true;matched++;}}

    /* 3. pair transfers between my own accounts (card payments, savings moves) */
    const outs=rows.filter(r=>!r.done&&r.amount<0),ins=rows.filter(r=>!r.done&&r.amount>0);
    for(const o of outs){
      const i=ins.find(i=>!i.done&&i.acct!==o.acct&&Math.abs(i.amount+o.amount)<0.005&&dayDiff(i.date,o.date)<=5&&
        (TRANSFER_RE.test(text(o))||TRANSFER_RE.test(text(i))));
      if(!i)continue;
      o.done=i.done=true;transfers++;
      push({uid:o.uid,uid2:i.uid,date:o.date,kind:'tf',amount:-o.amount,from:o.acct,to:i.acct,payee:'Transfer',note:o.payee,cur:o.cur});}

    /* 4. one-sided transfers whose other account is named in the text */
    for(const r of rows){if(r.done||!TRANSFER_RE.test(text(r)))continue;
      const other=namedAccount(text(r),r.acct);if(!other)continue;
      r.done=true;transfers++;
      if(r.amount<0)push({uid:r.uid,uid2:'?in',date:r.date,kind:'tf',amount:-r.amount,from:r.acct,to:other,payee:'Transfer',note:r.payee,cur:r.cur});
      else push({uid:r.uid,uid2:'?out',date:r.date,kind:'tf',amount:r.amount,from:other,to:r.acct,payee:'Transfer',note:r.payee,cur:r.cur});}

    /* 5. everything else: spending, refunds, income */
    for(const r of rows){if(r.done)continue;
      if(r.amount<0)push({uid:r.uid,date:r.date,kind:'exp',amount:-r.amount,cat:autoCat(r.payee,r.desc,r.mcc),acct:r.acct,payee:r.payee,note:'',cur:r.cur});
      else if(isCreditAcct(r.acct)){ /* money back on a card is a refund: it reduces that category's spending */
        if(TRANSFER_RE.test(text(r))){push({uid:r.uid,uid2:'?out',date:r.date,kind:'tf',amount:r.amount,from:'',to:r.acct,payee:'Card payment',note:r.payee,cur:r.cur});transfers++;}
        else push({uid:r.uid,date:r.date,kind:'exp',amount:-r.amount,cat:autoCat(r.payee,r.desc,r.mcc),acct:r.acct,payee:r.payee,note:'Refund',cur:r.cur});}
      else push({uid:r.uid,date:r.date,kind:'inc',amount:r.amount,src:autoIncome(text(r)),acct:r.acct,payee:r.payee,note:'',cur:r.cur});}

    sortTxns();
    const errs=(data.errors||[]).filter(Boolean);
    S.lastSync=Date.now();
    S.lastSyncMsg=`${added} new`+(matched?`, ${matched} already here`:'')+(errs.length?' · '+errs.join('; '):'');
    save();
    return{ok:true,added,matched,transfers,errors:errs,msg:`${added} new transaction${added===1?'':'s'}`+
      (matched?` · ${matched} matched ones you already had`:'')+(errs.length?`\nBank notes: ${errs.join('; ')}`:'')};
  }catch(e){
    const msg=/Failed to fetch|NetworkError|Load failed/i.test(e.message)?'Could not reach SimpleFIN. Check your internet connection.':e.message;
    return{ok:false,msg};
  }finally{syncing=false;onSyncState(false);}
}
function syncDue(){return S.accessUrl&&S.prefs.autoSync&&Date.now()-S.lastSync>SYNC_EVERY_MS;}
