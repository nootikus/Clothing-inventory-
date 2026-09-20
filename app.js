const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(n||0));
let client = null, items = [];

function loadConfig(){
  try { return JSON.parse(localStorage.getItem('sharedInventoryConfig') || 'null'); }
  catch { return null; }
}
function saveConfig(){
  localStorage.setItem('sharedInventoryConfig', JSON.stringify({url:$('sbUrl').value.trim(), key:$('sbKey').value.trim()}));
}
function setStatus(t){ $('syncStatus').textContent=t; }

async function connect(){
  const cfg = loadConfig();
  if(!cfg) return;
  $('sbUrl').value=cfg.url; $('sbKey').value=cfg.key;
  try{
    client = window.supabase.createClient(cfg.url,cfg.key);
    const {data,error}=await client.from('inventory').select('*').order('box').order('space');
    if(error) throw error;
    items=data||[];
    $('setupCard').hidden=true; $('appArea').hidden=false;
    setStatus('Connected • shared');
    render();
    client.channel('inventory-changes')
      .on('postgres_changes',{event:'*',schema:'public',table:'inventory'},()=>refresh(false))
      .subscribe();
  }catch(e){
    setStatus('Connection error');
    alert('Could not connect. Check the Supabase URL/key and SETUP.md.');
  }
}
async function refresh(showStatus=true){
  if(!client) return;
  const {data,error}=await client.from('inventory').select('*').order('box').order('space');
  if(error){ console.error(error); setStatus('Sync error'); return; }
  items=data||[];
  if(showStatus) setStatus('Synced • shared');
  render();
}
function filtered(){
  const q=$('search').value.toLowerCase().trim();
  if(!q) return items;
  return items.filter(x=>Object.values(x).some(v=>String(v??'').toLowerCase().includes(q)));
}
function render(){
  const f=filtered();
  $('itemCount').textContent=items.length;
  $('listedCount').textContent=items.filter(x=>x.listing_link).length;
  $('profitTotal').textContent=money(items.reduce((s,x)=>s+(Number(x.sold_for||0)-Number(x.price||0)),0));
  const byBox={};
  f.forEach(x=>(byBox[x.box]??=[]).push(x));
  $('boxes').innerHTML='';
  for(let b=1;b<=50;b++){
    const box=document.createElement('section'); box.className='box';
    const list=byBox[b]||[];
    box.innerHTML=`<h3>Box ${b} <span>${list.length} item${list.length===1?'':'s'}</span></h3>`;
    if(!list.length) box.innerHTML+=`<p class="empty">No matching items</p>`;
    list.forEach(x=>{
      const profit=Number(x.sold_for||0)-Number(x.price||0);
      const el=document.createElement('article'); el.className='item';
      el.innerHTML=`<div><b>${esc(x.item_id)}</b><strong>${esc(x.description||'Untitled')}</strong>
      <small>Space ${x.space} · ${esc(x.category||'')} · Size ${esc(x.size||'')} · ${esc(x.condition||'')}</small></div>
      <div class="itemRight"><span>${money(profit)}</span><button class="secondary edit" data-id="${x.id}">Edit</button>
      ${x.listing_link?`<a class="link" target="_blank" rel="noopener" href="${escAttr(x.listing_link)}">Listing</a>`:''}</div>`;
      box.appendChild(el);
    });
    $('boxes').appendChild(box);
  }
  document.querySelectorAll('.edit').forEach(b=>b.onclick=()=>openEdit(b.dataset.id));
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function escAttr(v){return esc(v).replace(/`/g,'&#96;');}

function clearForm(){
  $('itemForm').reset(); $('editId').value=''; $('dialogTitle').textContent='Add item';
  $('deleteBtn').hidden=true; $('box').value=1; $('space').value=1;
}
function openAdd(){clearForm();$('itemDialog').showModal();}
function openEdit(id){
  const x=items.find(i=>i.id===id); if(!x)return;
  $('editId').value=x.id; $('dialogTitle').textContent='Edit item'; $('deleteBtn').hidden=false;
  ['box','space','itemId','description','category','price','soldFor','size','condition','listingLink'].forEach(k=>{
    const map={itemId:'item_id',soldFor:'sold_for',listingLink:'listing_link'};
    $(k).value=x[map[k]||k]??'';
  });
  $('itemDialog').showModal();
}
async function saveItem(e){
  e.preventDefault(); if(!client)return;
  const payload={
    box:Number($('box').value), space:Number($('space').value), item_id:$('itemId').value.trim(),
    description:$('description').value.trim(), category:$('category').value.trim(),
    price:Number($('price').value||0), sold_for:Number($('soldFor').value||0),
    size:$('size').value.trim(), condition:$('condition').value.trim(), listing_link:$('listingLink').value.trim()||null
  };
  const id=$('editId').value;
  const {error}=id ? await client.from('inventory').update(payload).eq('id',id) : await client.from('inventory').insert(payload);
  if(error){alert(error.message);return;}
  $('itemDialog').close(); await refresh();
}
async function deleteItem(){
  const id=$('editId').value; if(!id)return;
  if(!confirm('Delete this item?'))return;
  const {error}=await client.from('inventory').delete().eq('id',id);
  if(error){alert(error.message);return;}
  $('itemDialog').close(); await refresh();
}

$('saveSetup').onclick=()=>{saveConfig();connect();};
$('settingsBtn').onclick=()=>{ $('setupCard').hidden=!$('setupCard').hidden; };
$('addBtn').onclick=openAdd;
$('cancelBtn').onclick=()=>$('itemDialog').close();
$('deleteBtn').onclick=deleteItem;
$('itemForm').onsubmit=saveItem;
$('search').oninput=render;
connect();