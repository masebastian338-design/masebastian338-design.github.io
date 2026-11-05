// =========================================================
// CALENDARIO 5 + 1 + 1
// ---------------------------------------------------------
// Cada semana: 5 días de sesión completa, 1 día ligero
// (5–10 min) y 1 de descanso. Cada quien elige qué día de la
// semana es ligero y cuál es descanso, y puede "mover" un día
// concreto (ej. este jueves → descanso) con un cambio puntual.
//
// perfil.calendario = {
//   ligero: 6,            // 0 = domingo … 6 = sábado
//   descanso: 0,
//   cambios: { "2026-11-05": "descanso" }   // excepciones por fecha
// }
// Lógica pura: no lee ni guarda nada (fácil de probar).
// =========================================================

// Fecha local en formato "AAAA-MM-DD" (sin problemas de zona horaria)
export function fechaISO(fecha = new Date()) {
  const a = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

// "AAAA-MM-DD" → Date a mediodía local (evita saltos por horario de verano)
export function desdeISO(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d, 12);
}

export function sumarDias(iso, n) {
  const f = desdeISO(iso);
  f.setDate(f.getDate() + n);
  return fechaISO(f);
}

export function diasEntre(isoA, isoB) {
  return Math.round((desdeISO(isoB) - desdeISO(isoA)) / 86400000);
}

// Lunes de la semana de una fecha (semanas de lunes a domingo)
export function lunesDe(iso) {
  const dia = desdeISO(iso).getDay();          // 0 domingo
  return sumarDias(iso, dia === 0 ? -6 : 1 - dia);
}

// Tipo de día: "completo" | "ligero" | "descanso"
export function tipoDeDia(calendario = {}, iso = fechaISO()) {
  const cambio = calendario.cambios?.[iso];
  if (cambio) return cambio;
  const dia = desdeISO(iso).getDay();
  if (dia === (calendario.descanso ?? 0)) return "descanso";
  if (dia === (calendario.ligero ?? 6)) return "ligero";
  return "completo";
}

// Las 7 fechas de la semana con su tipo
export function semana(calendario, iso = fechaISO()) {
  const lunes = lunesDe(iso);
  return Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(lunes, i);
    return { fecha: f, tipo: tipoDeDia(calendario, f) };
  });
}

// ¿Cuántos días completos lleva la semana hasta "iso" (incluido)?
// Sirve para saber cuál es el 5.º día completo (evaluación semanal, Fase 4).
export function numeroDeDiaCompleto(calendario, iso = fechaISO()) {
  return semana(calendario, iso).filter(d => d.fecha <= iso && d.tipo === "completo").length;
}

// Revisa que la semana siga siendo 5 + 1 + 1; devuelve avisos (no bloquea)
export function revisarSemana(calendario, iso = fechaISO()) {
  const s = semana(calendario, iso);
  const cuenta = { completo: 0, ligero: 0, descanso: 0 };
  s.forEach(d => cuenta[d.tipo]++);
  const avisos = [];
  if (cuenta.descanso > 1) avisos.push("mas-descanso");
  if (cuenta.completo < 5) avisos.push("menos-completos");
  return { cuenta, avisos };
}
