// =========================================================
// PERFILES — leer y guardar datos de cada estudiante
// ---------------------------------------------------------
// Funciona en dos modos:
//  - "firebase": datos reales en Firestore (sincronizados).
//  - "demo": datos de prueba guardados solo en este navegador
//            (localStorage). Sirve para probar sin Firebase.
//
// Estructura en Firestore (ver docs/firestore.rules):
//   acceso/{correo}  → { nombre, estudiante: "A" | "B" }  (lo creas a mano en la consola)
//   usuarios/{uid}   → perfil completo (lo crea la web la primera vez)
// =========================================================
import { fb } from "../firebase.js";

let modo = "firebase";
export function usarModoDemo() { modo = "demo"; }
export function esDemo() { return modo === "demo"; }

// Plantilla de un perfil nuevo
export function perfilNuevo({ uid, nombre, correo, rol, foto = null }) {
  return {
    uid, nombre, correo, rol, foto,
    creado: new Date().toISOString(),
    // Nivel estimado mientras no haya diagnóstico (Fase 4 lo calcula)
    nivelEstimado: rol === "A" ? "A2" : "A0",
    // null = todavía sin diagnóstico en esa habilidad
    niveles: { speaking: null, listening: null, vocabulario: null, gramatica: null, lectura: null, escritura: null },
    ajustes: { acento: "en-US", vozNombre: null, velocidadVoz: rol === "A" ? 1 : 0.85 },
    // Esquema 5 + 1 + 1. Días: 0 = domingo, 1 = lunes … 6 = sábado
    calendario: { completos: [1, 2, 3, 4, 5], ligero: 6, descanso: 0 },
    xp: 0,
    racha: { actual: 0, mejor: 0 },
  };
}

// ---------------------------------------------------------
// MODO FIREBASE
// ---------------------------------------------------------

// ¿Este correo está en la lista de acceso? Devuelve {nombre, rol} o null.
export async function verificarAcceso(usuario) {
  if (modo === "demo") return { nombre: "Demo", rol: "A" };
  const { db, fsMod } = fb;
  const correo = (usuario.email || "").toLowerCase();
  try {
    const snap = await fsMod.getDoc(fsMod.doc(db, "acceso", correo));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    // Las reglas niegan la lectura a correos que no son el propio → sin acceso
    console.warn("Sin acceso:", e.code || e);
    return null;
  }
}

// Carga el perfil; si es la primera vez, lo crea.
export async function cargarOCrearPerfil(usuario, acceso) {
  if (modo === "demo") return cargarDemo().yo;
  const { db, fsMod } = fb;
  const ref = fsMod.doc(db, "usuarios", usuario.uid);
  const snap = await fsMod.getDoc(ref);
  if (snap.exists()) return snap.data();

  const perfil = perfilNuevo({
    uid: usuario.uid,
    nombre: acceso.nombre || usuario.displayName || "Estudiante",
    correo: (usuario.email || "").toLowerCase(),
    // En la consola el campo se llama "estudiante" ("A" o "B"); "rol" se acepta por compatibilidad
    rol: String(acceso.estudiante ?? acceso.rol ?? "A").trim().toUpperCase() === "B" ? "B" : "A",
    foto: usuario.photoURL || null,
  });
  await fsMod.setDoc(ref, perfil);
  return perfil;
}

// Guarda cambios parciales del perfil (ej. { ajustes: {...} })
export async function actualizarPerfil(uid, cambios) {
  if (modo === "demo") {
    const d = cargarDemo();
    Object.assign(d.yo, cambios);
    guardarDemo(d);
    return;
  }
  const { db, fsMod } = fb;
  await fsMod.updateDoc(fsMod.doc(db, "usuarios", uid), cambios);
}

// El perfil del otro estudiante (o null si aún no ha entrado)
export async function cargarPareja(miUid) {
  if (modo === "demo") return cargarDemo().pareja;
  const { db, fsMod } = fb;
  const snap = await fsMod.getDocs(fsMod.collection(db, "usuarios"));
  const otro = snap.docs.map(d => d.data()).find(p => p.uid !== miUid);
  return otro || null;
}

// ---------------------------------------------------------
// MODO DEMO (solo en este navegador)
// ---------------------------------------------------------
const CLAVE_DEMO = "te-demo-v1";

// En demo eliges qué estudiante "eres" para ver ambas interfaces
export function iniciarDemo(rol) {
  const a = perfilNuevo({ uid: "demo-a", nombre: "Sebastián", correo: "demo-a@ejemplo.com", rol: "A" });
  const b = perfilNuevo({ uid: "demo-b", nombre: "Xiomara", correo: "demo-b@ejemplo.com", rol: "B" });
  const datos = rol === "B" ? { yo: b, pareja: a } : { yo: a, pareja: b };
  guardarDemo(datos);
  return datos.yo;
}

// Si ya había una demo abierta en este navegador, devuelve su rol ("A"/"B")
export function demoGuardada() {
  try { return JSON.parse(localStorage.getItem(CLAVE_DEMO))?.yo?.rol || null; } catch { return null; }
}

function cargarDemo() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_DEMO));
    if (d?.yo) return d;
  } catch { /* sin almacenamiento: seguimos con datos nuevos */ }
  const a = perfilNuevo({ uid: "demo-a", nombre: "Sebastián", correo: "demo-a@ejemplo.com", rol: "A" });
  const b = perfilNuevo({ uid: "demo-b", nombre: "Xiomara", correo: "demo-b@ejemplo.com", rol: "B" });
  return { yo: a, pareja: b };
}

function guardarDemo(d) {
  try { localStorage.setItem(CLAVE_DEMO, JSON.stringify(d)); } catch { /* ignorar */ }
}

export function salirDemo() {
  try { localStorage.removeItem(CLAVE_DEMO); } catch { /* ignorar */ }
}
