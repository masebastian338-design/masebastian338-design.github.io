// =========================================================
// RACHA FLEXIBLE
// ---------------------------------------------------------
// Reglas del plan:
//  - Cuenta cada día que estudiaste (sesión completa o ligera).
//  - El día de descanso NO rompe la racha (ni suma).
//  - 1 comodín al mes: si faltas un día de estudio, el comodín
//    lo cubre automáticamente (solo uno por mes calendario).
//  - Hoy todavía no rompe la racha: tienes hasta medianoche.
//
// Se CALCULA a partir del historial (no se guarda un contador
// que se pueda desincronizar). Lógica pura.
//
// dias = { "AAAA-MM-DD": { completado: true, ... } }
// =========================================================
import { tipoDeDia, sumarDias, fechaISO } from "./calendario.js";

export function calcularRacha(dias, calendario, hoy = fechaISO(), inicio = null) {
  const estudio = f => dias[f]?.completado === true;
  let actual = 0;
  const comodinesUsados = [];   // fechas cubiertas por comodín
  const mesesConComodin = new Set();

  // Hoy suma si ya estudiaste; si no, no rompe nada
  if (estudio(hoy)) actual++;

  // Un comodín solo "se gasta" si de verdad salva la racha, es decir,
  // si antes de ese día (más atrás) hubo estudio. Mientras tanto queda "en espera".
  let enEspera = [];
  let f = sumarDias(hoy, -1);
  for (let i = 0; i < 730; i++, f = sumarDias(f, -1)) {
    if (inicio && f < inicio) break;          // antes de crear la cuenta
    if (estudio(f)) {                          // estudiar en descanso también suma
      actual++;
      for (const c of enEspera) { comodinesUsados.push(c); mesesConComodin.add(c.slice(0, 7)); }
      enEspera = [];
      continue;
    }
    if (tipoDeDia(calendario, f) === "descanso") continue;
    const mes = f.slice(0, 7);
    const mesOcupado = mesesConComodin.has(mes) || enEspera.some(c => c.startsWith(mes));
    if (!mesOcupado) { enEspera.push(f); continue; }   // usar el comodín de ese mes
    break;                                     // día perdido sin comodín
  }

  // ¿Queda comodín este mes? (para mostrarlo en pantalla)
  const comodinDisponible = !mesesConComodin.has(hoy.slice(0, 7));
  return { actual, comodinesUsados, comodinDisponible };
}

// Mejor racha histórica: recorre todo el historial hacia adelante
export function mejorRacha(dias, calendario, hoy = fechaISO(), inicio = null) {
  const fechas = Object.keys(dias).sort();
  if (!fechas.length) return 0;
  let mejor = 0;
  // Calcula la racha "terminando" en cada día estudiado
  for (const f of fechas) {
    if (f > hoy || !dias[f]?.completado) continue;
    const r = calcularRacha(dias, calendario, f, inicio).actual;
    if (r > mejor) mejor = r;
  }
  return mejor;
}
