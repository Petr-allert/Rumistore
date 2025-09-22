const tg = window.Telegram?.WebApp; tg?.expand?.();

/* === theme from Telegram === */
(function theme(){
  const tp = tg?.themeParams || {};
  document.body.style.background = tp.bg_color || get('--bg');
  document.body.style.color = tp.text_color || get('--fg');
  function get(v){ return getComputedStyle(document.documentElement).getPropertyValue(v); }
})();

/* === state === */
const state = {
  all: [], view: [],
  filters: { q:"", brand:"", size:"", gender:"", color:"", sort:"" },
  current: null // текущий товар для страницы
};

/* === elements === */
const el = {
  grid: () => document.getElementById('grid'),
  filters: () => document.getElementById('filters'),
  chips: () => document.getElementById('active-chips'),
  back: () => document.getElementById('btn-back'),

  search: () => document.getElementById('f-search'),
  brand:  () => document.getElementById('f-brand'),
  size:   () => document.getElementById('f-size'),
  gender: () => document.getElementById('f-gender'),
  color:  () => document.getElementById('f-color'),
  sort:   () => document.getElementById('f-sort'),
  clear:  () => document.getElementById('btn-clear'),

  // product page
  pview: () => document.getElementById('product'),
  pimg:  () => document.getElementById('p-img'),
  pbrand:() => document.getElementById('p-brand'),
  ptitle:() => document.getElementById('p-title'),
  pmeta: () => document.getElementById('p-meta'),
  pprice:() => document.getElementById('p-price'),
  psizes:() => document.getElementById('p-sizes'),
  pdesc: () => document.getElementById('p-desc'),
  pbuy:  () => document.getElementById('p-buy'),
};

function money(n,c='RUB'){ return new Intl.NumberFormat('ru-RU',{style:'currency',currency:c}).format(n); }
const uniq = (a)=>Array.from(new Set(a));
const by = (k)=> (a,b)=> (a[k]>b[k]?1:a[k]<b[k]?-1:0);

/* === list cards === */
function listCard(p){
  const img = p.img ? `<img class="thumb" src="${p.img}" alt="${p.title}" loading="lazy" onerror="this.style.display='none'">` : '';
  return `
    <article class="card" data-id="${p.id}" role="listitem">
      <div class="img">${img}</div>
      <div class="info">
        <div class="brand-t">${p.brand}</div>
        <div class="title">${p.title}</div>
        <div class="price">${money(p.price,p.currency)}</div>
      </div>
    </article>`;
}
function renderList(){
  const root = el.grid();
  if (!state.view.length){ root.innerHTML = `<div class="empty">Ничего не найдено</div>`; return; }
  root.innerHTML = state.view.map(listCard).join('');
}

/* === filters === */
function renderChips(){
  const {q,brand,size,gender,color,sort} = state.filters;
  const chips = [];
  if (q) chips.push(`<span class="chip"><b>Поиск:</b> ${q}</span>`);
  if (brand) chips.push(`<span class="chip"><b>Бренд:</b> ${brand}</span>`);
  if (size) chips.push(`<span class="chip"><b>Размер:</b> ${size}</span>`);
  if (gender) chips.push(`<span class="chip"><b>Пол:</b> ${gender}</span>`);
  if (color) chips.push(`<span class="chip"><b>Цвет:</b> ${color}</span>`);
  if (sort) chips.push(`<span class="chip"><b>Сорт.:</b> ${sort.replace('-',' ')}</span>`);
  el.chips().innerHTML = chips.join('');
}

function buildFilters(){
  const brands = uniq(state.all.map(p=>p.brand)).sort();
  el.brand().innerHTML = `<option value="">Бренд</option>` + brands.map(b=>`<option>${b}</option>`).join('');
  const sizes = uniq(state.all.flatMap(p=>p.sizes)).sort((a,b)=>a-b);
  el.size().innerHTML = `<option value="">Размер</option>` + sizes.map(s=>`<option value="${s}">${s}</option>`).join('');
  const colors = uniq(state.all.flatMap(p=>p.colors||[])).sort();
  el.color().innerHTML = `<option value="">Цвет</option>` + colors.map(c=>`<option>${c}</option>`).join('');
}

function apply(){
  const {q,brand,size,gender,color,sort} = state.filters;
  let out = state.all.filter(p=>{
    if (brand && p.brand !== brand) return false;
    if (gender && p.gender !== gender) return false;
    if (size && !p.sizes.includes(Number(size))) return false;
    if (color && !(p.colors||[]).includes(color)) return false;
    if (q){ const t=(p.title+' '+p.brand).toLowerCase(); if (!t.includes(q.toLowerCase())) return false; }
    return true;
  });
  if (sort === 'price-asc') out.sort((a,b)=>a.price-b.price);
  if (sort === 'price-desc') out.sort((a,b)=>b.price-a.price);
  if (sort === 'brand-asc') out.sort(by('brand'));

  state.view = out;
  renderList(); renderChips();
}

/* === product page === */
function openProduct(id){
  const p = state.all.find(x=>x.id===id); if (!p) return;
  state.current = p;
  // fill
  el.pimg().src = p.img || '';
  el.pimg().alt = p.title;
  el.pbrand().textContent = p.brand;
  el.ptitle().textContent = p.title;
  el.pprice().textContent = money(p.price, p.currency);
  el.pmeta().textContent = (p.colors?.join(', ') || '').toUpperCase();
  el.pdesc().textContent = p.desc || 'Оригинальные кроссовки. Гарантия подлинности. Быстрая доставка.';
  // sizes
  const box = el.psizes(); box.innerHTML = '';
  (p.sizes||[]).forEach(s=>{
    const b = document.createElement('button');
    b.className = 'size'; b.dataset.size = s; b.textContent = s;
    b.onclick = ()=> { box.querySelectorAll('.size').forEach(x=>x.classList.remove('active')); b.classList.add('active'); };
    box.appendChild(b);
  });

  // show view
  el.grid().hidden = true;
  el.filters().hidden = true;
  el.pview().hidden = false;
  el.back().hidden = false;

  // bottom main button (Telegram)
  tg?.MainButton?.show();
  tg?.MainButton?.setText('Купить');
  tg?.MainButton?.onClick(handleBuy);
}

function closeProduct(){
  state.current = null;
  el.pview().hidden = true;
  el.back().hidden = true;
  el.grid().hidden = false;
  el.filters().hidden = false;
  tg?.MainButton?.hide();
  tg?.MainButton?.offClick?.(handleBuy);
}

function handleBuy(){
  if (!state.current) return;
  const size = el.psizes().querySelector('.size.active')?.dataset.size;
  if (!size) { alert('Выбери размер'); return; }
  tg?.sendData?.(JSON.stringify({ action:'buy', id: state.current.id, size: Number(size) }));
}

/* === tiny router (hash) === */
function onRoute(){
  const h = location.hash; // '', '#/product/xxx'
  const m = h.match(/^#\/product\/(.+)$/);
  if (m){ openProduct(decodeURIComponent(m[1])); }
  else { closeProduct(); }
}

/* === mount === */
function mount(){
  // filters
  el.search().addEventListener('input', e=>{ state.filters.q = e.target.value.trim(); apply(); });
  el.brand().onchange  = e=>{ state.filters.brand  = e.target.value; apply(); };
  el.size().onchange   = e=>{ state.filters.size   = e.target.value; apply(); };
  el.gender().onchange = e=>{ state.filters.gender = e.target.value; apply(); };
  el.color().onchange  = e=>{ state.filters.color  = e.target.value; apply(); };
  el.sort().onchange   = e=>{ state.filters.sort   = e.target.value; apply(); };
  el.clear().onclick   = ()=>{ state.filters={q:"",brand:"",size:"",gender:"",color:"",sort:""};
    el.search().value = el.brand().value = el.size().value = el.gender().value = el.color().value = el.sort().value = ""; apply();
  };

  // click card → open product
  el.grid().addEventListener('click', (e)=>{
    const card = e.target.closest('.card'); if (!card) return;
    const id = card.dataset.id;
    location.hash = `#/product/${encodeURIComponent(id)}`;
  });

  // back button
  el.back().onclick = ()=> history.back();

  // listen route
  addEventListener('hashchange', onRoute);
}

/* === init === */
(async function init(){
  const res = await fetch('products.json',{cache:'no-store'});
  state.all = await res.json();
  buildFilters(); mount(); apply(); onRoute();
})();
