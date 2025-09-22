const tg = window.Telegram?.WebApp; tg?.expand?.();

/* Theme (авто из Telegram) */
(function theme(){
  const tp = tg?.themeParams || {};
  document.body.style.background = tp.bg_color || get('--bg');
  document.body.style.color = tp.text_color || get('--fg');
  function get(v){ return getComputedStyle(document.documentElement).getPropertyValue(v); }
})();

/* State */
const state = {
  all: [],
  view: [],
  filters: { q:"", brand:"", size:"", gender:"", color:"", sort:"" }
};

/* Elements */
const el = {
  grid: () => document.getElementById('grid'),
  chips: () => document.getElementById('active-chips'),
  clear: () => document.getElementById('btn-clear'),
  brand: () => document.getElementById('f-brand'),
  size: () => document.getElementById('f-size'),
  gender: () => document.getElementById('f-gender'),
  color: () => document.getElementById('f-color'),
  sort: () => document.getElementById('f-sort'),
  search: () => document.getElementById('f-search'),
};

function money(n,c='RUB'){ return new Intl.NumberFormat('ru-RU',{style:'currency',currency:c}).format(n); }
const uniq = (a)=>Array.from(new Set(a));
const by = (k)=> (a,b)=> (a[k]>b[k]?1:a[k]<b[k]?-1:0);

/* Render card (mini) */
function card(p){
  const sizes = p.sizes.map(s=>`<button class="size" data-size="${s}">${s}</button>`).join('');
  const img = p.img ? `<img class="thumb" src="${p.img}" alt="${p.title}" loading="lazy" onerror="this.style.display='none'">` : '';
  return `
    <article class="card" data-id="${p.id}">
      <div class="img">${img}</div>
      <div class="info">
        <div class="brand-t">${p.brand}</div>
        <div class="title">${p.title}</div>
        <div class="price">${money(p.price,p.currency)}</div>
        <div class="sizes">${sizes}</div>
        <button class="buy">Купить</button>
      </div>
    </article>
  `;
}

/* Apply filters + sort */
function apply(){
  const {q,brand,size,gender,color,sort} = state.filters;
  let out = state.all.filter(p=>{
    if (brand && p.brand !== brand) return false;
    if (gender && p.gender !== gender) return false;
    if (size && !p.sizes.includes(Number(size))) return false;
    if (color && !(p.colors||[]).includes(color)) return false;
    if (q){
      const t = (p.title + ' ' + p.brand).toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  if (sort === 'price-asc') out.sort((a,b)=>a.price-b.price);
  if (sort === 'price-desc') out.sort((a,b)=>b.price-a.price);
  if (sort === 'brand-asc') out.sort(by('brand'));

  state.view = out;
  render();
}

/* Render grid + chips */
function render(){
  const root = el.grid();
  if (!state.view.length){
    root.innerHTML = `<div class="empty">Ничего не найдено под выбранные фильтры</div>`;
  } else {
    root.innerHTML = state.view.map(card).join('');
  }
  renderChips();
}

/* Chips */
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

/* Mount handlers (compact UX) */
function mount(){
  el.search().addEventListener('input', e=>{ state.filters.q = e.target.value.trim(); apply(); });
  el.brand().onchange  = e=>{ state.filters.brand  = e.target.value; apply(); };
  el.size().onchange   = e=>{ state.filters.size   = e.target.value; apply(); };
  el.gender().onchange = e=>{ state.filters.gender = e.target.value; apply(); };
  el.color().onchange  = e=>{ state.filters.color  = e.target.value; apply(); };
  el.sort().onchange   = e=>{ state.filters.sort   = e.target.value; apply(); };

  el.clear().onclick = ()=>{
    state.filters = { q:"", brand:"", size:"", gender:"", color:"", sort:"" };
    el.search().value = el.brand().value = el.size().value = el.gender().value = el.color().value = el.sort().value = "";
    apply();
  };

  // size pick + buy
  el.grid().addEventListener('click', (e)=>{
    const sizeBtn = e.target.closest('.size');
    if (sizeBtn){
      const group = sizeBtn.closest('.sizes');
      group.querySelectorAll('.size').forEach(b=>b.classList.remove('active'));
      sizeBtn.classList.add('active');
    }
    const buy = e.target.closest('.buy');
    if (buy){
      const card = buy.closest('.card');
      const chosen = card.querySelector('.size.active')?.dataset.size;
      if (!chosen) return alert('Выбери размер');
      const id = card.dataset.id;
      tg?.sendData?.(JSON.stringify({ action:'buy', id, size:Number(chosen) }));
    }
  });
}

/* Populate filter options */
function buildFilters(){
  const brands = uniq(state.all.map(p=>p.brand)).sort();
  el.brand().innerHTML = `<option value="">Бренд</option>` + brands.map(b=>`<option>${b}</option>`).join('');

  const sizes = uniq(state.all.flatMap(p=>p.sizes)).sort((a,b)=>a-b);
  el.size().innerHTML = `<option value="">Размер</option>` + sizes.map(s=>`<option value="${s}">${s}</option>`).join('');

  const colors = uniq(state.all.flatMap(p=>p.colors||[])).sort();
  el.color().innerHTML = `<option value="">Цвет</option>` + colors.map(c=>`<option>${c}</option>`).join('');
}

/* Init */
(async function init(){
  const res = await fetch('products.json',{cache:'no-store'});
  state.all = await res.json();
  buildFilters();
  mount();
  apply();
})();
