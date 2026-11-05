// =========================================================
// DETECCIÓN DE DEBILIDADES
// ---------------------------------------------------------
// Cada pregunta tiene una "etiqueta de error" (ej. "verbo-to-be",
// "pasado-simple", "articulos") y una habilidad. Por cada
// etiqueta guardamos un resumen:
//   { etiqueta, habilidad, intentos, fallos, recientes: "0110", ultima }
// "recientes" son los últimos 10 resultados (1 = fallo, 0 = acierto).
// Usamos los recientes para que, si mejoras, la debilidad desaparezca.
// Lógica pura.
// =========================================================

const MAX_RECIENTES = 10;

// Aplica una lista de respuestas a los resúmenes existentes.
// respuestas = [{ etiqueta, habilidad, correcto }]
// Devuelve SOLO los resúmenes que cambiaron { etiqueta: resumen }.
export function registrar(resumenes, respuestas, hoy) {
  const cambiados = {};
  for (const r of respuestas) {
    if (!r.etiqueta) continue;
    const previo = cambiados[r.etiqueta] || resumenes[r.etiqueta] ||
      { etiqueta: r.etiqueta, habilidad: r.habilidad, intentos: 0, fallos: 0, recientes: "" };
    const nuevo = { ...previo };
    nuevo.habilidad = r.habilidad || previo.habilidad;
    nuevo.intentos = (previo.intentos || 0) + 1;
    nuevo.fallos = (previo.fallos || 0) + (r.correcto ? 0 : 1);
    nuevo.recientes = ((previo.recientes || "") + (r.correcto ? "0" : "1")).slice(-MAX_RECIENTES);
    nuevo.ultima = hoy;
    cambiados[r.etiqueta] = nuevo;
  }
  return cambiados;
}

function tasaFallo(res) {
  const rec = res.recientes || "";
  if (!rec.length) return 0;
  return [...rec].filter(c => c === "1").length / rec.length;
}

// Etiquetas débiles, de la más grave a la menos.
// Se necesita evidencia (≥ 2 intentos recientes) y ≥ 40 % de fallo.
export function debilidades(resumenes, limite = 5) {
  return Object.values(resumenes)
    .map(r => {
      const n = (r.recientes || "").length;
      const tasa = tasaFallo(r);
      // Más intentos = más confianza en el dato
      return { ...r, tasa, puntaje: tasa * Math.min(1, n / 4) };
    })
    .filter(r => (r.recientes || "").length >= 2 && r.tasa >= 0.4)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, limite);
}

// Precisión reciente por habilidad → { listening: {aciertos, total, precision}, ... }
export function precisionPorHabilidad(resumenes) {
  const r = {};
  for (const res of Object.values(resumenes)) {
    const h = res.habilidad || "otra";
    r[h] = r[h] || { aciertos: 0, total: 0 };
    for (const c of res.recientes || "") { r[h].total++; if (c === "0") r[h].aciertos++; }
  }
  for (const v of Object.values(r)) v.precision = v.total ? v.aciertos / v.total : null;
  return r;
}

// Habilidades débiles: < 70 % de acierto reciente con al menos 5 respuestas
export function habilidadesDebiles(resumenes) {
  return Object.entries(precisionPorHabilidad(resumenes))
    .filter(([, v]) => v.total >= 5 && v.precision < 0.7)
    .sort((a, b) => a[1].precision - b[1].precision)
    .map(([h]) => h);
}
