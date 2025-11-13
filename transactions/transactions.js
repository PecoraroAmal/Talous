import { SAMPLE_DATA } from '../example/example.js';

const store={accounts:[],methods:[],categories:{income:[],expense:[]},transactions:[]};
let edit=null;

const id=()=>Date.now().toString(36)+Math.random().toString(36).substr(2);
const save=()=>{
  const current=JSON.parse(localStorage.getItem('talousData')||'{}');
  const next={
    ...current,
    banks: store.accounts,
    paymentMethods: store.methods,
    categories: store.categories,
    transactions: store.transactions
  };
  localStorage.setItem('talousData',JSON.stringify(next));
  console.log('Saved transactions:', store.transactions.length);
};
const setRequired=(id, req)=>{
  const el=document.getElementById(id);
  if(!el) return;
  if(req) el.setAttribute('required','required'); else el.removeAttribute('required');
};

// (removed erroneous duplicate updateUI)
const load=()=>{
  const s=localStorage.getItem('talousData');
  if(s)try{const p=JSON.parse(s);
    store.accounts=p.banks||[];
    store.methods=p.paymentMethods||[];
    store.categories=p.categories||{income:[],expense:[]};
    store.transactions=p.transactions||[];
  }catch{} else {
    // Initialize with sample data if no data exists
    const p = SAMPLE_DATA;
    store.accounts=p.banks||[];
    store.methods=p.paymentMethods||[];
    store.categories=p.categories||{income:[],expense:[]};
    store.transactions=p.transactions||[];
    save();
  }
  fillAll();render();
};
const e=s=>s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const f=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR'}).format(n);
const d=s=>new Date(s).toLocaleDateString('en-GB');

const fillAll=()=>{
  const opts=store.accounts.map(a=>`<option value="${a.id}">${e(a.name)}</option>`).join('');
  ['acc','from-acc','to-acc'].forEach(id=>document.getElementById(id).innerHTML='<option value="">Select</option>'+opts);
  document.getElementById('payment-method-account')&&fillMethods('payment-method-account','payment-method-type');
};
const fillMethods=(accSel,methodSel)=>{
  const accId=document.getElementById(accSel).value;
  const list=store.methods.filter(m=>m.accountId===accId);
  const el=document.getElementById(methodSel);
  el.innerHTML='<option value="none">None</option>'+list.map(m=>`<option value="${m.id}">${e(m.name)}</option>`).join('');
};
const fillCats=()=>{
  const type=document.getElementById('type').value;
  const el=document.getElementById('cat');
  const list=type==='income'?store.categories.income:store.categories.expense;
  el.innerHTML=list.map(c=>`<option value="${c.name}">${e(c.name)}</option>`).join('');
};
const updateUI=()=>{
  const type=document.getElementById('type').value;
  const rec=document.getElementById('recurring').value;
  document.getElementById('income-fields').classList.toggle('hidden',type!=='income');
  document.getElementById('single-fields').classList.toggle('hidden',type==='transfer');
  document.getElementById('transfer-fields').classList.toggle('hidden',type!=='transfer');
  const catSel=document.getElementById('cat');
  catSel.style.display=type==='transfer'?'none':'block';
  if(catSel.previousElementSibling) catSel.previousElementSibling.style.display=type==='transfer'?'none':'block';
  if(type==='transfer') catSel.removeAttribute('required');
  else catSel.setAttribute('required','required');
  // Toggle field requirements by type to avoid hidden required blocking submit
  setRequired('source', type==='income');
  const singleOn = (type==='income' || type==='expense');
  setRequired('acc', singleOn);
  setRequired('method', singleOn);
  const transferOn = (type==='transfer');
  setRequired('from-acc', transferOn);
  setRequired('from-method', transferOn);
  setRequired('to-acc', transferOn);
  setRequired('to-method', transferOn);
  document.getElementById('recurring-fields').classList.toggle('hidden',rec==='none');
  document.getElementById('weekly').classList.toggle('hidden',rec!=='weekly');
  document.getElementById('monthly').classList.toggle('hidden',rec!=='monthly');
  document.getElementById('yearly').classList.toggle('hidden',rec!=='yearly');
  fillCats();
};

const showMessage=(msg)=>{document.getElementById('error-msg').textContent=msg;document.getElementById('error-modal').classList.remove('hidden');};
const hideError=()=>{document.getElementById('error-modal').classList.add('hidden');};
const balance=(accId,metId)=>{
  let b=0;
  store.transactions.forEach(t=>{
    if(t.type==='income'&&t.accountId===accId&&(t.methodId||'')===metId)b+=t.amount;
    if(t.type==='expense'&&t.accountId===accId&&(t.methodId||'')===metId)b-=t.amount;
    if(t.type==='transfer'){
      if(t.fromAccountId===accId&&(t.fromMethodId||'')===metId)b-=t.amount;
      if(t.toAccountId===accId&&(t.toMethodId||'')===metId)b+=t.amount;
    }
  });
  return b;
};

const genDates=(start,end,freq,wd,dom,m,d)=>{
  const out=[];let cur=new Date(start);
  while(cur<=new Date(end)){
    out.push(cur.toISOString().split('T')[0]);
    if(freq==='weekly')cur.setDate(cur.getDate()+7);
    else if(freq==='monthly'){
      cur.setMonth(cur.getMonth()+1);
      const max=new Date(cur.getFullYear(),cur.getMonth()+1,0).getDate();
      cur.setDate(Math.min(dom,max));
    }
    else if(freq==='yearly')cur.setFullYear(cur.getFullYear()+1);
  }
  return out;
};

const saveTxn=e=>{
  e.preventDefault();
  const type=document.getElementById('type').value;
  const amount=parseFloat(document.getElementById('amount').value);
  const date=document.getElementById('date').value;
  const rec=document.getElementById('recurring').value;
  const start=document.getElementById('start').value||date;
  const today=new Date().toISOString().split('T')[0];
  if(type==='transfer'){
    const fromAcc=document.getElementById('from-acc').value;
    const toAcc=document.getElementById('to-acc').value;
    if(!fromAcc||!toAcc){ showMessage('Transfer requires both source and destination.'); return; }
    if(fromAcc===toAcc){ showMessage('Transfer blocked: source and destination cannot be the same.'); return; }
    if(!(amount>0)){ showMessage('Amount must be greater than zero.'); return; }
  }
  let dates=rec==='none'?[date]:genDates(start,today,rec,
    document.getElementById('weekday').value,
    document.getElementById('day').value||1,
    document.getElementById('month').value||1,
    document.getElementById('yday').value||1
  );

  const txns=[]; let error=false;
  dates.forEach(d=>{
    if(error) return;
    if(type==='expense'){
      const acc=document.getElementById('acc').value;
      const met=document.getElementById('method').value||'';
      const avail=balance(acc,met);
      if(avail<amount){
        showMessage(`Insufficient funds: ${f(avail)} available in ${label(acc,met)}; need ${f(amount)}.`);
        error=true; return;
      }
    }
    if(type==='transfer'){
      const from=document.getElementById('from-acc').value;
      const fromMet=document.getElementById('from-method').value||'';
      const avail=balance(from,fromMet);
      if(avail<amount){
        showMessage(`Transfer blocked: ${f(avail)} available in ${label(from,fromMet)}; need ${f(amount)}.`);
        error=true; return;
      }
    }
    const base={
      id:id(),type,amount,date:d,
      note:document.getElementById('note').value,
      category:type==='transfer'?'':document.getElementById('cat').value
    };
    if(type==='income'){
      base.accountId=document.getElementById('acc').value;
      { const v=document.getElementById('method').value; base.methodId=(v==='none')?'':v; }
      base.source=document.getElementById('source').value;
    }
    if(type==='expense'){
      base.accountId=document.getElementById('acc').value;
      { const v=document.getElementById('method').value; base.methodId=(v==='none')?'':v; }
    }
    if(type==='transfer'){
      base.fromAccountId=document.getElementById('from-acc').value;
      { const v=document.getElementById('from-method').value; base.fromMethodId=(v==='none')?'':v; }
      base.toAccountId=document.getElementById('to-acc').value;
      { const v=document.getElementById('to-method').value; base.toMethodId=(v==='none')?'':v; }
    }
    txns.push(base);
  });

  if(error) return;
  if(edit)store.transactions=store.transactions.filter(t=>t.id!==edit.id);
  store.transactions.push(...txns);
  save();render();closeModal();
};

const render=()=>{
  const q=document.getElementById('search').value.toLowerCase();
  const t=document.getElementById('filter-type').value;
  const c=document.getElementById('filter-cat').value;
  let list=store.transactions.filter(x=>{
    const dateStr=d(x.date).toLowerCase();
    const amtStr=(x.amount+"").toLowerCase();
    const methStr=(x.type==='transfer'
      ?`${label(x.fromAccountId,x.fromMethodId)} → ${label(x.toAccountId,x.toMethodId)}`
      :label(x.accountId,x.methodId) || '').toLowerCase();
    const noteStr=(x.note||'').toLowerCase();
    const s=!q||dateStr.includes(q)||amtStr.includes(q)||methStr.includes(q)||noteStr.includes(q);
    const mt=!t||x.type===t;
    const mc=!c||x.category===c;
    return s&&mt&&mc;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const body=document.getElementById('body');
  if(!list.length){body.innerHTML='<tr><td colspan="7" style="text-align:center;">No transactions</td></tr>';return;}
  body.innerHTML=list.map(x=>{
    const color=x.type==='income'?'amount-income':x.type==='expense'?'amount-expense':'amount-transfer';
    const icon=x.type==='income'?'<i class="fa-solid fa-arrow-down"></i>':x.type==='expense'?'<i class="fa-solid fa-arrow-up"></i>':'<i class="fa-solid fa-right-left"></i>';
    const method=x.type==='transfer'
      ?`${label(x.fromAccountId,x.fromMethodId)} → ${label(x.toAccountId,x.toMethodId)}`
      :label(x.accountId,x.methodId);
    return `<tr>
      <td>${d(x.date)}</td>
      <td><span class="type-${x.type}">${icon} ${x.type}</span></td>
      <td class="${color}">${f(x.amount)}</td>
      <td><strong>${method||'-'}</strong></td>
      <td><u>${x.category||'-'}</u></td>
      <td>${e(x.note||'')}</td>
      <td><button onclick="editTxn('${x.id}')"><i class="fa-solid fa-pen"></i></button><button onclick="del('${x.id}')"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`;
  }).join('');
};

const label=(accId,metId)=>{
  const a=store.accounts.find(x=>x.id===accId);
  const m=store.methods.find(x=>x.id===metId);
  return a?(m?`${a.name} · ${m.name}`:a.name):'';
};

const openModal=(txn=null)=>{
  edit=txn;
  document.getElementById('title').textContent=txn?'Edit':'Add';
  document.getElementById('form').reset();
  document.getElementById('date').value=new Date().toISOString().split('T')[0];
  document.getElementById('start').value=document.getElementById('date').value;
  fillAll();updateUI();
  if(txn){
    document.getElementById('type').value=txn.type;
    document.getElementById('amount').value=txn.amount;
    document.getElementById('date').value=txn.date;
    document.getElementById('note').value=txn.note||'';
    document.getElementById('cat').value=txn.category||'';
    if(txn.type==='income')document.getElementById('source').value=txn.source||'';
    if(txn.type!=='transfer'){
      document.getElementById('acc').value=txn.accountId||'';
      fillMethods('acc','method');
      document.getElementById('method').value=txn.methodId||'';
    }else{
      document.getElementById('from-acc').value=txn.fromAccountId||'';
      fillMethods('from-acc','from-method');
      document.getElementById('from-method').value=txn.fromMethodId||'';
      document.getElementById('to-acc').value=txn.toAccountId||'';
      fillMethods('to-acc','to-method');
      document.getElementById('to-method').value=txn.toMethodId||'';
    }
  }
  updateUI();
  document.getElementById('modal').classList.remove('hidden');
};
const closeModal=()=>{document.getElementById('modal').classList.add('hidden');edit=null;};
const showConfirm=(msg,cb)=>{document.getElementById('confirm-msg').textContent=msg;document.getElementById('confirm-modal').classList.remove('hidden');window.confirmCb=cb;};
const hideConfirm=()=>{document.getElementById('confirm-modal').classList.add('hidden');window.confirmCb=null;};
const confirmYes=()=>{if(window.confirmCb)window.confirmCb();hideConfirm();};
window.editTxn=id=>{const t=store.transactions.find(x=>x.id===id);if(t)openModal(t);};
window.del=id=>{showConfirm('Delete this transaction?',()=>{store.transactions=store.transactions.filter(x=>x.id!==id);save();render();});};

document.addEventListener('DOMContentLoaded',()=>{
  load();
  document.getElementById('add-btn').onclick=()=>openModal();
  document.getElementById('cancel').onclick=closeModal;
  document.getElementById('form').onsubmit=saveTxn;
  document.getElementById('type').onchange=updateUI;
  document.getElementById('recurring').onchange=updateUI;
  ['acc','from-acc','to-acc'].forEach(id=>document.getElementById(id).onchange=()=>fillMethods(id,id.replace('acc','method')));
  document.getElementById('confirm-yes').onclick=confirmYes;
  document.getElementById('confirm-no').onclick=hideConfirm;
  document.getElementById('error-close').onclick=hideError;

  const cats=[...store.categories.income,...store.categories.expense].map(c=>c.name);
  document.getElementById('filter-cat').innerHTML='<option value="">All Categories</option>'+cats.map(n=>`<option>${e(n)}</option>`).join('');

  const t=document.getElementById('theme-toggle');
  const saved=localStorage.getItem('theme')||'light';
  document.documentElement.setAttribute('data-theme',saved);
  if(t){
    t.onclick=()=>{
      const next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
      document.documentElement.setAttribute('data-theme',next);
      localStorage.setItem('theme',next);
    };
  }
  // sidebar removed
  // open form if requested via query (?add=1)
  const params=new URLSearchParams(location.search);
  if(params.has('add')) openModal();
});