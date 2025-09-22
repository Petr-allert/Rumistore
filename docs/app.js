const tg = window.Telegram?.WebApp;

// --- Theme helpers ---
function applyTheme() {
  const tp = tg?.themeParams || {};
  document.body.style.background = tp.bg_color || "#ffffff";
  document.body.style.color = tp.text_color || "#111111";
  // remember for cards/buttons
  window.__cardBg = tp.secondary_bg_color || "#f3f4f6";
  window.__muted = tp.hint_color || "#6b7280";
  window.__btnBg = tp.button_color || "#e5e7eb";
}
applyTheme();
tg?.onEvent?.("themeChanged", applyTheme);

// --- State/cart ---
const state = { cart: [] };
const keyOf = (i) => `${i.sku}|${i.size}`;
const total = () => state.cart.reduce((s,i)=>s + i.price*i.qty, 0);
const currency = () => state.cart[0]?.currency || "RUB";

function updateMainButton() {
  if (!tg) return;
  if (state.cart.length === 0) {
    tg.MainButton.hide();
    return;
  }
  tg.MainButton.setText(`Оплатить ${(total()/100).toFixed(2)} ${currency()}`);
  tg.MainButton.show();
}

function addToCart(item) {
  const k = keyOf(item);
  const found = state.cart.find(i => keyOf(i) === k);
  if (found) found.qty += 1; else state.cart.push(item);
  tg?.HapticFeedback?.selectionChanged();
  updateMainButton();
}

tg?.MainButton?.onClick(() => {
  if (state.cart.length === 0) return;
  tg.sendData(JSON.stringify({
    action: "checkout",
    items: state.cart.map(i => ({ sku:i.sku, size:i.size, qty:i.qty, price:i.price, title:i.title })),
    currency: currency()
  }));
});

// try to expand (safe)
try { tg?.expand(); } catch {}

// --- Render ---
async function bootstrap() {
  // Load catalog (relative path works on GitHub Pages with trailing slash)
  const res = await fetch("./products.json");
  if (!res.ok) {
    document.body.insertAdjacentHTML("beforeend",
      `<div class="debug" style="color:#b91c1c">Не загрузился products.json (${res.status})</div>`);
    return;
  }
  const items = await res.json();
  const grid = document.getElementById("grid");

  items.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.background = window.__cardBg || "#f3f4f6";
    card.innerHTML = `
      <div class="title">${p.title}</div>
      <div class="price" style="color:${window.__muted || "#6b7280"}">
        ${(p.price/100).toFixed(2)} ${p.currency}
      </div>
      <div class="sizes"></div>
    `;
    const box = card.querySelector(".sizes");
    p.sizes.forEach(s => {
      const btn = document.createElement("button");
      btn.className = "size-btn";
      btn.textContent = s;
      btn.style.background = window.__btnBg || "#e5e7eb";
      btn.onclick = () => addToCart({ sku:p.sku, title:p.title, price:p.price, size:s, qty:1, currency:p.currency });
      box.appendChild(btn);
    });
    grid.appendChild(card);
  });

  // show a small debug badge (you can remove)
  document.body.insertAdjacentHTML("beforeend",
    `<div class="debug" style="color:${window.__muted || "#6b7280"}">
      scheme=${tg?.colorScheme || "n/a"}
     </div>`);

  updateMainButton();
}

bootstrap();
