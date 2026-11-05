// =========================================================
// CONTENIDO — carga lecciones, vocabulario, quizzes, etc.
// ---------------------------------------------------------
// Dos fuentes que se juntan:
//  1. Archivos JSON en /contenido (listados en contenido/indice.json).
//  2. Paquetes importados desde la web (Firestore "contenido"), Fase 5.
// Si un id se repite, gana el importado (permite corregir contenido).
//
// Formato de un paquete:
//   { "esquema": 1, "paquete": "…", "descripcion": "…", "elementos": [ … ] }
// Tipos de elemento: leccion · vocabulario · quiz · speaking · reto · recurso
// (documentación completa en docs/ESQUEMA-CONTENIDO.md, Fase 5)
// =========================================================
import { listar } from "./almacen.js";

let cache = null;

export async function cargarContenido({ forzar = false } = {}) {
  if (cache && !forzar) return cache;
  const elementos = new Map();

  // 1. Archivos base
  try {
    const indice = await (await fetch("contenido/indice.json")).json();
    const paquetes = await Promise.all(indice.archivos.map(async a => {
      try { return await (await fetch("contenido/" + a)).json(); }
      catch (e) { console.warn("No se pudo cargar", a, e); return null; }
    }));
    for (const p of paquetes) for (const el of p?.elementos || []) elementos.set(el.id, el);
  } catch (e) {
    console.warn("Sin índice de contenido:", e);
  }

  // 2. Paquetes importados (si existen)
  try {
    const importados = await listar("contenido");
    for (const p of Object.values(importados)) for (const el of p?.elementos || []) elementos.set(el.id, el);
  } catch (e) {
    console.warn("Sin contenido importado:", e.code || e);
  }

  let temas = [];
  try { temas = await (await fetch("contenido/temas.json")).json(); } catch { /* opcional */ }

  cache = { elementos, temas };
  return cache;
}

// ---------- Ayudantes de consulta ----------

export function obtener(contenido, id) { return contenido.elementos.get(id) || null; }

// ¿Este elemento es para la ruta del estudiante?
export function esDeRuta(el, rol) { return el.ruta === rol || el.ruta === "ambos"; }

export function delTipo(contenido, tipo, rol) {
  return [...contenido.elementos.values()].filter(el => el.tipo === tipo && (!rol || esDeRuta(el, rol)));
}

// Lecciones de una ruta en orden (semana, luego orden)
export function leccionesDeRuta(contenido, rol) {
  return delTipo(contenido, "leccion", rol)
    .sort((a, b) => (a.semana ?? 99) - (b.semana ?? 99) || (a.orden ?? 99) - (b.orden ?? 99));
}

export function tema(contenido, id) {
  return contenido.temas.find(t => t.id === id) || { id, nombre: id, nombreES: id, icono: "📘" };
}
