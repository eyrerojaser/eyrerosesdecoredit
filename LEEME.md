# Vitrina & Co. — cómo ponerla en tu Netlify

Esta carpeta es tu sitio completo. Cuando esté en Netlify, entras a `tusitio.netlify.app/#admin`, pones tu contraseña y todo lo que agregues, edites o elimines se guarda solo. No hay que descargar nada ni tocar GitHub otra vez.

## Qué hay en la carpeta

- `public/index.html` — la vitrina y el panel de administración.
- `netlify/functions/` — lo que guarda tus productos y tus fotos en Netlify.
- `netlify/lib/auth.mjs` — revisa tu contraseña.
- `package.json` y `netlify.toml` — instrucciones para Netlify. No hay que tocarlas.

## Paso 1 · Subir la carpeta a GitHub

1. Descomprime el archivo `vitrina-and-co.zip` en tu computadora.
2. En GitHub, crea un repositorio nuevo, por ejemplo `vitrina-and-co`. Puede ser privado.
3. Toca **uploading an existing file** y arrastra **todo lo que hay dentro** de la carpeta `vitrina-netlify` (las carpetas `public` y `netlify`, y los archivos `package.json`, `netlify.toml` y este `LEEME.md`).
4. Toca **Commit changes**.

## Paso 2 · Conectar con Netlify

1. En Netlify: **Add new site → Import an existing project → GitHub**.
2. Elige el repositorio `vitrina-and-co`.
3. Netlify lee la configuración solo. Toca **Deploy**.

## Paso 3 · Poner tu contraseña del panel

1. En Netlify, entra a tu sitio → **Site configuration → Environment variables → Add a variable**.
2. Nombre: `ADMIN_PASSWORD`. Valor: la contraseña que quieras (larga, que nadie adivine).
3. Ve a **Deploys → Trigger deploy → Deploy site** para que tome la contraseña.

## Paso 4 · Usar el panel

1. Abre `https://TU-SITIO.netlify.app/#admin`.
2. Escribe tu contraseña. Si marcas «Recordarme», no te la vuelve a pedir en ese dispositivo.
3. Agrega productos, fotos, enlaces y colecciones. Arriba verás «Guardado. Ya está en tu web.» cada vez que se guarde.

El botón **Administrar** solo aparece cuando has entrado con tu contraseña. Tus visitantes nunca lo ven.

## Tu dominio propio

En Netlify: **Domain management → Add a domain**, y sigue los pasos para conectar, por ejemplo, `vitrinaandco.com`.

## Copias de seguridad

Cada día que guardas, Netlify guarda también una copia con la fecha. Si algún día borras algo por error, esa copia permite recuperarlo.

## Si algo no funciona

- **«Falta configurar ADMIN_PASSWORD»**: revisa el Paso 3 y vuelve a desplegar.
- **«El panel solo funciona cuando el sitio está publicado en Netlify»**: estás abriendo el archivo desde tu computadora. Ábrelo desde tu dirección de Netlify.
- **Contraseña incorrecta**: revisa que sea igual a la de `ADMIN_PASSWORD`, con mayúsculas y minúsculas.
