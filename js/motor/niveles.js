// =========================================================
// NIVELES MCER y SUBNIVELES
// ---------------------------------------------------------
// Cada nivel tiene 3 subniveles: A1.1, A1.2, A1.3, A2.1…
// "A0" = principiante absoluto (antes de A1.1).
// En esta fase solo se usa para comparar niveles (inmersión
// progresiva). La Fase 4 agrega la lógica de subir de nivel.
// =========================================================

export const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Convierte "A2.1" en un número para comparar: A0 = 0, A1.1 = 1, A1.2 = 2 …
// "A2" (sin subnivel) cuenta como A2.1.
export function rango(nivel) {
  if (!nivel || nivel === "A0") return 0;
  const [base, sub] = String(nivel).split(".");
  const i = NIVELES.indexOf(base);
  if (i < 0) return 0;
  return i * 3 + (Number(sub) || 1);
}

export function alMenos(nivel, minimo) { return rango(nivel) >= rango(minimo); }

// Nivel general del perfil (estimado hasta que exista diagnóstico)
export function nivelGeneral(perfil) {
  return perfil?.nivelGeneral || perfil?.nivelEstimado || (perfil?.rol === "A" ? "A2" : "A0");
}
