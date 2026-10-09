// Vitrina & Co. — fotos.
// POST /api/img     -> sube una foto (requiere contraseña), devuelve { url }
// GET  /img/:key    -> sirve la foto
import { getStore } from "@netlify/blobs";
import { authorized } from "../lib/auth.mjs";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export default async (req, context) => {
  const store = getStore("vitrina-img");

  if (req.method === "POST") {
    if (!(await authorized(req))) return Response.json({ error: "Contraseña incorrecta" }, { status: 401 });
    const type = (req.headers.get("content-type") || "").split(";")[0].trim();
    if (!TYPES[type]) return Response.json({ error: "Formato de imagen no admitido" }, { status: 415 });
    const data = await req.arrayBuffer();
    if (!data.byteLength || data.byteLength > 6 * 1024 * 1024) return Response.json({ error: "La imagen pesa demasiado" }, { status: 413 });
    const key = crypto.randomUUID() + "." + TYPES[type];
    await store.set(key, data, { metadata: { type } });
    return Response.json({ url: "/img/" + key });
  }

  if (req.method === "GET") {
    const key = context.params && context.params.key;
    if (!key || !/^[a-z0-9-]+\.(jpg|png|webp)$/i.test(key)) return new Response("No encontrada", { status: 404 });
    const entry = await store.getWithMetadata(key, { type: "stream" });
    if (entry === null) return new Response("No encontrada", { status: 404 });
    return new Response(entry.data, {
      headers: {
        "content-type": (entry.metadata && entry.metadata.type) || "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new Response("Método no permitido", { status: 405 });
};

export const config = { path: ["/api/img", "/img/:key"] };
