// =========================================================
// EVALUACIÓN SEMANAL (8 min)
// ---------------------------------------------------------
// Sustituye al quiz del 5.º día completo de la semana.
// Mezcla ~70 % de la semana actual y ~30 % de semanas anteriores:
//  - Gramática y listening: preguntas de los quizzes de las lecciones.
//  - Vocabulario: preguntas generadas con tus palabras ("¿qué significa…?").
//  - Listening extra: "¿qué frase escuchaste?" con los ejemplos.
//  - Speaking: una pregunta en voz alta + rúbrica breve (se agrega en la UI).
// Cada 4.ª semana es "mensual": añade 5 min de conversación con
// Claude (fuera de la web) y solo ahí se puede subir de nivel MCER.
// Lógica pura.
// =========================================================
import { mezclar } from "./sesion.js";
import { lunesDe, diasEntre, fechaISO } from "./calendario.js";
import { obtener, leccionesDeRuta } from "../datos/contenido.js";

export const OBJETIVO = { gramatica: 5, listening: 3, vocabulario: 4, listeningFrase: 2 };

// Semana del programa (1, 2, 3 …) contada desde que se creó la cuenta
export function semanaPrograma(inicioISO, hoy = fechaISO()) {
  if (!inicioISO) return 1;
  return Math.floor(diasEntre(lunesDe(inicioISO), lunesDe(hoy)) / 7) + 1;
}
export const esSemanaMensual = n => n > 0 && n % 4 === 0;

// Habilidad de una pregunta de quiz
export function habilidadDe(p, quiz) {
  if (p.habilidad) return p.habilidad;
  if (p.formato === "escuchar") return "listening";
  return quiz?.habilidad || "gramatica";
}

// Lecciones de la semana actual y de semanas anteriores
export function leccionesPorPeriodo(contenido, rol, completados, hoy, leccionHoy = null) {
  const lunes = lunesDe(hoy);
  const todas = leccionesDeRuta(contenido, rol);
  const estaSemana = todas.filter(l => (completados[l.id]?.fecha >= lunes) || l.id === leccionHoy);
  const anteriores = todas.filter(l => completados[l.id] && completados[l.id].fecha < lunes);
  return { estaSemana, anteriores };
}

// Toma n elementos: ~70 % de "actual" y el resto de "previo"
function repartir(actual, previo, n, semilla) {
  const deAntes = previo.length ? Math.max(1, Math.round(n * 0.3)) : 0;
  const a = mezclar(actual, semilla).slice(0, n - Math.min(deAntes, previo.length));
  const b = mezclar(previo, semilla + "b").slice(0, n - a.length);
  return [...a, ...b];
}

export function armarEvaluacion({ contenido, rol, completados, hoy, leccionHoy = null, semilla = hoy }) {
  const { estaSemana, anteriores } = leccionesPorPeriodo(contenido, rol, completados, hoy, leccionHoy);
  // Si esta semana no hubo lecciones, se evalúa con las anteriores
  const actuales = estaSemana.length ? estaSemana : anteriores;
  const previas = estaSemana.length ? anteriores : [];

  const preguntasDe = ls => ls.flatMap(l => {
    const q = l.quiz ? obtener(contenido, l.quiz) : null;
    return (q?.preguntas || []).map((p, i) => ({ ...p, quizId: q.id, idx: i, habilidad: habilidadDe(p, q) }));
  });
  const pa = preguntasDe(actuales), pp = preguntasDe(previas);
  const gram = repartir(pa.filter(p => p.habilidad !== "listening"), pp.filter(p => p.habilidad !== "listening"), OBJETIVO.gramatica, semilla)
    .map(p => ({ ...p, habilidad: p.habilidad === "vocabulario" ? "vocabulario" : "gramatica" }));
  const list = repartir(pa.filter(p => p.habilidad === "listening"), pp.filter(p => p.habilidad === "listening"), OBJETIVO.listening, semilla);

  // Vocabulario generado: palabra → elige su significado
  const vocabDe = ls => ls.flatMap(l => (l.vocabulario || []).map(id => obtener(contenido, id)).filter(Boolean));
  const va = vocabDe(actuales), vp = vocabDe(previas);
  const todasPalabras = [...va, ...vp];
  const vocab = repartir(va, vp, OBJETIVO.vocabulario, semilla).map(v => {
    const distractores = mezclar(todasPalabras.filter(x => x.id !== v.id && x.traduccion !== v.traduccion), semilla + v.id)
      .slice(0, 3).map(x => x.traduccion);
    return {
      formato: "opcion", habilidad: "vocabulario", generada: true, vocabId: v.id,
      enunciado: `What does "${v.palabra}" mean?`, enunciadoES: `¿Qué significa «${v.palabra}»?`,
      opciones: mezclar([v.traduccion, ...distractores], semilla + v.id + "o"), respuesta: v.traduccion,
      explicacion: `${v.palabra} = ${v.traduccion}`, explicacionES: `«${v.palabra}» = ${v.traduccion}`,
      etiquetaError: "vocab-evaluacion",
    };
  });

  // Listening generado: ¿qué frase escuchaste?
  const frasesDe = ls => ls.flatMap(l => (l.ejemplos || []).map(e => e.en));
  const fa = frasesDe(actuales), fp = frasesDe(previas);
  const todasFrases = [...fa, ...fp];
  const listFrase = repartir(fa, fp, OBJETIVO.listeningFrase, semilla + "f").map(f => ({
    formato: "escuchar", habilidad: "listening", generada: true, audioTexto: f,
    enunciado: "Listen. Which sentence did you hear?", enunciadoES: "Escucha. ¿Qué frase escuchaste?",
    opciones: mezclar([f, ...mezclar(todasFrases.filter(x => x !== f), semilla + f).slice(0, 2)], semilla + f + "o"),
    respuesta: f, explicacion: `You heard: "${f}"`, explicacionES: `Escuchaste: «${f}»`, etiquetaError: "listening-frases",
  }));

  // Orden: alternar habilidades para que no sea monótono
  const preguntas = mezclar([...gram, ...list, ...vocab, ...listFrase], semilla + "orden");

  // Pregunta de speaking: de los retos de esta semana
  const sps = actuales.map(l => l.speaking && obtener(contenido, l.speaking)).filter(Boolean);
  const sp = mezclar(sps, semilla)[0] || null;
  const speaking = sp ? { speakingId: sp.id, pregunta: mezclar(sp.preguntas || [], semilla)[0], expresiones: sp.expresionesObjetivo || [] } : null;

  return { preguntas, speaking };
}

// Puntaje por habilidad a partir de los resultados → { gramatica: 0.8, ... }
export function puntajes(resultados, speakingRubrica = null) {
  const cuenta = {};
  for (const r of resultados) {
    const h = r.p.habilidad;
    cuenta[h] = cuenta[h] || { bien: 0, total: 0 };
    cuenta[h].total++;
    if (r.correcto) cuenta[h].bien++;
  }
  const salida = {};
  for (const [h, c] of Object.entries(cuenta)) salida[h] = c.total ? c.bien / c.total : null;
  if (speakingRubrica) salida.speaking = puntajeSpeaking(speakingRubrica);
  return salida;
}

// ---------------------------------------------------------
// Lee el bloque de resultados que entrega Claude:
//   NIVEL: A2.2
//   FLUIDEZ: 3
//   PRONUNCIACION: 4/5
//   APRUEBA NIVEL ACTUAL: SÍ
//   ERRORES FRECUENTES: a; b; c
//   FORTALEZAS: …   RECOMENDACIONES: …
// Tolera mayúsculas/minúsculas, acentos, asteriscos y "x/5".
// ---------------------------------------------------------
export function leerResultadoClaude(texto) {
  const limpio = String(texto || "").replace(/\*\*/g, "").replace(/\r/g, "");
  const sinAcentos = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const campos = {};
  let actual = null;
  for (const linea of limpio.split("\n")) {
    const m = linea.match(/^\s*[-•]?\s*([A-Za-zÁÉÍÓÚáéíóúÑñ ]{4,30}):\s*(.*)$/);
    if (m) { actual = sinAcentos(m[1].trim()); campos[actual] = m[2].trim(); }
    else if (actual && linea.trim()) campos[actual] += " " + linea.trim();
  }
  const lista = v => (v || "").split(/;|\n/).map(s => s.replace(/^\s*[-•\d.)]+\s*/, "").trim()).filter(Boolean);
  const numero = v => { const n = parseInt(String(v || "").match(/\d/)?.[0], 10); return n >= 1 && n <= 5 ? n : null; };
  const nivelM = String(campos["NIVEL"] || "").toUpperCase().match(/\b([ABC][12])(?:\.([123]))?/);
  const aprueba = campos["APRUEBA NIVEL ACTUAL"];
  return {
    nivel: nivelM ? `${nivelM[1]}.${nivelM[2] || "1"}` : (/A0/i.test(campos["NIVEL"] || "") ? "A0" : null),
    fluidez: numero(campos["FLUIDEZ"]),
    pronunciacion: numero(campos["PRONUNCIACION"]),
    aprueba: aprueba == null ? null : /^\s*S/i.test(sinAcentos(aprueba)),
    errores: lista(campos["ERRORES FRECUENTES"]),
    fortalezas: lista(campos["FORTALEZAS"]),
    recomendaciones: lista(campos["RECOMENDACIONES"]),
  };
}

// Rúbrica de speaking → 0 a 1: fluidez 50 %, responder 25 %, expresiones 25 %
export function puntajeSpeaking(r) {
  const fluidez = r.fluidez === 3 ? 1 : r.fluidez === 2 ? 0.6 : 0.2;
  const expr = r.expresionesTotal ? r.expresionesUsadas.length / r.expresionesTotal : 1;
  return Math.round((fluidez * 0.5 + (r.respondio ? 0.25 : 0) + expr * 0.25) * 100) / 100;
}
