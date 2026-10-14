// Eyre Roses Decor Edit — estadísticas de visitas (anónimas, sin cookies).
// POST /api/t      -> registra una visita, un clic a tienda o un "añadir al carrito"
// GET  /api/stats  -> totales por día (requiere contraseña), ?days=90
// Se guardan solo conteos por día: páginas, de dónde llegan, país y ciudad aproximados,
// tipo de dispositivo y clics por producto. Nada que identifique a una persona.
import { getStore } from "@netlify/blobs";
import { authorized } from "../lib/auth.mjs";

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|monitor/i;
const TZ = "America/Chicago";
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const clip = (t, n = 80) => String(t || "").replace(/[\u0000-\u001f]/g, "").slice(0, n);
const bump = (obj, k, n = 1) => { if (!k) return; obj[k] = (obj[k] || 0) + n; };

async function update(store, key, fn) {
  for (let i = 0; i < 4; i++) {
    const cur = await store.getWithMetadata(key, { type: "json" });
    const data = cur ? cur.data : {};
    fn(data);
    const opts = cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true };
    const res = await store.setJSON(key, data, opts);
    if (!res || res.modified !== false) return;
  }
}

export default async (req, context) => {
  const url = new URL(req.url);
  const store = getStore({ name: "vitrina-stats", consistency: "strong" });

  if (url.pathname === "/api/stats") {
    if (!(await authorized(req))) return Response.json({ error: "Contraseña incorrecta" }, { status: 401 });
    const days = Math.max(1, Math.min(400, parseInt(url.searchParams.get("days"), 10) || 90));
    const keys = [];
    for (let i = days - 1; i >= 0; i--) keys.push(dayKey(new Date(Date.now() - i * 86400000)));
    const uniq = [...new Set(keys)];
    const rows = await Promise.all(uniq.map(async (k) => ({ date: k, ...((await store.get("day-" + k, { type: "json" })) || {}) })));
    return Response.json({ days: rows }, { headers: { "cache-control": "no-store" } });
  }

  if (req.method !== "POST") return new Response(null, { status: 405 });
  const ua = req.headers.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
  let b;
  try { b = JSON.parse(await req.text()); } catch { return new Response(null, { status: 400 }); }
  const type = String(b && b.t || "");
  if (!["view", "click", "cart"].includes(type)) return new Response(null, { status: 400 });

  const geo = (context && context.geo) || {};
  const country = clip(geo.country && geo.country.name, 40);
  const city = clip(geo.city, 40);
  const mobile = /Mobi|Android|iPhone|iPad/i.test(ua);

  await update(store, "day-" + dayKey(new Date()), (d) => {
    if (type === "view") {
      d.v = (d.v || 0) + 1;
      d.pg = d.pg || {}; bump(d.pg, clip(b.p, 120) || "/");
      if (b.nv) {
        d.u = (d.u || 0) + 1;
        d.src = d.src || {}; bump(d.src, clip(b.s, 30) || "Directo");
        d.co = d.co || {}; bump(d.co, country || "?");
        if (city) { d.ci = d.ci || {}; bump(d.ci, city + (country ? ", " + country : "")); }
        d.dev = d.dev || {}; bump(d.dev, mobile ? "m" : "d");
      }
    } else if (type === "click") {
      d.ck = d.ck || {}; bump(d.ck, clip(b.pid, 40));
    } else if (type === "cart") {
      d.ct = d.ct || {}; bump(d.ct, clip(b.pid, 40));
    }
  });
  return new Response(null, { status: 204 });
};

export const config = { path: ["/api/t", "/api/stats"] };
