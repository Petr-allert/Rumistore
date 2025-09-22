const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

async function loadProducts() {
  const res = await fetch("products.json", { cache: "no-store" });
  return await res.json();
}

function fmtPrice(p) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(p);
}

function productCard(p) {
  const sizes = p.sizes.map(s => `<button class="size" data-size="${s}">${s}</button>`).join("");
  const img = p.img ? `<img class="thumb" src="${p.img}" alt="${p.title}" loading="lazy" onerror="this.style.display='none'">` : "";
  return `
    <div class="card" data-id="${p.id}">
      <div class="imgwrap">${img}</div>
      <div class="info">
        <div class="brand">${p.brand}</div>
        <div class="title">${p.title}</div>
        <div class="price">${fmtPrice(p.price)}</div>
        <div class="sizes">${sizes}</div>
        <button class="buy">Купить</button>
      </div>
    </div>
  `;
}

function mountHandlers(root) {
  root.addEventListener("click", (e) => {
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
      const title = card.querySelector(".title").textContent;
      if (!chosen) return alert("Выбери размер");
      if (tg) tg.sendData(JSON.stringify({ action: "buy", id: card.dataset.id, size: chosen }));
      else alert(`Оформляем: ${title}, размер ${chosen}`);
    }
  });
}

async function init() {
  const products = await loadProducts();
  const root = document.getElementById("grid");
  root.innerHTML = products.map(productCard).join("");
  mountHandlers(root);
}
init();
