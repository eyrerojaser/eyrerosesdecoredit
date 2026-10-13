// Eyre Roses Decor Edit — archivos para buscadores.
// GET /sitemap.xml -> lista de páginas (portada, categorías y colecciones) para Google
// GET /robots.txt  -> indica a los buscadores qué pueden leer y dónde está el sitemap
import { getStore } from "@netlify/blobs";

const slug = (t) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const xmlEsc = (t) => String(t).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

export default async (req) => {
  const url = new URL(req.url);
  const origin = url.origin;

  if (url.pathname === "/robots.txt") {
    return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }

  const state = (await getStore({ name: "vitrina" }).get("state", { type: "json" })) || {};
  const lastmod = state.savedAt ? state.savedAt.slice(0, 10) : undefined;
  const pages = [{ loc: "/", priority: "1.0" }];
  const cats = Array.isArray(state.categories) ? state.categories : [];
  const products = Array.isArray(state.products) ? state.products : [];
  for (const c of cats) {
    const fam = [c.id, ...cats.filter((k) => k.parent === c.id).map((k) => k.id)];
    if (products.some((p) => fam.includes(p.category))) pages.push({ loc: `/categoria/${c.id}`, priority: "0.7" });
  }
  for (const c of Array.isArray(state.collections) ? state.collections : []) {
    const s = slug(c.title);
    pages.push({ loc: `/coleccion/${s ? s + "-" : ""}${c.id}`, priority: "0.8" });
  }
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages.map((p) => `  <url><loc>${xmlEsc(origin + p.loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>${p.priority}</priority></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};

export const config = { path: ["/sitemap.xml", "/robots.txt"] };
