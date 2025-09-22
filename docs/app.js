const tg = window.Telegram?.WebApp;
tg?.expand?.();

/* Telegram theme */
(function theme(){
  const tp = tg?.themeParams || {};
  document.body.style.background = tp.bg_color || get('--bg');
  document.body.style.color = tp.text_color || get('--fg');
  function get(v){ return getComputedStyle(document.documentElement).getPropertyValue(v); }
})();

/* ===== State ===== */
const state = {
  all: [],        // нормализованные товары
  view: [],
  filters: { q:"", brand:"", size:"", gender:"", color:"", sort:"" },
  current: null
};

/* ===== Elements ===== */
const el = {
  grid:   () => document.getElementById('grid'),
  chips:  () => document.getElementById('active-chips'),
  // filters
  search: () => document.getElementById('f-search'),
  brand:  () => document.getElementById('f-brand'),
  size:   () => document.getElementById('f-size'),
  gender: () => document.getElementById('f-gender'),
  color:  () => document.getElementById('f-color'),
  sort:   () => document.getElementById('f-sort'),
  clear:  () => document.getElementById('btn-clear'),
  // modal
  overlay:() => document.getElementById('overlay'),
  mClose: () => document.getElementById('m-close'),
  mImg:   () => document.getElementById('m-img'),
  mBrand: () => document.getElementById('m-brand'),
  mTitle: () => document.getElementById('m-title'),
  mMeta:  () => document.getElementById('m-meta'),
  mPrice: () => document.getElementById('m-price'),
  mSizes: () => document.getElementById('m-sizes'),
  mDesc:  () => document.getElementById('m-desc'),
  mBuy:   () => document.getElementById('m-buy'),
};

/* ===== Utils ===== */
function money(n,c='RUB'){ return new Intl.NumberFormat('ru-RU',{style:'currency',currency:c}).format(n); }
const uniq = (a)=>Array.from(new Set(a));
const by = (k)=> (a,b)=> (a[k]>b[k]?1:a[k]<b[k]?-1:0);
function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m])); }

/* Плейсхолдер-картинка (если нет img) */
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
     <rect width="100%" height="100%" fill="#0c111b"/>
     <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
       font-family="system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#9aa8b6">
       Фото скоро будет
     </text>
   </svg>`
);

/* Нормализация товара (поддерживаем id ИЛИ sku, и дефолты) */
function normalize(p){
  return {
    id: String(p.id ?? p.sku ?? crypto.randomUUID()),
    sku: String(p.sku ?? p.id ?? ''),
    title: p.title ?? 'Без названия',
    brand: p.brand ?? 'Brand',
    gender: p.gender ?? 'unisex',
    colors: Array.isArray(p.colors) ? p.colors : [],
    price: Number.isFinite(p.price) ? p.price : 0,
    currency: p.currency ?? 'RUB',
    sizes: Array.isArray(p.sizes) ? p.sizes.map(Number) : [],
    img: p.img || '',
    desc: p.desc || ''
  };
}

/* ===== Cards (list) ===== */
function listCard(p){
  const src = p.img || PLACEHOLDER;
  return `
    <article class="card" data-id="${p.id}" role="listitem">
      <div class="img">
        <img class="thumb" src="${src}" alt="${escapeHtml(p.title)}" loading="lazy"
             onerror="this.src='${PLACEHOLDER}'">
      </div>
      <div class="info">
        <div class="brand-t">${p.brand}</div>
        <div class="title">${p.title}</div>
        <div class="price">${money(p.price,p.currency)}</div>
      </div>
    </article>`;
}
function renderList(){
  const root = el.grid();
  if (!state.view.length){
    root.innerHTML = `<div class="empty">Ничего не найдено</div>`;
    return;
  }
  root.innerHTML = state.view.map(listCard).join('');
}

/* ===== Filters ===== */
function renderChips(){
  const {q,brand,size,gender,color,sort} = state.filters;
  const chips = [];
  if (q) chips.push(`<span class="chip"><b>Поиск:</b> ${escapeHtml(q)}</span>`);
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
    if (q){
      const t=(p.title+' '+p.brand).toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  });
  if (sort === 'price-asc') out.sort((a,b)=>a.price-b.price);
  if (sort === 'price-desc') out.sort((a,b)=>b.price-a.price);
  if (sort === 'brand-asc') out.sort(by('brand'));
  state.view = out;
  renderList(); renderChips();
}

/* ===== Product fullscreen modal ===== */
function openModal(p){
  // защита от пустых карточек
  if (!p) return;
  if (!p.sizes || p.sizes.length === 0) p.sizes = [40,41,42]; // дефолт

  state.current = p;

  el.mImg().src = p.img || PLACEHOLDER;
  el.mImg().alt = p.title;
  el.mBrand().textContent = p.brand;
  el.mTitle().textContent = p.title;
  el.mMeta().textContent = (p.colors?.join(', ') || '').toUpperCase();
  el.mPrice().textContent = money(p.price, p.currency);
  el.mDesc().textContent = p.desc || 'Оригинальные кроссовки. Гарантия подлинности. Быстрая доставка.';

  const box = el.mSizes(); box.innerHTML = '';
  p.sizes.forEach(s=>{
    const b = document.createElement('button');
    b.className = 'size'; b.dataset.size = s; b.textContent = s;
    b.onclick = ()=>{ box.querySelectorAll('.size').forEach(x=>x.classList.remove('active')); b.classList.add('active'); };
    box.appendChild(b);
  });

  document.body.classList.add('modal-open');
  el.overlay().hidden = false;

  tg?.MainButton?.show();
  tg?.MainButton?.setText('Купить');
  tg?.MainButton?.offClick?.(handleBuy);
  tg?.MainButton?.onClick(handleBuy);
}
function closeModal(){
  el.overlay().hidden = true;
  document.body.classList.remove('modal-open');
  tg?.MainButton?.hide();
  tg?.MainButton?.offClick?.(handleBuy);
  state.current = null;
}
function handleBuy(){
  if (!state.current) return;
  const size = el.mSizes().querySelector('.size.active')?.dataset.size;
  if (!size) { alert('Выбери размер'); return; }
  tg?.sendData?.(JSON.stringify({ action:'buy', id: state.current.id, size: Number(size) }));
}

/* ===== Mount ===== */
function mount(){
  // filters
  el.search().addEventListener('input', e=>{ state.filters.q = e.target.value.trim(); apply(); });
  el.brand().onchange  = e=>{ state.filters.brand  = e.target.value; apply(); };
  el.size().onchange   = e=>{ state.filters.size   = e.target.value; apply(); };
  el.gender().onchange = e=>{ state.filters.gender = e.target.value; apply(); };
  el.color().onchange  = e=>{ state.filters.color  = e.target.value; apply(); };
  el.sort().onchange   = e=>{ state.filters.sort   = e.target.value; apply(); };
  el.clear().onclick   = ()=>{
    state.filters = { q:"", brand:"", size:"", gender:"", color:"", sort:"" };
    el.search().value = el.brand().value = el.size().value = el.gender().value = el.color().value = el.sort().value = "";
    apply();
  };

  // click card → open fullscreen
  el.grid().addEventListener('click', (e)=>{
    const card = e.target.closest('.card'); if (!card) return;
    const id = card.dataset.id;
    // ищем по id, а если у тебя старый products.json — поддержим sku
    const p = state.all.find(x=>x.id===id || x.sku===id);
    if (p) openModal(p);
  });

  // close modal
  el.mClose().onclick = closeModal;
  el.overlay().addEventListener('click', (e)=>{ if (e.target.id === 'overlay') closeModal(); });
}

/* ===== Init ===== */
(async function init(){
  const res = await fetch('products.json',{cache:'no-store'});
  const raw = await res.json();
  state.all = raw.map(normalize);          // 🔥 нормализуем товары
  buildFilters(); mount(); state.view = state.all.slice(); apply();
})();
