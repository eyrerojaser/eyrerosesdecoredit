// Eyre Roses Decor Edit — datos del sitio (productos, colecciones, ajustes).
// GET  /api/data      -> devuelve los datos (público)
// PUT  /api/data      -> guarda los datos (requiere contraseña). Body: { state, base }
//                        "base" es la fecha (savedAt) de la versión que se cargó; si en el
//                        servidor hay una versión distinta, no se guarda (409) para no pisar datos.
// POST /api/login     -> comprueba la contraseña
// GET  /api/backups   -> lista las copias de seguridad (requiere contraseña)
// POST /api/restore   -> restaura una copia { key } (requiere contraseña)
import { getStore } from "@netlify/blobs";
import { authorized } from "../lib/auth.mjs";

const KEEP = 40;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const valid = (s) =>
  s && Array.isArray(s.products) && Array.isArray(s.collections) && Array.isArray(s.categories) && typeof s.settings === "object";

async function backup(store, state) {
  if (!valid(state)) return;
  const stamp = state.savedAt || new Date().toISOString();
  await store.setJSON("backup-" + stamp, state);
  // Keep only the most recent copies.
  const { blobs } = await store.list({ prefix: "backup-" });
  const keys = blobs.map((b) => b.key).sort().reverse();
  for (const key of keys.slice(KEEP)) await store.delete(key);
}

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore({ name: "vitrina", consistency: "strong" });

  if (url.pathname === "/api/login") {
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
    if (!process.env.ADMIN_PASSWORD) return json({ error: "Falta configurar ADMIN_PASSWORD en Netlify." }, 500);
    return (await authorized(req)) ? json({ ok: true }) : json({ error: "Contraseña incorrecta" }, 401);
  }

  if (url.pathname === "/api/backups") {
    if (!(await authorized(req))) return json({ error: "Contraseña incorrecta" }, 401);
    const { blobs } = await store.list({ prefix: "backup-" });
    const keys = blobs.map((b) => b.key).sort().reverse().slice(0, KEEP);
    const out = [];
    for (const key of keys) {
      const s = await store.get(key, { type: "json" });
      if (!valid(s)) continue;
      out.push({
        key,
        savedAt: s.savedAt || key.slice(7),
        products: s.products.length,
        collections: s.collections.length,
        titles: s.collections.slice(0, 3).map((c) => c.title),
        examples: s.products.filter((p) => p.example).length,
      });
    }
    return json({ backups: out });
  }

  if (url.pathname === "/api/restore") {
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
    if (!(await authorized(req))) return json({ error: "Contraseña incorrecta" }, 401);
    let body;
    try { body = await req.json(); } catch { return json({ error: "Datos no válidos" }, 400); }
    const key = body && String(body.key || "");
    if (!key.startsWith("backup-")) return json({ error: "Copia no válida" }, 400);
    const old = await store.get(key, { type: "json" });
    if (!valid(old)) return json({ error: "No se encontró esa copia" }, 404);
    const current = await store.get("state", { type: "json" });
    await backup(store, current); // the version being replaced stays recoverable
    old.savedAt = new Date().toISOString();
    await store.setJSON("state", old);
    return json({ ok: true, state: old });
  }

  if (req.method === "GET") {
    const state = await store.get("state", { type: "json" });
    return json(state || null);
  }

  if (req.method === "PUT") {
    if (!(await authorized(req))) return json({ error: "Contraseña incorrecta" }, 401);
    const text = await req.text();
    if (text.length > 4 * 1024 * 1024) return json({ error: "Los datos son demasiado grandes." }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: "Datos no válidos" }, 400); }
    const state = body && body.state;
    const base = body && body.base != null ? String(body.base) : null;
    if (!valid(state)) return json({ error: "Datos no válidos" }, 400);

    const current = await store.get("state", { type: "json" });
    if (current && current.savedAt && base !== current.savedAt) {
      // Someone (another device, an old tab, or a page that failed to load) is behind: refuse.
      return json({ error: "Hay una versión más nueva guardada.", conflict: true, state: current }, 409);
    }
    if (current) await backup(store, current);

    state.savedAt = new Date().toISOString();
    await store.setJSON("state", state);
    return json({ ok: true, savedAt: state.savedAt });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: ["/api/data", "/api/login", "/api/backups", "/api/restore"] };
