// =========================================================
// ARMADO DE LA SESIÓN DEL DÍA
// ---------------------------------------------------------
// Día completo (20 min):
//   1. warmup   — Repaso espaciado (tarjetas que tocan hoy)  3 min
//   2. leccion  — Lección del día (explicación + diálogo)    7 min
//   3. vocab    — Vocabulario y gramática en contexto         4 min
//   4. quiz     — Quiz rápido (+ preguntas de refuerzo)       3 min
//   5. speaking — Speaking challenge individual               3 min
// Bloques opcionales (+10 min c/u): shadowing profundo,
// reto en pareja (Fase 6), video largo (Fase 5).
//
// Día ligero (5–10 min): repaso espaciado + shadowing corto.
//
// Las debilidades detectadas eligen las preguntas de refuerzo,
// así la sesión prioriza lo que más te cuesta.
// Lógica pura: no lee ni guarda nada.
// =========================================================
import { pendientes } from "./srs.js";
import { debilidades } from "./debilidades.js";
import { leccionesDeRuta, delTipo, obtener } from "../datos/contenido.js";

const MAX_REPASO_COMPLETO = 12;
const MAX_REPASO_LIGERO = 20;
const PREGUNTAS_REFUERZO = 2;

// Siguiente lección sin terminar de la ruta del estudiante
export function siguienteLeccion(contenido, rol, completados) {
  return leccionesDeRuta(contenido, rol).find(l => !completados[l.id]) || null;
}

// Última lección terminada (para el shadowing del día ligero)
export function ultimaLeccion(contenido, rol, completados) {
  const hechas = leccionesDeRuta(contenido, rol).filter(l => completados[l.id]);
  return hechas[hechas.length - 1] || null;
}

// Frases para shadowing a partir de una lección
export function frasesDeLeccion(contenido, leccion, max = 6) {
  if (!leccion) return [];
  const sp = leccion.speaking ? obtener(contenido, leccion.speaking) : null;
  const frases = [...(sp?.frasesShadowing || []), ...(leccion.ejemplos || []).map(e => e.en)];
  return [...new Set(frases)].slice(0, max);
}

// Preguntas de refuerzo: de quizzes ya vistos, con etiquetas débiles
export function preguntasDeRefuerzo(contenido, rol, completados, resumenes, excluirQuiz, n, semilla, habilidadesExtra = []) {
  const debiles = debilidades(resumenes).map(d => d.etiqueta);
  if (!debiles.length && !habilidadesExtra.length) return [];
  const candidatas = [];
  for (const q of delTipo(contenido, "quiz", rol)) {
    if (q.id === excluirQuiz || !completados[q.id]) continue;
    (q.preguntas || []).forEach((p, i) => {
      const hab = p.habilidad || (p.formato === "escuchar" ? "listening" : q.habilidad);
      if (debiles.includes(p.etiquetaError) || habilidadesExtra.includes(hab)) candidatas.push({ ...p, quizId: q.id, idx: i, habilidad: hab, refuerzo: true });
    });
  }
  // Ordena por gravedad de la debilidad y mezcla de forma estable por fecha
  return mezclar(candidatas, semilla)
    // Primero las etiquetas débiles (en orden de gravedad), luego las de habilidades en refuerzo
    .sort((a, b) => orden(debiles, a.etiquetaError) - orden(debiles, b.etiquetaError))
    .slice(0, n);
}

// evaluacion: null | { mensual } → el quiz se sustituye por la evaluación semanal
// refuerzo:   null | { habilidades } → semana de refuerzo: más preguntas de repaso
export function armarSesion({ perfil, contenido, completados = {}, vocab = {}, resumenes = {}, hoy, tipo, evaluacion = null, refuerzo = null }) {
  const rol = perfil.rol;
  const debiles = debilidades(resumenes);

  if (tipo === "descanso") return { fecha: hoy, tipo, pasos: [], bloques: [], debilidades: debiles };

  if (tipo === "ligero") {
    const ultima = ultimaLeccion(contenido, rol, completados) || siguienteLeccion(contenido, rol, completados);
    return {
      fecha: hoy, tipo, debilidades: debiles,
      pasos: [
        { id: "warmup", min: 5, tarjetas: pendientes(vocab, hoy, MAX_REPASO_LIGERO).map(e => e.id) },
        { id: "shadowing", min: 4, clave: "ligero", frases: frasesDeLeccion(contenido, ultima, 3) },
      ],
      bloques: [],
    };
  }

  // Día completo
  const leccion = siguienteLeccion(contenido, rol, completados);
  const quiz = leccion?.quiz ? obtener(contenido, leccion.quiz) : null;
  const preguntasQuiz = (quiz?.preguntas || []).map((p, i) =>
    ({ ...p, quizId: quiz.id, idx: i, habilidad: p.habilidad || quiz.habilidad }));
  const nRefuerzo = refuerzo ? 5 : leccion ? PREGUNTAS_REFUERZO : 6;
  const preguntasRefuerzo = preguntasDeRefuerzo(contenido, rol, completados, resumenes, quiz?.id,
    nRefuerzo, hoy, refuerzo?.habilidades || []);

  const pasos = [
    { id: "warmup", min: 3, tarjetas: pendientes(vocab, hoy, MAX_REPASO_COMPLETO).map(e => e.id) },
  ];
  if (leccion) {
    pasos.push({ id: "leccion", min: 7, leccionId: leccion.id });
    pasos.push({ id: "vocab", min: 4, vocabIds: leccion.vocabulario || [] });
  }
  if (evaluacion) {
    pasos.push({ id: "evaluacion", min: evaluacion.mensual ? 13 : 8, mensual: !!evaluacion.mensual });
  } else if (preguntasQuiz.length || preguntasRefuerzo.length) {
    pasos.push({ id: "quiz", min: 3, quizId: quiz?.id || null, preguntas: [...preguntasQuiz, ...preguntasRefuerzo] });
  }
  if (leccion?.speaking) pasos.push({ id: "speaking", min: 3, speakingId: leccion.speaking });

  return {
    fecha: hoy, tipo, leccionId: leccion?.id || null, debilidades: debiles, pasos,
    refuerzo: refuerzo?.habilidades || null,
    bloques: [
      { id: "shadowing", min: 10, frases: frasesDeLeccion(contenido, leccion || ultimaLeccion(contenido, rol, completados), 8) },
      { id: "reto", min: 10, fase: 6 },
      { id: "video", min: 10, fase: 5 },
    ],
  };
}

const orden = (lista, x) => { const i = lista.indexOf(x); return i < 0 ? lista.length : i; };

// Mezcla estable: con la misma semilla (la fecha) da el mismo orden,
// así recargar la página no cambia las preguntas del día.
export function mezclar(lista, semilla = "") {
  let h = 2166136261;
  for (const c of String(semilla)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const azar = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
