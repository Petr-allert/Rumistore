const tg = window.Telegram.WebApp;
tg.expand();

const state = { cart: [] };
const byKey = (i) => i.sku + "|" + i.size;
const total = () => state.cart.reduce((s,i)=>s + i.price*i.qty, 0);
const currency = () => state.cart[0]?.currency || "RUB";

function updateMainButton(){
  if(state.cart.length === 0){ tg.MainButton.hide(); return; }
  tg.MainButton.setText(`Оплатить ${(total()/100).toFixed(2)} ${currency()}`);
  tg.MainButton.show();
}

function addToCart(item){
  const key = byKey(item);
  const found = state.cart.find(i => byKey(i) === key);
  if(found) found.qty += 1; else state.cart.push(item);
  tg.HapticFeedback.selectionChanged();
  updateMainButton();
}

tg.MainButton.onClick(() => {
  if(state.cart.length === 0) return;
  tg.sendData(JSON.stringify({
    action: "checkout",
    items: state.cart.map(i => ({
      sku: i.sku, size: i.size, qty: i.qty,
      // price/title клиент присылает для удобства, НО цена будет рассчитана ботом
      price: i.price, title: i.title
    })),
    currency: currency()
  }));
});

// рендер карточек
async function bootstrap(){
  const res = await fetch("./products.json");
  const items = await res.json();
  const grid = document.getElementById("grid");

  // адаптация к теме Telegram
  const tp = tg.themeParams || {};
  document.body.style.background = tp.bg_color || "white";
  document.querySelectorAll(".card").forEach(el => el.style.background = tp.secondary_bg_color || "#f3f4f6");

  items.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="title">${p.title}</div>
      <div class="price">${(p.price/100).toFixed(2)} ${p.currency}</div>
      <div class="sizes"></div>
    `;
    const box = card.querySelector(".sizes");
    p.sizes.forEach(s => {
      const btn = document.createElement("button");
      btn.className = "size-btn";
      btn.textContent = s;
      btn.onclick = () => addToCart({ sku:p.sku, title:p.title, price:p.price, size:s, qty:1, currency:p.currency });
      box.appendChild(btn);
    });
    grid.appendChild(card);
  });
}
bootstrap();
