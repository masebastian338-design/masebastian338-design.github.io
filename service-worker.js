// =========================================================
// SERVICE WORKER — hace que la web se pueda instalar y abrir
// sin internet.
// Estrategia:
//  - Archivos propios (HTML, CSS, JS, contenido): "red primero".
//    Si hay internet, siempre trae la versión nueva; si no, usa
//    la copia guardada. Así NO tienes que cambiar nada al
//    actualizar la web.
//  - SDK de Firebase (gstatic.com, versión fija): "caché primero".
//  - Datos de Firestore y login: no se tocan (Firebase tiene su
//    propia caché offline).
// =========================================================

const CACHE = "together-v1";

// Archivos básicos que se guardan al instalar
const BASICOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/estilos.css",
  "./js/app.js",
  "./js/config.js",
  "./js/firebase.js",
  "./js/auth.js",
  "./js/i18n.js",
  "./js/datos/perfiles.js",
  "./js/ui/componentes.js",
  "./js/ui/voz.js",
  "./js/paginas/inicio.js",
  "./js/paginas/perfil.js",
  "./js/paginas/pareja.js",
  "./js/paginas/mas.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (ev) => {
  // Borra cachés de versiones anteriores
  ev.waitUntil(
    caches.keys().then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // SDK de Firebase: caché primero (la versión está fija en la URL)
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    ev.respondWith(
      caches.match(req).then(enCache => enCache || fetch(req).then(resp => {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
        return resp;
      }))
    );
    return;
  }

  // Archivos propios: red primero, caché si no hay internet
  if (url.origin === self.location.origin) {
    ev.respondWith(
      fetch(req).then(resp => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
  }
  // Todo lo demás (Firestore, Google login) pasa directo
});
