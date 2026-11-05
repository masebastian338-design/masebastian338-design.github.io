// =========================================================
// GRABACIONES DE VOZ — se guardan SOLO en este dispositivo
// ---------------------------------------------------------
// Usamos IndexedDB (una base de datos del navegador que acepta
// archivos de audio). Nada se sube a internet.
// Guardamos como máximo 3 grabaciones por frase/actividad y
// 200 en total, para no llenar el celular.
// =========================================================

const BD = "together-grabaciones";
const TABLA = "audios";
const MAX_POR_CLAVE = 3;
const MAX_TOTAL = 200;

function abrir() {
  return new Promise((resolve, reject) => {
    const pet = indexedDB.open(BD, 1);
    pet.onupgradeneeded = () => {
      const t = pet.result.createObjectStore(TABLA, { keyPath: "id", autoIncrement: true });
      t.createIndex("clave", "clave");
    };
    pet.onsuccess = () => resolve(pet.result);
    pet.onerror = () => reject(pet.error);
  });
}

function enTransaccion(modo, fn) {
  return abrir().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(TABLA, modo);
    const resultado = fn(tx.objectStore(TABLA));
    tx.oncomplete = () => resolve(resultado?.result ?? resultado);
    tx.onerror = () => reject(tx.error);
  }));
}

// Guarda un audio. clave = id de la frase o actividad.
export async function guardarGrabacion(clave, blob) {
  await enTransaccion("readwrite", t => t.add({ clave, blob, tipo: blob.type, fecha: new Date().toISOString() }));
  // Limpieza: deja solo las más recientes
  const deClave = await grabacionesDe(clave);
  for (const g of deClave.slice(MAX_POR_CLAVE)) await borrar(g.id);
  const todas = await enTransaccion("readonly", t => t.getAll());
  todas.sort((a, b) => b.fecha.localeCompare(a.fecha));
  for (const g of todas.slice(MAX_TOTAL)) await borrar(g.id);
}

// Grabaciones de una clave, la más reciente primero
export async function grabacionesDe(clave) {
  const lista = await enTransaccion("readonly", t => t.index("clave").getAll(clave));
  return (lista || []).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function borrar(id) {
  return enTransaccion("readwrite", t => t.delete(id));
}
