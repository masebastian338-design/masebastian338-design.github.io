// =========================================================
// NIVELES MCER, SUBNIVELES Y REGLAS DE SUBIDA
// ---------------------------------------------------------
// Cada nivel tiene 3 subniveles: A1.1, A1.2, A1.3, A2.1 …
// "A0" = principiante absoluto (antes de A1.1).
//
// Reglas (del plan):
//  - Subir de SUBNIVEL en una habilidad: ≥ 80 % en esa habilidad
//    en DOS evaluaciones semanales seguidas.
//  - < 60 % dos veces seguidas: NO se baja; la semana siguiente
//    entra en "modo refuerzo" (más repaso de debilidades).
//  - Pasar de NIVEL completo (ej. A2.3 → B1.1) solo en la
//    evaluación de la 4.ª semana y con el speaking aprobado.
//    "Speaking aprobado" = el speaking evaluado (Claude o rúbrica)
//    está al menos en el último subnivel del nivel actual (X.3).
//  - Excepción: de A0 a A1.1 se puede subir en cualquier semana.
//  - Nivel general = promedio ponderado por prioridades:
//    speaking 5, listening 5, vocabulario 4, gramática 3,
//    lectura 2, escritura 2 (solo habilidades ya evaluadas).
// Lógica pura.
// =========================================================

export const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const HABILIDADES = ["speaking", "listening", "vocabulario", "gramatica", "lectura", "escritura"];
export const PESOS = { speaking: 5, listening: 5, vocabulario: 4, gramatica: 3, lectura: 2, escritura: 2 };
export const UMBRAL_SUBIR = 0.8;
export const UMBRAL_REFUERZO = 0.6;

// "A2.1" → número para comparar: A0 = 0, A1.1 = 1, A1.2 = 2, A1.3 = 3, A2.1 = 4 …
// "A2" (sin subnivel) cuenta como A2.1.
export function rango(nivel) {
  if (!nivel || nivel === "A0") return 0;
  const [base, sub] = String(nivel).split(".");
  const i = NIVELES.indexOf(base);
  if (i < 0) return 0;
  return i * 3 + Math.min(3, Math.max(1, Number(sub) || 1));
}

// Número → "A2.1" (lo contrario de rango)
export function desdeRango(r) {
  r = Math.round(r);
  if (r <= 0) return "A0";
  r = Math.min(r, NIVELES.length * 3);
  const i = Math.floor((r - 1) / 3);
  return `${NIVELES[i]}.${((r - 1) % 3) + 1}`;
}

export function alMenos(nivel, minimo) { return rango(nivel) >= rango(minimo); }
export function base(nivel) { return nivel === "A0" ? "A0" : String(nivel).split(".")[0]; }

// Nivel general del perfil
export function nivelGeneral(perfil) {
  return perfil?.nivelGeneral || perfil?.nivelEstimado || (perfil?.rol === "A" ? "A2" : "A0");
}

// Nivel de una habilidad (si no hay dato, el estimado general)
export function nivelDe(perfil, habilidad) {
  return perfil?.niveles?.[habilidad] || nivelGeneral(perfil);
}

// Promedio ponderado de las habilidades evaluadas → "A2.2"
export function nivelPonderado(niveles = {}) {
  let suma = 0, pesos = 0;
  for (const h of HABILIDADES) {
    if (!niveles[h]) continue;
    suma += rango(niveles[h]) * PESOS[h];
    pesos += PESOS[h];
  }
  return pesos ? desdeRango(suma / pesos) : null;
}

// ¿El speaking evaluado aprueba el nivel actual? (≥ X.3 del nivel base actual)
export function speakingAprueba(nivelSpeaking, nivelActual) {
  if (!nivelSpeaking) return false;
  if (nivelActual === "A0") return alMenos(nivelSpeaking, "A1.1");
  return alMenos(nivelSpeaking, `${base(nivelActual)}.3`);
}

// ---------------------------------------------------------
// Aplica el resultado de una evaluación semanal.
// puntajes = { listening: 0.85, gramatica: 0.5, ... } (0 a 1)
// opciones = { mensual: bool, speakingNivel: "A2.3" | null }
// Devuelve { niveles, progresoNivel, cambios, refuerzo }
//   cambios: [{ habilidad, de, a, tipo: "subnivel" | "nivel" | "listo" }]
//   ("listo" = cumplió para subir de nivel, pero espera a la evaluación mensual)
//   refuerzo: lista de habilidades que entran en modo refuerzo
// ---------------------------------------------------------
export function aplicarEvaluacion(perfil, puntajes, opciones = {}) {
  const niveles = { ...(perfil.niveles || {}) };
  const progreso = structuredClone(perfil.progresoNivel || {});
  const cambios = [];
  const refuerzo = [];

  for (const [h, pct] of Object.entries(puntajes)) {
    if (pct == null || !HABILIDADES.includes(h)) continue;
    const p = progreso[h] || { seguidas80: 0, seguidas60: 0 };
    const actual = niveles[h] || nivelGeneral(perfil);

    // Contadores de evaluaciones seguidas
    p.seguidas80 = pct >= UMBRAL_SUBIR ? (p.seguidas80 || 0) + 1 : 0;
    p.seguidas60 = pct < UMBRAL_REFUERZO ? (p.seguidas60 || 0) + 1 : 0;

    if (p.seguidas80 >= 2) {
      const siguiente = desdeRango(rango(actual) + 1);
      const cruzaNivel = actual !== "A0" && base(siguiente) !== base(actual);
      if (siguiente === actual) {
        // Ya está en el tope (C2.3)
      } else if (!cruzaNivel) {
        niveles[h] = siguiente;
        cambios.push({ habilidad: h, de: actual, a: siguiente, tipo: "subnivel" });
        p.seguidas80 = 0;
      } else if (opciones.mensual && speakingAprueba(opciones.speakingNivel, actual)) {
        niveles[h] = siguiente;
        cambios.push({ habilidad: h, de: actual, a: siguiente, tipo: "nivel" });
        p.seguidas80 = 0;
      } else {
        // Cumple, pero debe esperar la evaluación mensual (no se reinicia el contador)
        cambios.push({ habilidad: h, de: actual, a: siguiente, tipo: "listo" });
      }
    }
    if (p.seguidas60 >= 2) {
      refuerzo.push(h);
      p.seguidas60 = 0;
    }
    if (!niveles[h]) niveles[h] = actual;
    progreso[h] = p;
  }
  return { niveles, progresoNivel: progreso, cambios, refuerzo };
}
