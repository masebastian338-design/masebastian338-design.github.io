// =========================================================
// APP PRINCIPAL — arranque, inicio de sesión y navegación
// ---------------------------------------------------------
// Flujo:
//  1. ¿Hay configuración de Firebase? No → modo demo.
//  2. Sí → esperar sesión de Google.
//  3. Con sesión → ¿el correo está en la lista de acceso?
//  4. Sí → cargar (o crear) perfil y el de la pareja → mostrar la app.
// =========================================================
import { configurado } from "./config.js";
import { iniciarFirebase } from "./firebase.js";
import { iniciarSesionGoogle, cerrarSesion, alCambiarSesion, mensajeErrorLogin } from "./auth.js";
import * as datos from "./datos/perfiles.js";
import { t, establecerIdioma } from "./i18n.js";
import { esc } from "./ui/componentes.js";

import * as pInicio from "./paginas/inicio.js";
import * as pPerfil from "./paginas/perfil.js";
import * as pPareja from "./paginas/pareja.js";
import * as pMas from "./paginas/mas.js";
import * as pHoy from "./paginas/hoy.js";
import * as pVocabulario from "./paginas/vocabulario.js";
import * as pQuizzes from "./paginas/quizzes.js";
import * as pSpeaking from "./paginas/speaking.js";
import * as pCalendario from "./paginas/calendario.js";
import * as pRuta from "./paginas/ruta.js";
import * as pEvaluaciones from "./paginas/evaluaciones.js";
import { hablar } from "./ui/voz.js";
import { sumarSegundos } from "./datos/progreso.js";
import { borrarDatosDemo } from "./datos/almacen.js";

const raiz = document.getElementById("app");

// Estado global: quién inició sesión y su pareja
const estado = { usuario: null, perfil: null, pareja: null };

// Páginas ya construidas. Las demás muestran "en construcción".
const PAGINAS = {
  inicio: pInicio,
  perfil: pPerfil,
  pareja: pPareja,
  mas: pMas,
  hoy: pHoy,
  vocabulario: pVocabulario,
  quizzes: pQuizzes,
  speaking: pSpeaking,
  calendario: pCalendario,
  ruta: pRuta,
  evaluaciones: pEvaluaciones,
};

// Barra inferior: las 5 secciones principales
const NAV = [
  { ruta: "inicio",      icono: "🏠" },
  { ruta: "hoy",         icono: "📅" },
  { ruta: "vocabulario", icono: "🃏" },
  { ruta: "pareja",      icono: "💞" },
  { ruta: "mas",         icono: "☰" },
];

// ---------------------------------------------------------
// Pantallas antes de entrar
// ---------------------------------------------------------
function pantallaLogin(error = "") {
  // ¿Está abierta como app instalada en iPhone? Ahí las ventanas emergentes a veces fallan.
  const esPWAiOS = window.navigator.standalone === true;
  raiz.innerHTML = `
    <main class="login">
      <div class="logo-grande">🗣️</div>
      <h1>Together English</h1>
      <p class="suave">Aprendamos inglés juntos · Let's learn English together</p>
      <button class="boton boton-google ancho" id="entrar">
        <span aria-hidden="true">🔐</span> Entrar con Google
      </button>
      ${error ? `<div class="aviso error">${esc(error)}</div>` : ""}
      ${esPWAiOS ? `<div class="aviso">Si no se abre la ventana de Google, abre la web en Safari, inicia sesión ahí y luego vuelve a la app.</div>` : ""}
    </main>`;
  raiz.querySelector("#entrar").onclick = async (ev) => {
    ev.currentTarget.disabled = true;
    try {
      await iniciarSesionGoogle(); // alCambiarSesion se encarga del resto
    } catch (e) {
      pantallaLogin(mensajeErrorLogin(e));
    }
  };
}

function pantallaSinAcceso(correo) {
  raiz.innerHTML = `
    <main class="login">
      <div class="logo-grande">🔒</div>
      <h1>Sin acceso</h1>
      <p>La cuenta <b>${esc(correo)}</b> no está en la lista de acceso.</p>
      <p class="suave pequeno">Esta plataforma es privada. Si es tu cuenta correcta, revisa que exista el documento
      <code>acceso/${esc(correo)}</code> en Firestore (ver la guía de la Fase 2).</p>
      <button class="boton secundario ancho" id="salir">Usar otra cuenta</button>
    </main>`;
  raiz.querySelector("#salir").onclick = () => cerrarSesion();
}

function pantallaDemo() {
  raiz.innerHTML = `
    <main class="login">
      <div class="logo-grande">🧪</div>
      <h1>Modo demo</h1>
      <p class="suave">Firebase todavía no está configurado (<code>js/config.js</code>).
      Puedes explorar la interfaz con datos de prueba guardados solo en este navegador.</p>
      <button class="boton ancho" id="demo-a">Ver como Sebastián (ruta A · inglés)</button>
      <button class="boton secundario ancho" id="demo-b">Ver como Xiomara (ruta B · español)</button>
    </main>`;
  const entrar = (rol) => {
    datos.iniciarDemo(rol);
    entrarALaApp({ uid: rol === "B" ? "demo-b" : "demo-a" }, { rol });
  };
  raiz.querySelector("#demo-a").onclick = () => entrar("A");
  raiz.querySelector("#demo-b").onclick = () => entrar("B");
}

function pantallaError(mensaje) {
  raiz.innerHTML = `<main class="login"><div class="logo-grande">⚠️</div>
    <h1>Algo salió mal</h1><div class="aviso error">${esc(mensaje)}</div>
    <button class="boton ancho" onclick="location.reload()">Reintentar</button></main>`;
}

// ---------------------------------------------------------
// Dentro de la app
// ---------------------------------------------------------
async function entrarALaApp(usuario, acceso) {
  estado.usuario = usuario;
  estado.perfil = await datos.cargarOCrearPerfil(usuario, acceso);
  establecerIdioma(estado.perfil);
  try {
    estado.pareja = await datos.cargarPareja(estado.perfil.uid);
  } catch (e) {
    console.warn("No se pudo cargar la pareja:", e);
    estado.pareja = null;
  }
  if (!location.hash) location.hash = "#/inicio";
  else dibujarPagina();
}

async function salir() {
  if (datos.esDemo()) {
    datos.salirDemo();
    borrarDatosDemo();
    estado.perfil = null;
    location.hash = "";
    pantallaDemo();
  } else {
    await cerrarSesion();
  }
}

function rutaActual() {
  return (location.hash.replace(/^#\/?/, "").split("?")[0]) || "inicio";
}

// Dibuja la página que indica la URL (#/inicio, #/perfil, …)
async function dibujarPagina() {
  if (!estado.perfil) return;
  const ruta = rutaActual();
  const pagina = PAGINAS[ruta];
  const contenido = pagina ? pagina.render(estado) : pMas.renderPendiente(ruta);

  const nav = NAV.map(n => `
    <a href="#/${n.ruta}" class="${n.ruta === ruta ? "activo" : ""}" ${n.ruta === ruta ? 'aria-current="page"' : ""}>
      <span class="icono" aria-hidden="true">${n.icono}</span>${t("nav." + n.ruta)}
    </a>`).join("");

  raiz.innerHTML = `
    <main class="contenedor">
      ${datos.esDemo() ? `<p><span class="insignia-demo">${t("demo")}</span></p>` : ""}
      <div id="sin-conexion" class="aviso" ${navigator.onLine ? "hidden" : ""}>${t("sinConexion")}</div>
      ${contenido}
    </main>
    <nav class="nav-inferior" aria-label="Principal">${nav}</nav>`;

  window.scrollTo(0, 0);
  if (pagina?.montar) await pagina.montar(raiz, estado, { salir });
}

window.addEventListener("hashchange", () => { volcarTiempo(); speechSynthesis?.cancel?.(); dibujarPagina(); });

// Cualquier botón con data-oir="texto" lee ese texto en voz alta
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-oir]");
  if (b && estado.perfil) hablar(b.dataset.oir, estado.perfil.ajustes);
});

// ---------------------------------------------------------
// TIEMPO REAL DE ESTUDIO
// Cuenta segundos solo si: estás en una sección de estudio, la app
// está visible y tocaste/escribiste algo en los últimos 2 minutos
// (así no cuenta si dejas el celular abierto). Se guarda cada minuto.
// ---------------------------------------------------------
const RUTAS_ESTUDIO = new Set(["hoy", "vocabulario", "quizzes", "speaking", "ruta", "evaluaciones"]);
let ultimaActividad = Date.now();
let segundosPendientes = 0;
for (const ev of ["pointerdown", "keydown", "touchstart", "scroll"]) {
  window.addEventListener(ev, () => { ultimaActividad = Date.now(); }, { passive: true });
}
setInterval(() => {
  const activo = estado.perfil && document.visibilityState === "visible"
    && RUTAS_ESTUDIO.has(rutaActual()) && Date.now() - ultimaActividad < 120000;
  if (activo) segundosPendientes += 5;
}, 5000);
function volcarTiempo() {
  if (!estado.perfil || segundosPendientes < 5) return;
  const s = segundosPendientes;
  segundosPendientes = 0;
  sumarSegundos(estado.perfil.uid, s).catch(() => { segundosPendientes += s; });
}
setInterval(volcarTiempo, 60000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") volcarTiempo(); });

// Aviso de "sin conexión"
for (const ev of ["online", "offline"]) {
  window.addEventListener(ev, () => {
    const el = document.getElementById("sin-conexion");
    if (el) el.hidden = navigator.onLine;
  });
}

// ---------------------------------------------------------
// Arranque
// ---------------------------------------------------------
async function arrancar() {
  // Service worker: permite instalar la app y abrirla sin internet
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(e => console.warn("SW:", e));
  }

  // Modo demo: sin configuración, o abriendo la web con ?demo al final
  // (ej. https://…github.io/?demo) para probar sin tocar los datos reales.
  if (!configurado || new URLSearchParams(location.search).has("demo")) {
    datos.usarModoDemo();
    // Si ya había una demo abierta, entra directo (al recargar no vuelve a preguntar)
    const rol = datos.demoGuardada();
    if (rol) entrarALaApp({ uid: rol === "B" ? "demo-b" : "demo-a" }, { rol });
    else pantallaDemo();
    return;
  }

  try {
    await iniciarFirebase();
  } catch (e) {
    pantallaError("No se pudo cargar Firebase. ¿Hay conexión a internet? " + (e.message || ""));
    return;
  }

  alCambiarSesion(async (usuario) => {
    if (!usuario) {
      estado.perfil = null;
      pantallaLogin();
      return;
    }
    const acceso = await datos.verificarAcceso(usuario);
    if (!acceso) {
      pantallaSinAcceso(usuario.email);
      return;
    }
    try {
      await entrarALaApp(usuario, acceso);
    } catch (e) {
      console.error(e);
      pantallaError("No se pudo cargar tu perfil: " + (e.code || e.message));
    }
  });
}

arrancar();
