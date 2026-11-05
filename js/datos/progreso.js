// =========================================================
// PROGRESO — guarda y lee el avance de cada estudiante
// ---------------------------------------------------------
// Rutas en Firestore (todas dentro de usuarios/{uid}):
//   vocabulario/{idPalabra}  → estado de repetición espaciada (SM-2)
//   errores/{etiqueta}       → resumen de aciertos/fallos (debilidades)
//   dias/{AAAA-MM-DD}        → lo hecho ese día y segundos de estudio
//   completados/{idElemento} → lecciones, quizzes, speaking terminados
//   resultados/{auto}        → detalle de cada quiz/evaluación
// =========================================================
import { leer, guardar, sumar, listar, guardarVarios } from "./almacen.js";
import { fechaISO } from "../motor/calendario.js";
import { calcularRacha, mejorRacha } from "../motor/racha.js";
import { registrar } from "../motor/debilidades.js";
import { actualizarPerfil } from "./perfiles.js";

const base = uid => `usuarios/${uid}`;

// ---------- Vocabulario (SRS) ----------
export const vocabulario = uid => listar(`${base(uid)}/vocabulario`);
export const guardarTarjeta = (uid, estado) => guardar(`${base(uid)}/vocabulario/${estado.id}`, estado, false);
export const guardarTarjetas = (uid, estados) =>
  guardarVarios(estados.map(e => ({ ruta: `${base(uid)}/vocabulario/${e.id}`, datos: e })));

// ---------- Errores y debilidades ----------
export const errores = uid => listar(`${base(uid)}/errores`);

// respuestas = [{ etiqueta, habilidad, correcto }]
export async function registrarRespuestas(uid, respuestas) {
  const actuales = await errores(uid);
  const cambiados = registrar(actuales, respuestas, fechaISO());
  await guardarVarios(Object.entries(cambiados).map(([etq, datos]) =>
    ({ ruta: `${base(uid)}/errores/${idSeguro(etq)}`, datos })));
  return { ...actuales, ...cambiados };
}

// ---------- Días y tiempo de estudio ----------
export const dias = uid => listar(`${base(uid)}/dias`);
export const dia = (uid, fecha = fechaISO()) => leer(`${base(uid)}/dias/${fecha}`);

// Suma segundos de estudio reales al día de hoy
export const sumarSegundos = (uid, seg, fecha = fechaISO()) =>
  seg > 0 ? sumar(`${base(uid)}/dias/${fecha}`, "segundos", Math.round(seg)) : Promise.resolve();

// Marca pasos/actividades del día. cambios = { pasos: {warmup: true}, completado: true, ... }
export const marcarDia = (uid, cambios, fecha = fechaISO()) =>
  guardar(`${base(uid)}/dias/${fecha}`, { fecha, ...cambios });

// Recalcula la racha y la guarda en el perfil (para que la pareja la vea)
export async function actualizarRacha(perfil) {
  const historial = await dias(perfil.uid);
  const inicio = perfil.creado ? fechaISO(new Date(perfil.creado)) : null;
  const r = calcularRacha(historial, perfil.calendario, fechaISO(), inicio);
  const mejor = Math.max(perfil.racha?.mejor || 0, mejorRacha(historial, perfil.calendario, fechaISO(), inicio));
  const racha = { actual: r.actual, mejor, comodinDisponible: r.comodinDisponible };
  perfil.racha = racha;
  await actualizarPerfil(perfil.uid, { racha });
  return { ...r, mejor };
}

// ---------- Elementos completados ----------
export const completados = uid => listar(`${base(uid)}/completados`);
export const marcarCompletado = (uid, id, datos = {}) =>
  guardar(`${base(uid)}/completados/${idSeguro(id)}`, { id, fecha: fechaISO(), ...datos });

// ---------- Resultados detallados ----------
export function guardarResultado(uid, resultado) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return guardar(`${base(uid)}/resultados/${id}`, { fecha: fechaISO(), creado: new Date().toISOString(), ...resultado }, false);
}

// Los ids de documento no pueden tener "/"
function idSeguro(texto) { return String(texto).replaceAll("/", "_"); }
