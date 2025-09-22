const tg = window.Telegram?.WebApp;
tg?.expand();

// theme from Telegram
(function applyTheme(){
  const tp = tg?.themeParams || {};
  document.body.style.background = tp.bg_color || getComputedStyle(document.documentElement).getPropertyValue('--bg');
  document.body.style.color = tp.text_color || getComputedStyle(document.documentElement).getPropertyValue('--fg');
})();

const state = {
  all: [],
  filtered: [],
  filters: { brand: "", size: "", gender: "", color: "" }
};

const els = {
  grid: () => document.getElementById("grid"),
  brand: () => document.getElementById("f-brand"),
  size: () => document.getElementById("f-size"),
  gender: () => document.getElementById("f-gender"),
  color: () => document.getElementById("f-color"),
  chips: () => document.getElementById("active-chips"),
  clear: () => document.getElementById("btn-clear")
};

function money(p, c="RUB"){ return new Intl.NumberFormat("ru-RU", {style:"currency", currency:c}).format(p); }

function card(p){
  const sizes = p.sizes.map(s=>`<button class="size" data-size="${s}">${s}</button>`).join("");
  const img = p.img ? `<img class="thumb" src="${p.img}" alt="${p.title}" loading="lazy" onerror="this.style.display='none'">` : "";
  return `
    <div class="card" data-id="${p.id}">
      <div class="imgwrap">${img}</div>
      <div class="info">
        <div class="brand">${p.brand}</div>
        <div class="title">${p.title}</div>
        <div class="price">${money(p.price, p.currency)}</div>
        <div class="sizes">${sizes}</div>
        <button class="buy">Купить</button>
      </div>
    </div>
  `;
}

function render(){
  const root = els.grid();
  if(!state.filtered.length){
    root.innerHTML = `<div class="empty">Нет товаров по выбранным фильтрам</div>`;
    renderChips();
    return;
  }
  root.innerHTML = state.filtered.map(card).join("");
  renderChips();
}

function unique(arr){ return Array.from(new Set(arr)).sort(); }

function buildFiltersUI(){
  // бренды
  const brands = unique(state.all.map(p=>p.brand));
  els.brand().innerHTML = `<option value="">Все бренды</option>` + brands.map(b=>`<option value="${b}">${b}</option>`).join("");

  // все возможные размеры
  const sizes = unique(state.all.flatMap(p=>p.sizes));
  els.size().innerHTML = `<option value="">Любой</option>` + sizes.map(s=>`<option value="${s}">${s}</option>`).join("");

  // цвета
  const colors = unique(state.all.flatMap(p=>p.colors || []));
  els.color().innerHTML = `<option value="">Любой</option>` + colors.map(c=>`<option value="${c}">${c}</option>`).join("");
}

function applyFilters(){
  const {brand, size, gender, color} = state.filters;
  state.filtered = state.all.filter(p => {
    if (brand && p.brand !== brand) return false;
    if (gender && p.gender !== gender) return false;
    if (size && !p.sizes.includes(Number(size))) return false;
    if (color && !(p.colors||[]).includes(color)) return false;
    return true;
  });
  render();
}

function renderChips(){
  const chips = [];
  const {brand,size,gender,color} = state.filters;
  if (brand) chips.push(`<span class="chip"><strong>Бренд:</strong> ${brand}</span>`);
  if (size) chips.push(`<span class="chip"><strong>Размер:</strong> ${size}</span>`);
  if (gender) chips.push(`<span class="chip"><strong>Пол:</strong> ${gender}</span>`);
  if (color) chips.push(`<span class="chip"><strong>Цвет:</strong> ${color}</span>`);
  els.chips().innerHTML = chips.join("");
}

function mountHandlers(){
  // выбор фильтров
  els.brand().onchange = e => { state.filters.brand = e.target.value; applyFilters(); };
  els.size().onchange = e => { state.filters.size = e.target.value; applyFilters(); };
  els.gender().onchange = e => { state.filters.gender = e.target.value; applyFilters(); };
  els.color().onchange = e => { state.filters.color = e.target.value; applyFilters(); };

  // сброс
  els.clear().onclick = () => {
    state.filters = { brand:"", size:"", gender:"", color:"" };
    els.brand().value = ""; els.size().value = ""; els.gender().value = ""; els.color().value = "";
    applyFilters();
  };

  // выбор размера и покупка
  els.grid().addEventListener("click", (e) => {
    const sizeBtn = e.target.closest(".size");
    if (sizeBtn) {
      const wrap = sizeBtn.closest(".sizes");
      wrap.querySelectorAll(".size").forEach(b => b.classList.remove("active"));
      sizeBtn.classList.add("active");
    }
    const buyBtn = e.target.closest(".buy");
    if (buyBtn) {
      const card = buyBtn.closest(".card");
      const chosen = card.querySelector(".size.active")?.dataset.size;
      const id = card.dataset.id;
      if (!chosen) return alert("Выбери размер");
      const prod = state.all.find(p=>p.id===id);
      if (tg) tg.sendData(JSON.stringify({ action: "buy", id, size: Number(chosen) }));
      else alert(`Оформляем: ${prod.title}, размер ${chosen}`);
    }
  });
}

async function init(){
  const res = await fetch("products.json", {cache:"no-store"});
  state.all = await res.json();
  buildFiltersUI();
  mountHandlers();
  state.filtered = state.all.slice();
  render();
}

init();
