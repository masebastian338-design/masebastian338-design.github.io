// =========================================================
// DATOS DE EVALUACIÓN — diagnóstico, speaking, evaluaciones
// semanales/mensuales y reportes de evolución.
// ---------------------------------------------------------
// Rutas (dentro de usuarios/{uid}):
//   evaluaciones/{lunes AAAA-MM-DD} → una por semana
//   reportes/{semanaPrograma}       → reporte cada 4 semanas
//   resultados/{auto}               → historial detallado
// Y en el perfil: niveles, nivelGeneral, progresoNivel, refuerzo,
// diagnostico, ultimoSpeaking, erroresSpeaking.
// =========================================================
import { leer, guardar, listar } from "./almacen.js";
import { actualizarPerfil } from "./perfiles.js";
import * as prog from "./progreso.js";
import { nivelPonderado, aplicarEvaluacion } from "../motor/niveles.js";
import { fechaISO, lunesDe, sumarDias } from "../motor/calendario.js";
import { semanaPrograma } from "../motor/evaluacion.js";
import { debilidades } from "../motor/debilidades.js";
import { resumen } from "../motor/srs.js";

const base = uid => `usuarios/${uid}`;
export const inicioPrograma = perfil => perfil.creado ? fechaISO(new Date(perfil.creado)) : fechaISO();
export const semanaActual = perfil => semanaPrograma(inicioPrograma(perfil));

// ---------- Diagnóstico inicial ----------
export async function guardarDiagnostico(perfil, resultados, respuestas) {
  const niveles = { ...(perfil.niveles || {}), ...resultados };
  const nivelGeneral = nivelPonderado(niveles);
  const diagnostico = { fecha: fechaISO(), resultados };
  await actualizarPerfil(perfil.uid, { niveles, nivelGeneral, diagnostico });
  await prog.guardarResultado(perfil.uid, { tipo: "diagnostico", resultados, respuestas: respuestas.length });
  Object.assign(perfil, { niveles, nivelGeneral, diagnostico });
}

// ---------- Speaking (Claude o rúbrica) ----------
// r = { nivel, fluidez, pronunciacion, aprueba, errores[], fortalezas[], recomendaciones[], fuente, evaluador, tipo }
export async function guardarSpeaking(perfil, r) {
  const niveles = { ...(perfil.niveles || {}), speaking: r.nivel };
  const nivelGeneral = nivelPonderado(niveles);
  const ultimoSpeaking = { ...r, fecha: fechaISO() };
  // Los errores de speaking se guardan para los próximos prompts (Fase 5)
  const erroresSpeaking = [...new Set([...(r.errores || []), ...(perfil.erroresSpeaking || [])])].slice(0, 10);
  await actualizarPerfil(perfil.uid, { niveles, nivelGeneral, ultimoSpeaking, erroresSpeaking });
  await prog.guardarResultado(perfil.uid, { tipo: "speaking-" + r.fuente, ...r });
  Object.assign(perfil, { niveles, nivelGeneral, ultimoSpeaking, erroresSpeaking });
}

// ---------- Evaluación semanal ----------
export const evaluaciones = uid => listar(`${base(uid)}/evaluaciones`);
export const evaluacionDeSemana = (uid, hoy = fechaISO()) => leer(`${base(uid)}/evaluaciones/${lunesDe(hoy)}`);

// Guarda la evaluación, aplica las reglas de niveles y el modo refuerzo
export async function guardarEvaluacion(perfil, { puntajes, mensual, speakingNivel, detalle }) {
  const hoy = fechaISO();
  const lunes = lunesDe(hoy);
  const nivelesAntes = { ...(perfil.niveles || {}) };
  const r = aplicarEvaluacion(perfil, puntajes, { mensual, speakingNivel });
  const cambiosPerfil = {
    niveles: r.niveles,
    nivelGeneral: nivelPonderado(r.niveles),
    progresoNivel: r.progresoNivel,
  };
  // Modo refuerzo: TODA la semana siguiente (de lunes a domingo)
  if (r.refuerzo.length) {
    const desde = sumarDias(lunes, 7);
    cambiosPerfil.refuerzo = { desde, hasta: sumarDias(desde, 6), habilidades: r.refuerzo };
  }
  await actualizarPerfil(perfil.uid, cambiosPerfil);
  Object.assign(perfil, cambiosPerfil);

  const semana = semanaActual(perfil);
  const doc = { fecha: hoy, lunes, semana, mensual: !!mensual, puntajes, cambios: r.cambios, refuerzo: r.refuerzo,
                nivelesAntes, nivelesDespues: r.niveles, speakingNivel: speakingNivel || null, ...detalle };
  await guardar(`${base(perfil.uid)}/evaluaciones/${lunes}`, doc, false);
  if (mensual) await generarReporte(perfil, semana);
  return doc;
}

// ¿Está activo el modo refuerzo hoy?
export function refuerzoActivo(perfil, hoy = fechaISO()) {
  const rf = perfil.refuerzo;
  return rf && rf.desde <= hoy && hoy <= rf.hasta ? rf : null;
}

// ---------- Reporte de evolución (cada 4 semanas) ----------
export const reportes = uid => listar(`${base(uid)}/reportes`);

export async function generarReporte(perfil, semana = semanaActual(perfil)) {
  const uid = perfil.uid;
  const bloque = Math.max(1, Math.floor((semana - 1) / 4) * 4 + 1);   // 1, 5, 9…
  const inicio = sumarDias(lunesDe(inicioPrograma(perfil)), (bloque - 1) * 7);
  const fin = sumarDias(inicio, 27);

  const [dias, evals, vocab, errores] = await Promise.all([
    prog.dias(uid), evaluaciones(uid), prog.vocabulario(uid), prog.errores(uid),
  ]);
  const diasPeriodo = Object.entries(dias).filter(([f]) => f >= inicio && f <= fin);
  const evalsPeriodo = Object.values(evals).filter(e => e.lunes >= inicio && e.lunes <= fin).sort((a, b) => a.lunes.localeCompare(b.lunes));
  const primera = evalsPeriodo[0];

  const reporte = {
    semana, bloque, inicio, fin, creado: new Date().toISOString(),
    nivelesAntes: primera?.nivelesAntes || perfil.diagnostico?.resultados || {},
    nivelesAhora: { ...(perfil.niveles || {}) },
    nivelGeneral: perfil.nivelGeneral || null,
    minutos: Math.round(diasPeriodo.reduce((s, [, d]) => s + (d.segundos || 0), 0) / 60),
    sesiones: diasPeriodo.filter(([, d]) => d.completado).length,
    vocab: resumen(vocab),
    evaluaciones: evalsPeriodo.map(e => ({ lunes: e.lunes, puntajes: e.puntajes, mensual: e.mensual })),
    debilidades: debilidades(errores, 5).map(d => ({ etiqueta: d.etiqueta, tasa: Math.round(d.tasa * 100) })),
    speaking: perfil.ultimoSpeaking || null,
    racha: perfil.racha || null,
  };
  await guardar(`${base(uid)}/reportes/${String(bloque + 3).padStart(3, "0")}`, reporte, false);
  return reporte;
}
