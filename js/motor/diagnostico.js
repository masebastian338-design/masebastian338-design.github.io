// =========================================================
// DIAGNÓSTICO ADAPTATIVO
// ---------------------------------------------------------
// Por cada habilidad (vocabulario, gramática, lectura, listening):
//  - Empieza en A1. Hay hasta 3 preguntas por nivel.
//  - 2 aciertos en un nivel → nivel aprobado → sube al siguiente.
//  - 2 fallos en un nivel → se detiene esa habilidad (así no
//    sufres con preguntas demasiado difíciles).
//  - Resultado: último nivel aprobado + subnivel según cuántas
//    acertaste en el nivel donde te detuviste:
//      0 aciertos → X.1 · 1 acierto → X.2
//    Ej.: apruebas A1 y A2, en B1 aciertas 1 → A2.2.
//    Si apruebas hasta C1 → C1.3 (el diagnóstico llega a C1).
//    Si no apruebas A1 → A0.
// Lógica pura: el estado es un objeto simple que se puede guardar.
// =========================================================

export const HABILIDADES_DIAG = ["vocabulario", "gramatica", "lectura", "listening"];
export const NIVELES_DIAG = ["A1", "A2", "B1", "B2", "C1"];

export function estadoInicial(habilidades = HABILIDADES_DIAG) {
  return {
    habilidades, h: 0,           // habilidad actual (índice)
    n: 0,                        // nivel actual (índice en NIVELES_DIAG)
    aciertos: 0, fallos: 0,      // en el nivel actual
    usadas: [],                  // ids de preguntas ya mostradas
    aprobados: {},               // { vocabulario: ["A1","A2"] }
    parcial: {},                 // { vocabulario: 1 } aciertos donde se detuvo
    respuestas: [],              // historial [{ id, habilidad, nivel, correcto }]
    terminado: false,
  };
}

// Siguiente pregunta del banco para el estado actual (o null si terminó)
export function siguientePregunta(estado, banco) {
  if (estado.terminado) return null;
  const hab = estado.habilidades[estado.h];
  const nivel = NIVELES_DIAG[estado.n];
  return banco.find(p => p.habilidad === hab && p.nivel === nivel && !estado.usadas.includes(p.id)) || null;
}

// Registra una respuesta y avanza. Devuelve un estado NUEVO.
export function responder(estado, pregunta, correcto, banco) {
  const s = structuredClone(estado);
  const hab = s.habilidades[s.h];
  s.usadas.push(pregunta.id);
  s.respuestas.push({ id: pregunta.id, habilidad: hab, nivel: pregunta.nivel, correcto });
  if (correcto) s.aciertos++; else s.fallos++;

  const quedan = banco.some(p => p.habilidad === hab && p.nivel === NIVELES_DIAG[s.n] && !s.usadas.includes(p.id));

  if (s.aciertos >= 2 || (!quedan && s.aciertos > s.fallos)) {
    // Nivel aprobado
    (s.aprobados[hab] ||= []).push(NIVELES_DIAG[s.n]);
    if (s.n + 1 < NIVELES_DIAG.length) { s.n++; s.aciertos = 0; s.fallos = 0; }
    else { s.parcial[hab] = null; return pasarHabilidad(s); }
  } else if (s.fallos >= 2 || !quedan) {
    // Se detiene esta habilidad
    s.parcial[hab] = s.aciertos;
    return pasarHabilidad(s);
  }
  return s;
}

function pasarHabilidad(s) {
  s.h++; s.n = 0; s.aciertos = 0; s.fallos = 0;
  if (s.h >= s.habilidades.length) s.terminado = true;
  return s;
}

// Nivel resultante de cada habilidad → { vocabulario: "A2.2", ... }
export function resultado(estado) {
  const salida = {};
  for (const hab of estado.habilidades) {
    if (!estado.respuestas.some(r => r.habilidad === hab)) continue;   // no se llegó a evaluar
    const aprob = estado.aprobados[hab] || [];
    if (!aprob.length) { salida[hab] = "A0"; continue; }
    const ultimo = aprob[aprob.length - 1];
    const parcial = estado.parcial[hab];
    if (parcial == null) { salida[hab] = `${ultimo}.3`; continue; }  // aprobó todo
    salida[hab] = `${ultimo}.${Math.min(2, parcial) + 1}`;
  }
  return salida;
}

// Progreso aproximado (0 a 1) para la barra
export function progreso(estado) {
  if (estado.terminado) return 1;
  return (estado.h + estado.n / NIVELES_DIAG.length) / estado.habilidades.length;
}
