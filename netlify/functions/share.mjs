// Eyre Roses Decor Edit — vista previa al compartir un enlace.
// Cuando alguien pega el enlace de un outfit o de un producto en Instagram, Pinterest,
// Facebook o WhatsApp, esas apps leen la página sin ejecutarla. Esta función entrega la
// misma página de siempre, pero con el título, la descripción y la foto de ESE outfit o producto.
// Si algo falla, entrega la página normal: el enlace siempre funciona.
import { getStore } from "@netlify/blobs";

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const plain = (t, n = 155) => {
  t = String(t || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t;
};
const okImg = (u) => typeof u === "string" && (/^\/img\//.test(u) || /^https:\/\//.test(u));

function setTag(html, re, tag) { return re.test(html) ? html.replace(re, tag) : html; }

export default async (req) => {
  const url = new URL(req.url);
  const origin = url.origin;
  let html;
  try {
    const r = await fetch(origin + "/index.html");
    html = await r.text();
  } catch {
    return new Response(null, { status: 302, headers: { location: "/" } });
  }
  const page = (body) => new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
  try {
    const m = decodeURIComponent(url.pathname).replace(/\/+$/, "").match(/^\/(coleccion|collection|producto|product)\/(.+)$/i);
    if (!m) return page(html);
    const kind = /^(coleccion|collection)$/i.test(m[1]) ? "c" : "p";
    const id = m[2].slice(m[2].lastIndexOf("-") + 1);
    const state = (await getStore({ name: "vitrina" }).get("state", { type: "json" })) || {};
    const site = "Eyre Roses Decor Edit";
    let title, desc, img;
    if (kind === "c") {
      const c = (state.collections || []).find((x) => x.id === id);
      if (!c) return page(html);
      const n = (c.productIds || []).length;
      title = c.title;
      desc = plain(c.desc || `${c.title} — ${n} ${n === 1 ? "pieza" : "piezas"} para comprar en Amazon, elegidas por Eyre Roses.`);
      img = c.image;
    } else {
      const p = (state.products || []).find((x) => x.id === id);
      if (!p) return page(html);
      title = p.name;
      desc = plain(p.note || `Compra ${p.name}, elegido por Eyre Roses.`);
      img = p.image;
    }
    const full = `${title} · ${site}`;
    const image = okImg(img) ? new URL(img, origin).href : origin + "/icon-512.png";
    const here = origin + url.pathname;
    html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(full)}</title>`);
    html = setTag(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
    html = setTag(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(here)}">`);
    html = setTag(html, /<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${kind === "p" ? "product" : "website"}">`);
    html = setTag(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(full)}">`);
    html = setTag(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
    html = setTag(html, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}">`);
    html = setTag(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(here)}">`);
    return page(html);
  } catch {
    return page(html);
  }
};

export const config = { path: ["/coleccion/*", "/collection/*", "/producto/*", "/product/*"] };
