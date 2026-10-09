// Vitrina & Co. — datos del sitio (productos, colecciones, ajustes).
// GET  /api/data   -> devuelve los datos (público)
// PUT  /api/data   -> guarda los datos (requiere contraseña)
// POST /api/login  -> comprueba la contraseña
import { getStore } from "@netlify/blobs";
import { authorized } from "../lib/auth.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore({ name: "vitrina", consistency: "strong" });

  if (url.pathname === "/api/login") {
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
    if (!process.env.ADMIN_PASSWORD) return json({ error: "Falta configurar ADMIN_PASSWORD en Netlify." }, 500);
    return (await authorized(req)) ? json({ ok: true }) : json({ error: "Contraseña incorrecta" }, 401);
  }

  if (req.method === "GET") {
    const state = await store.get("state", { type: "json" });
    return json(state || null);
  }

  if (req.method === "PUT") {
    if (!(await authorized(req))) return json({ error: "Contraseña incorrecta" }, 401);
    const text = await req.text();
    if (text.length > 4 * 1024 * 1024) return json({ error: "Los datos son demasiado grandes." }, 413);
    let state;
    try { state = JSON.parse(text); } catch { return json({ error: "Datos no válidos" }, 400); }
    if (!state || !Array.isArray(state.products) || !Array.isArray(state.collections) || !Array.isArray(state.categories) || typeof state.settings !== "object") {
      return json({ error: "Datos no válidos" }, 400);
    }
    state.savedAt = new Date().toISOString();
    await store.setJSON("state", state);
    // Copia de seguridad diaria, por si algún día necesitas volver atrás.
    await store.setJSON("backup-" + state.savedAt.slice(0, 10), state);
    return json({ ok: true, savedAt: state.savedAt });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: ["/api/data", "/api/login"] };
