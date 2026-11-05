// =========================================================
// REPETICIÓN ESPACIADA — SM-2 adaptado
// ---------------------------------------------------------
// SM-2 (SuperMemo 2, la base de Anki) le da a cada palabra:
//  - "facilidad" (empieza en 2.5): qué tan fácil es PARA TI.
//  - "intervalo": cuántos días esperar hasta el próximo repaso.
// Cada vez que repasas, el intervalo se multiplica por la
// facilidad: las palabras fáciles se espacian rápido y las
// difíciles vuelven seguido.
//
// Adaptaciones nuestras:
//  - 4 botones (Otra vez / Difícil / Bien / Fácil) en lugar de 0–5.
//  - 2.º intervalo de 3 días (SM-2 original usa 6), más amable
//    para principiantes.
//  - "Otra vez" la devuelve a la misma sesión.
//  - Palabra "dominada" cuando su intervalo llega a 21 días.
// Lógica pura: recibe un estado y devuelve el nuevo.
// =========================================================
import { sumarDias, fechaISO } from "./calendario.js";

export const FACILIDAD_INICIAL = 2.5;
export const FACILIDAD_MINIMA = 1.3;
export const DIAS_DOMINADA = 21;

export function estadoNuevo(id, hoy = fechaISO()) {
  return {
    id, intervalo: 0, facilidad: FACILIDAD_INICIAL, repeticiones: 0,
    proxima: hoy, ultima: null, aciertos: 0, fallos: 0, estado: "nuevo",
  };
}

// boton: "otra" | "dificil" | "bien" | "facil"
export function calificar(e, boton, hoy = fechaISO()) {
  const s = { ...e };
  let f = s.facilidad ?? FACILIDAD_INICIAL;
  const rep = s.repeticiones ?? 0;
  const ant = s.intervalo ?? 0;

  if (boton === "otra") {
    s.repeticiones = 0;
    s.intervalo = 0;              // vuelve hoy mismo
    f -= 0.2;
    s.fallos = (s.fallos || 0) + 1;
  } else {
    if (boton === "dificil") {
      s.intervalo = rep === 0 ? 1 : Math.max(ant + 1, Math.round(ant * 1.2));
      f -= 0.15;
    } else if (boton === "bien") {
      s.intervalo = rep === 0 ? 1 : rep === 1 ? 3 : Math.round(ant * f);
    } else if (boton === "facil") {
      s.intervalo = rep === 0 ? 3 : rep === 1 ? 5 : Math.round(ant * f * 1.3);
      f += 0.15;
    } else {
      throw new Error("Botón desconocido: " + boton);
    }
    s.intervalo = Math.max(1, s.intervalo);
    s.repeticiones = rep + 1;
    s.aciertos = (s.aciertos || 0) + 1;
  }

  s.facilidad = Math.round(Math.max(FACILIDAD_MINIMA, f) * 100) / 100;
  s.proxima = sumarDias(hoy, s.intervalo);
  s.ultima = hoy;
  s.estado = s.intervalo === 0 ? "aprendiendo"
           : s.intervalo >= DIAS_DOMINADA ? "dominada"
           : "repaso";
  return s;
}

// Tarjetas que tocan hoy (o atrasadas), las más atrasadas primero
export function pendientes(estados, hoy = fechaISO(), limite = Infinity) {
  return Object.values(estados)
    .filter(e => e.proxima <= hoy)
    .sort((a, b) => a.proxima.localeCompare(b.proxima) || (a.facilidad - b.facilidad))
    .slice(0, limite);
}

// Resumen para estadísticas e insignias
export function resumen(estados) {
  const r = { total: 0, nuevo: 0, aprendiendo: 0, repaso: 0, dominada: 0 };
  for (const e of Object.values(estados)) { r.total++; r[e.estado] = (r[e.estado] || 0) + 1; }
  return r;
}

// Tiempo hasta el próximo repaso, en texto corto (para los botones)
export function previsualizar(e, hoy = fechaISO()) {
  const salida = {};
  for (const b of ["otra", "dificil", "bien", "facil"]) {
    const d = calificar(e, b, hoy).intervalo;
    salida[b] = d === 0 ? "<1d" : d < 30 ? `${d}d` : `${Math.round(d / 30)}m`;
  }
  return salida;
}
