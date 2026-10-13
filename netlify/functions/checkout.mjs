// Eyre Roses Decor Edit — pago del carrito con Stripe Checkout.
// GET  /api/checkout -> { stripe: true|false }  (si el pago con tarjeta está activo)
// POST /api/checkout -> { url }  crea la página de pago de Stripe con los productos del carrito.
// Los precios se toman de los datos guardados de la web, nunca de lo que manda el navegador.
// Requiere la variable STRIPE_SECRET_KEY en Netlify.
import { getStore } from "@netlify/blobs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const cents = (t) => {
  const m = String(t || "").replace(/,/g, "").match(/\d+(\.\d+)?/);
  return m ? Math.round(parseFloat(m[0]) * 100) : 0;
};
const sizes = (t) => String(t || "").split(/[,;/]+/).map((x) => x.trim()).filter(Boolean);

export default async (req) => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (req.method === "GET") return json({ stripe: !!key });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!key) return json({ error: "El pago en línea todavía no está activo." }, 501);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Pedido no válido" }, 400); }
  const en = body && body.lang === "en";
  const items = Array.isArray(body && body.items) ? body.items.slice(0, 30) : [];
  if (!items.length) return json({ error: en ? "Your bag is empty." : "Tu carrito está vacío." }, 400);

  const state = (await getStore({ name: "vitrina", consistency: "strong" }).get("state", { type: "json" })) || {};
  const products = Array.isArray(state.products) ? state.products : [];
  const settings = state.settings || {};
  const origin = new URL(req.url).origin;

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("locale", en ? "en" : "es");
  form.set("success_url", origin + "/?pedido=ok");
  form.set("cancel_url", origin + "/");
  form.set("shipping_address_collection[allowed_countries][0]", "US");
  form.set("phone_number_collection[enabled]", "true");

  let subtotal = 0, n = 0;
  for (const it of items) {
    const p = products.find((x) => x.id === it.id);
    const name = p ? (en && p.name_en ? p.name_en : p.name) : "";
    if (!p || p.store !== "propia" || p.soldOut) return json({ error: (en ? "No longer available: " : "Ya no está disponible: ") + (name || "una pieza") }, 409);
    const price = cents(p.price);
    if (!price) return json({ error: (en ? "Missing price: " : "Falta el precio de: ") + name }, 409);
    const list = sizes(p.sizes), gone = sizes(p.soldSizes).map((x) => x.toLowerCase());
    const size = String(it.size || "");
    if (list.length && (!list.includes(size) || gone.includes(size.toLowerCase())))
      return json({ error: (en ? "That size is no longer available: " : "Esa talla ya no está disponible: ") + name + " " + size }, 409);
    const qty = Math.max(1, Math.min(10, parseInt(it.qty, 10) || 1));
    form.set(`line_items[${n}][quantity]`, String(qty));
    form.set(`line_items[${n}][price_data][currency]`, "usd");
    form.set(`line_items[${n}][price_data][unit_amount]`, String(price));
    form.set(`line_items[${n}][price_data][product_data][name]`, name + (size ? (en ? " — Size " : " — Talla ") + size : ""));
    if (p.image && /^\/img\//.test(p.image)) form.set(`line_items[${n}][price_data][product_data][images][0]`, origin + p.image);
    form.set(`line_items[${n}][price_data][product_data][metadata][product_id]`, p.id);
    if (size) form.set(`line_items[${n}][price_data][product_data][metadata][size]`, size);
    subtotal += price * qty; n++;
  }

  const ship = cents(settings.shipCost), freeFrom = cents(settings.freeShipFrom);
  if (ship) {
    const isFree = freeFrom && subtotal >= freeFrom;
    form.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
    form.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(isFree ? 0 : ship));
    form.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
    form.set("shipping_options[0][shipping_rate_data][display_name]", isFree ? (en ? "Free shipping" : "Envío gratis") : (en ? "Shipping" : "Envío"));
  }

  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || !out.url) return json({ error: en ? "Checkout could not be opened. Please try again." : "No se pudo abrir el pago. Inténtalo de nuevo." }, 502);
  return json({ url: out.url });
};

export const config = { path: "/api/checkout" };
