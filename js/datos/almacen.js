// =========================================================
// ALMACÉN — una sola forma de leer y guardar datos
// ---------------------------------------------------------
// El resto de la web NO habla directo con Firestore: usa estas
// funciones. Así el mismo código funciona en:
//  - modo real: Firestore (sincroniza entre dispositivos)
//  - modo demo: localStorage (solo este navegador)
//
// Las rutas son como en Firestore, separadas por "/":
//   "usuarios/abc123"                    → un documento
//   "usuarios/abc123/vocabulario"        → una colección
// =========================================================
import { fb } from "../firebase.js";
import { esDemo } from "./perfiles.js";

// ---------- Modo demo: todo en un objeto guardado en localStorage ----------
const CLAVE = "te-demo-datos-v1";
function memoria() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { return {}; }
}
function guardarMemoria(m) {
  try { localStorage.setItem(CLAVE, JSON.stringify(m)); } catch { /* sin espacio: ignorar */ }
}
export function borrarDatosDemo() {
  try { localStorage.removeItem(CLAVE); } catch { /* ignorar */ }
}

// ---------- Funciones públicas ----------

// Lee un documento. Devuelve el objeto o null si no existe.
export async function leer(ruta) {
  if (esDemo()) return structuredClone(memoria()[ruta] ?? null);
  const { db, fsMod } = fb;
  const snap = await fsMod.getDoc(fsMod.doc(db, ruta));
  return snap.exists() ? snap.data() : null;
}

// Guarda un documento. Con fusionar=true solo cambia los campos dados.
export async function guardar(ruta, datos, fusionar = true) {
  if (esDemo()) {
    const m = memoria();
    m[ruta] = fusionar ? fusionProfunda(m[ruta] || {}, datos) : datos;
    guardarMemoria(m);
    return;
  }
  const { db, fsMod } = fb;
  await fsMod.setDoc(fsMod.doc(db, ruta), datos, { merge: fusionar });
}

// Suma n a un campo numérico (ej. segundos de estudio) sin leer antes.
export async function sumar(ruta, campo, n) {
  if (esDemo()) {
    const m = memoria();
    m[ruta] = m[ruta] || {};
    m[ruta][campo] = (Number(m[ruta][campo]) || 0) + n;
    guardarMemoria(m);
    return;
  }
  const { db, fsMod } = fb;
  await fsMod.setDoc(fsMod.doc(db, ruta), { [campo]: fsMod.increment(n) }, { merge: true });
}

// Lista todos los documentos de una colección → { id: datos }
export async function listar(rutaColeccion) {
  if (esDemo()) {
    const m = memoria();
    const prefijo = rutaColeccion + "/";
    const salida = {};
    for (const [ruta, datos] of Object.entries(m)) {
      // Solo hijos directos (no sub-subcolecciones)
      if (ruta.startsWith(prefijo) && !ruta.slice(prefijo.length).includes("/")) {
        salida[ruta.slice(prefijo.length)] = structuredClone(datos);
      }
    }
    return salida;
  }
  const { db, fsMod } = fb;
  const snap = await fsMod.getDocs(fsMod.collection(db, rutaColeccion));
  const salida = {};
  snap.forEach(d => { salida[d.id] = d.data(); });
  return salida;
}

// Guarda varios documentos de una vez (más rápido y atómico)
export async function guardarVarios(lista /* [{ruta, datos}] */) {
  if (!lista.length) return;
  if (esDemo()) {
    const m = memoria();
    for (const { ruta, datos } of lista) m[ruta] = fusionProfunda(m[ruta] || {}, datos);
    guardarMemoria(m);
    return;
  }
  const { db, fsMod } = fb;
  // Firestore permite hasta 500 operaciones por lote
  for (let i = 0; i < lista.length; i += 450) {
    const lote = fsMod.writeBatch(db);
    for (const { ruta, datos } of lista.slice(i, i + 450)) {
      lote.set(fsMod.doc(db, ruta), datos, { merge: true });
    }
    await lote.commit();
  }
}

// Une objetos anidados (como hace Firestore con merge: true)
function fusionProfunda(base, extra) {
  const r = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    r[k] = (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k]))
      ? fusionProfunda(base[k], v)
      : v;
  }
  return r;
}
