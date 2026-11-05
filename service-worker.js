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

const CACHE = "together-v3"; // súbelo (v3, v4…) si agregas archivos nuevos a BASICOS

// Archivos básicos que se guardan al instalar
const BASICOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/estilos.css",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./js/app.js",
  "./js/auth.js",
  "./js/config.js",
  "./js/firebase.js",
  "./js/i18n.js",
  "./js/ui/componentes.js",
  "./js/ui/ejercicios.js",
  "./js/ui/evaluacion.js",
  "./js/ui/leccion.js",
  "./js/ui/speaking.js",
  "./js/ui/tarjetas.js",
  "./js/ui/voz.js",
  "./js/datos/almacen.js",
  "./js/datos/contenido.js",
  "./js/datos/evaluaciones.js",
  "./js/datos/grabaciones.js",
  "./js/datos/perfiles.js",
  "./js/datos/progreso.js",
  "./js/motor/calendario.js",
  "./js/motor/debilidades.js",
  "./js/motor/diagnostico.js",
  "./js/motor/evaluacion.js",
  "./js/motor/niveles.js",
  "./js/motor/racha.js",
  "./js/motor/sesion.js",
  "./js/motor/srs.js",
  "./js/paginas/calendario.js",
  "./js/paginas/evaluaciones.js",
  "./js/paginas/hoy.js",
  "./js/paginas/inicio.js",
  "./js/paginas/mas.js",
  "./js/paginas/pareja.js",
  "./js/paginas/perfil.js",
  "./js/paginas/quizzes.js",
  "./js/paginas/ruta.js",
  "./js/paginas/speaking.js",
  "./js/paginas/vocabulario.js",
  "./contenido/diagnostico.json",
  "./contenido/indice.json",
  "./contenido/temas.json",
  "./contenido/ruta-B/semana-1.json",
  "./contenido/ruta-A/semana-1.json",
  "./prompts/diagnostico-speaking.md",
  "./prompts/evaluacion-mensual-speaking.md",
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
