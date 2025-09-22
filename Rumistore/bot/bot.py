import os, json, asyncio
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import (
    Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo,
    LabeledPrice, PreCheckoutQuery, ContentType, ShippingQuery, ShippingOption
)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
BOT_TOKEN = os.getenv("BOT_TOKEN")
PROVIDER_TOKEN = os.getenv("PROVIDER_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN не задан")
if not WEBAPP_URL or not WEBAPP_URL.startswith("http"):
    raise RuntimeError("WEBAPP_URL некорректен")

bot = Bot(BOT_TOKEN)
dp = Dispatcher()

# Источник истины цен
PRODUCTS = {
    "airmax90": {"title": "Nike Air Max 90", "price": 12990, "currency": "RUB"},
    "nb550":    {"title": "New Balance 550", "price": 15990, "currency": "RUB"},
}

def open_shop_kb():
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🛍 Открыть магазин", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])

@dp.message(CommandStart())
async def start(m: Message):
    await m.answer("Привет! Открой мини-магазин:", reply_markup=open_shop_kb())

@dp.message(F.web_app_data)
async def webapp_data(m: Message):
    data = json.loads(m.web_app_data.data or "{}")
    if data.get("action") != "checkout":
        await m.answer("Неизвестное действие"); return

    items = data.get("items", [])
    currency = "RUB"
    prices = []

    for it in items:
        sku, qty = it.get("sku"), int(it.get("qty", 1))
        size = it.get("size", "?")
        prod = PRODUCTS.get(sku)
        if not prod:
            continue
        currency = prod["currency"]
        prices.append(LabeledPrice(
            label=f"{prod['title']} ({size}) × {qty}",
            amount=prod["price"] * qty
        ))

    if not prices:
        await m.answer("Корзина пуста"); return

    if not PROVIDER_TOKEN:
        total = sum(p.amount for p in prices) / 100
        await m.answer(f"🧪 DEMO: заказ на {total:.2f} {currency}. Подключи PROVIDER_TOKEN для оплаты.")
        return

    await bot.send_invoice(
        chat_id=m.chat.id,
        title="Оплата заказа",
        description="Кроссовки",
        payload=f"order_{m.from_user.id}",
        provider_token=PROVIDER_TOKEN,
        currency=currency,
        prices=prices,
        need_name=True,
        need_phone_number=True,
        need_shipping_address=True,
        is_flexible=True
    )

@dp.shipping_query()
async def shipping(shq: ShippingQuery):
    opts = [
        ShippingOption(id="pickup", title="Самовывоз").add_price(LabeledPrice("0", 0)),
        ShippingOption(id="courier", title="Курьер 1–3 дня").add_price(LabeledPrice("Доставка", 39900))
    ]
    await bot.answer_shipping_query(shq.id, ok=True, shipping_options=opts)

@dp.pre_checkout_query()
async def pre_checkout(pcq: PreCheckoutQuery):
    await bot.answer_pre_checkout_query(pcq.id, ok=True)

@dp.message(F.content_type == ContentType.SUCCESSFUL_PAYMENT)
async def paid(m: Message):
    sp = m.successful_payment
    await m.answer(f"✅ Оплачено {sp.total_amount/100:.2f} {sp.currency}. Спасибо! Мы свяжемся по доставке.")

async def main():
    # на всякий случай — убрать вебхук и висящие апдейты, чтобы не было Conflict
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
