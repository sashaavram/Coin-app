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
async function sfFetchRange(start,end,pending){
  const wins=[];for(let e=end;e>start;){const s=Math.max(start,e-WINDOW_DAYS*86400);wins.unshift([s,e]);e=s;}
  const out={errors:[],accounts:[]},byId={};
  for(const[s,e]of wins){
    const p=await sfGet(`/accounts?start-date=${s}&end-date=${e}`+(pending?'&pending=1':''));
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
const COFFEE_RE=/starbucks|coffee|peet'?s|dutch bros|smoothie|jamba|boba|espresso|philz|blue bottle/;
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
  const t0=((payee||'')+' '+(desc||'')).toLowerCase();
  if(COFFEE_RE.test(t0))return ensureCat('Coffee / Smoothie'); /* banks file coffee shops under restaurants */
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

/* ---- pending charges ----
   A card charge first shows up as pending and can change before it posts: a
   restaurant adds the tip, a gas pump swaps its $1 hold for the real total.
   Pending charges are shown right away (flag `pend`) so today's spending is
   real, and each one is followed until the bank posts it:
     - same bank ID, now posted        -> take the final amount, clear the flag
     - ID gone, a posted charge on the same account looks like it (same
       merchant, or same amount)        -> it is that charge: adopt its ID and amount
     - ID gone and nothing matches      -> the hold was released: drop it after a few days
   Category, note and date chosen while it was pending are kept. */
const PEND_MATCH_DAYS=10;  /* a pending charge may post up to this many days later */
const PEND_DROP_DAYS=5;    /* a pending charge the bank stopped listing is dropped after this long */
/* The merchant's name leads a bank description; what follows (store number, city,
   state) is shared by unrelated merchants. So two descriptions are the same merchant
   when they start with the same name, ignoring card-processor prefixes. */
const PAYEE_PREFIX=new Set(['tst','sq','sqc','pos','pp','paypal','sp','dd','purchase','pending','debit','card','checkcard','authorized','recurring','the']);
function payeeKey(p){
  const w=normPayee(p).split(' ').filter(w=>w&&!/^\d+$/.test(w));
  while(w.length>1&&PAYEE_PREFIX.has(w[0]))w.shift();
  if(!w.length)return'';
  return w[0].length>=4||w.length<2?w[0]:w[0]+' '+w[1];}
function payeeSim(a,b){const ka=payeeKey(a),kb=payeeKey(b);
  return!!ka&&!!kb&&(ka===kb||(ka.length>=4&&kb.length>=4&&(ka.startsWith(kb)||kb.startsWith(ka))));}
const bankField=x=>x.uid[0]==='s'?'uid':x.uid2&&x.uid2[0]==='s'?'uid2':null;
const signedAmt=x=>x.kind==='inc'?x.amount:-x.amount;
function setBankAmount(x,amount){const v=Math.round((x.kind==='inc'?amount:-amount)*100)/100;
  const changed=Math.abs(v-x.amount)>0.005;x.amount=v;return changed;}

let syncing=false;
async function syncNow(opts={}){
  if(!S.accessUrl)return{ok:false,msg:'Connect your bank (SimpleFIN) in Settings first.'};
  if(syncing)return{ok:false,msg:'Already syncing.'};
  syncing=true;onSyncState(true);
  try{
    const now=Math.floor(Date.now()/1000),wantPending=S.prefs.pending!==false;
    /* read back to the oldest point any account was last known fresh, and far enough to cover open pending charges */
    let since=S.lastSync?S.lastSync/1000:0;
    if(since){for(const id in S.sfLinks){const b=(S.sfAccounts[id]||{}).bdate;if(b)since=Math.min(since,b);}
      for(const x of S.txns)if(x.pend)since=Math.min(since,new Date(x.date+'T12:00:00')/1000);}
    const startDays=since?Math.min(FIRST_SYNC_DAYS,Math.ceil((now-since)/86400)+OVERLAP_DAYS):FIRST_SYNC_DAYS;
    const start=now-startDays*86400;
    const data=await sfFetchRange(start,now,wantPending);

    let added=0,matched=0,transfers=0,pendingNew=0,finalized=0,dropped=0;
    const changes=[],remove=new Set(),settled=[];
    const push=t=>{S.txns.push(t);S.seenIds[t.uid]=1;if(t.uid2&&t.uid2[0]!=='?')S.seenIds[t.uid2]=1;added++;if(t.pend)pendingNew++;};
    const text=r=>r.payee+' '+r.desc;
    /* the bank posted a charge we were holding as pending */
    const settle=(x,amount)=>{
      const old=x.amount;
      if(setBankAmount(x,amount))changes.push(`${x.payee}: ${fmt(old,x.cur)} → ${fmt(x.amount,x.cur)}`);
      delete x.pend;finalized++;settled.push(x);};

    /* 1. collect rows from every account; charges we already hold as pending are updated in place */
    const pendById={};
    for(const x of S.txns)if(x.pend){const f=bankField(x);if(f)pendById[x[f]]=x;}
    const rows=[],batch=new Set(),fetched=new Set(),fresh={};
    for(const a of(data.accounts||[])){
      const org=a.org&&a.org.name||'',bdate=a['balance-date']||now;
      S.sfAccounts[a.id]={name:a.name||'',org,balance:parseFloat(a.balance||'0'),currency:a.currency||'USD',seen:Date.now(),bdate};
      const name=linkSfAccount(a.id,(org+' '+(a.name||'')).trim(),(a.name||org||'Bank').trim());
      Object.assign(S.accounts[name],{balance:parseFloat(a.balance||'0'),currency:a.currency||'USD',manual:false,hidden:false});
      fresh[name]=Math.max(fresh[name]||0,bdate);
      for(const t of(a.transactions||[])){
        const pending=!!t.pending;if(pending&&!wantPending)continue;
        const uid=hid('s',a.id+'|'+t.id),amount=parseFloat(t.amount||'0');
        fetched.add(uid);
        const held=pendById[uid];
        if(held){if(amount){if(pending)setBankAmount(held,amount);else{settle(held,amount);delete pendById[uid];}}continue;}
        if(S.seenIds[uid]||S.deleted[uid]||batch.has(uid))continue;
        batch.add(uid);if(!amount)continue;
        const ts=t.transacted_at||t.posted||Date.now()/1000;
        rows.push({uid,acct:name,amount,pending,date:isoDay(new Date(ts*1000)),
          payee:(t.payee||t.description||'').trim(),desc:(t.description||t.memo||'').trim(),mcc:t.mcc,cur:a.currency||'USD',done:false});}}

    /* 1b. the bank re-issued an ID: a synced row identical to this one whose old ID
       is no longer in the bank's data is the same transaction, so adopt the new ID */
    const sinceDay=isoDay(new Date(start*1000)),restamped=new Set();
    const adopt=(x,r)=>{const f=bankField(x);delete S.seenIds[x[f]];x[f]=r.uid;S.seenIds[r.uid]=1;restamped.add(x);r.done=true;};
    for(const r of rows){
      const x=S.txns.find(x=>{if(restamped.has(x)||x.date!==r.date||x.date<sinceDay||x.kind==='tf')return false;
        const f=bankField(x);
        return f&&!fetched.has(x[f])&&x.acct===r.acct&&x.payee===r.payee&&Math.abs(signedAmt(x)-r.amount)<0.005;});
      if(!x)continue;
      adopt(x,r);
      if(x.pend&&!r.pending)settle(x,r.amount);else if(r.pending)x.pend=1;}

    /* 1c. pending charges the bank no longer lists: find the posted charge each one turned into */
    const vanished=S.txns.filter(x=>x.pend&&!restamped.has(x)&&bankField(x)&&!fetched.has(x[bankField(x)])&&fresh[x.acct]!==undefined);
    const pairs=[];
    for(const x of vanished)for(const r of rows){
      const sx=signedAmt(x);
      if(r.done||r.acct!==x.acct||Math.sign(r.amount)!==Math.sign(sx))continue;
      const dd=(new Date(r.date+'T12:00:00')-new Date(x.date+'T12:00:00'))/86400000;
      if(dd<-2||dd>PEND_MATCH_DAYS)continue;
      const same=Math.abs(r.amount-sx)<0.005,ratio=Math.abs(r.amount/sx);
      const sim=payeeSim(x.payee,r.payee)||payeeSim(x.payee,r.desc);
      /* same merchant with a plausible change (tip, adjusted hold), or the exact amount a few days apart */
      if(!(sim&&(Math.abs(sx)<=1.01||(ratio>=0.2&&ratio<=2.5)))&&!(same&&Math.abs(dd)<=5))continue;
      /* a $1 hold says nothing about the final amount, so it competes on merchant and date only */
      pairs.push({x,r,score:(Math.abs(sx)<=1.01?0.3:Math.abs(Math.log(ratio)))+0.05*Math.abs(dd)+(sim?0:0.5)});}
    pairs.sort((a,b)=>a.score-b.score);
    const paired=new Set();
    for(const{x,r}of pairs){if(paired.has(x)||r.done)continue;
      paired.add(x);adopt(x,r);
      if(r.pending)setBankAmount(x,r.amount);else settle(x,r.amount);}
    for(const x of vanished){if(paired.has(x))continue;
      /* still unlisted well after the bank's data moved on: the hold was released */
      if(fresh[x.acct]-new Date(x.date+'T12:00:00')/1000<PEND_DROP_DAYS*86400)continue;
      if(x.uid[0]==='s'){remove.add(x);delete S.seenIds[x.uid];dropped++;}
      else{delete S.seenIds[x.uid2];delete x.uid2;delete x.pend;}}

    /* 1d. a charge that just posted may be one you already typed in by hand with the final
       amount (tip included). Then the hand-typed entry stays and the bank's copy folds into it.
       A charge you commented on while it was pending is never folded away, and entries in
       the same category are matched first. */
    for(const sameCat of[true,false])for(const x of settled){
      if(remove.has(x)||x.uid[0]!=='s'||(x.note&&x.note!=='Refund'))continue;
      const c=findClaim(x.acct,signedAmt(x),x.date);
      if(!c||c===x||(sameCat&&(c.cat||c.src)!==(x.cat||x.src)))continue;
      c.uid2=x.uid;remove.add(x);matched++;}

    /* 2. rows that are the same money as something already in the app */
    for(const r of rows){if(r.done)continue;
      const c=findClaim(r.acct,r.amount,r.date);
      if(c){c.uid2=r.uid;if(r.pending)c.pend=1;S.seenIds[r.uid]=1;r.done=true;matched++;}}

    /* pending moves between my own accounts wait until they post, when both sides can be paired */
    for(const r of rows)if(!r.done&&r.pending&&TRANSFER_RE.test(text(r)))r.done=true;

    /* 3. pair transfers between my own accounts (card payments, savings moves) */
    const outs=rows.filter(r=>!r.done&&!r.pending&&r.amount<0),ins=rows.filter(r=>!r.done&&!r.pending&&r.amount>0);
    for(const o of outs){
      const i=ins.find(i=>!i.done&&i.acct!==o.acct&&Math.abs(i.amount+o.amount)<0.005&&dayDiff(i.date,o.date)<=5&&
        (TRANSFER_RE.test(text(o))||TRANSFER_RE.test(text(i))));
      if(!i)continue;
      o.done=i.done=true;transfers++;
      push({uid:o.uid,uid2:i.uid,date:o.date,kind:'tf',amount:-o.amount,from:o.acct,to:i.acct,payee:'Transfer',note:o.payee,cur:o.cur});}

    /* 4. one-sided transfers whose other account is named in the text */
    for(const r of rows){if(r.done||r.pending||!TRANSFER_RE.test(text(r)))continue;
      const other=namedAccount(text(r),r.acct);if(!other)continue;
      r.done=true;transfers++;
      if(r.amount<0)push({uid:r.uid,uid2:'?in',date:r.date,kind:'tf',amount:-r.amount,from:r.acct,to:other,payee:'Transfer',note:r.payee,cur:r.cur});
      else push({uid:r.uid,uid2:'?out',date:r.date,kind:'tf',amount:r.amount,from:other,to:r.acct,payee:'Transfer',note:r.payee,cur:r.cur});}

    /* 5. everything else: spending, refunds, income */
    for(const r of rows){if(r.done)continue;
      const p=r.pending?{pend:1}:{};
      if(r.amount<0)push({uid:r.uid,date:r.date,kind:'exp',amount:-r.amount,cat:autoCat(r.payee,r.desc,r.mcc),acct:r.acct,payee:r.payee,note:'',cur:r.cur,...p});
      else if(isCreditAcct(r.acct)){ /* money back on a card is a refund: it reduces that category's spending */
        if(TRANSFER_RE.test(text(r))){push({uid:r.uid,uid2:'?out',date:r.date,kind:'tf',amount:r.amount,from:'',to:r.acct,payee:'Card payment',note:r.payee,cur:r.cur});transfers++;}
        else push({uid:r.uid,date:r.date,kind:'exp',amount:-r.amount,cat:autoCat(r.payee,r.desc,r.mcc),acct:r.acct,payee:r.payee,note:'Refund',cur:r.cur,...p});}
      else push({uid:r.uid,date:r.date,kind:'inc',amount:r.amount,src:autoIncome(text(r)),acct:r.acct,payee:r.payee,note:'',cur:r.cur,...p});}

    if(remove.size)S.txns=S.txns.filter(x=>!remove.has(x));
    sortTxns();
    const errs=(data.errors||[]).filter(Boolean);
    const parts=[`${added} new transaction${added===1?'':'s'}`+(pendingNew?` (${pendingNew} pending)`:'')];
    if(finalized)parts.push(`${finalized} pending charge${finalized===1?'':'s'} finalized`);
    if(dropped)parts.push(`${dropped} released hold${dropped===1?'':'s'} removed`);
    if(matched)parts.push(`${matched} matched ones you already had`);
    S.lastSync=Date.now();
    S.lastSyncMsg=parts.join(' · ')+(errs.length?' · '+errs.join('; '):'');
    save();
    return{ok:true,added,matched,transfers,pendingNew,finalized,dropped,changes,errors:errs,
      msg:parts.join(' · ')+(changes.length?'\n'+changes.join('\n'):'')+(errs.length?`\nBank notes: ${errs.join('; ')}`:'')};
  }catch(e){
    const msg=/Failed to fetch|NetworkError|Load failed/i.test(e.message)?'Could not reach SimpleFIN. Check your internet connection.':e.message;
    return{ok:false,msg};
  }finally{syncing=false;onSyncState(false);}
}
function syncDue(){return S.accessUrl&&S.prefs.autoSync&&Date.now()-S.lastSync>SYNC_EVERY_MS;}
