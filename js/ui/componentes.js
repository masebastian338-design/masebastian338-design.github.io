// =========================================================
// HERRAMIENTAS DE INTERFAZ reutilizables
// =========================================================

// Escapa texto para insertarlo en HTML sin riesgo
// (evita que un nombre con "<" rompa la página).
export function esc(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Texto con formato mínimo: **negrita** y *cursiva* (siempre escapado antes)
export function md(texto) {
  return esc(texto)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>");
}

// Botón 🔊 que lee un texto en inglés. Lo maneja un solo "escuchador"
// global en app.js (busca data-oir), así funciona en cualquier página.
export function botonOir(texto, etiqueta = "🔊") {
  return `<button type="button" class="oir" data-oir="${esc(texto)}" aria-label="Listen">${etiqueta}</button>`;
}

// Etiqueta de error legible: "pasado-irregular" → "pasado irregular"
export function nombreEtiqueta(etq) { return String(etq || "").replaceAll("-", " "); }

// Formatea minutos a partir de segundos
export function minutos(seg) { return Math.round((Number(seg) || 0) / 60); }

// Muestra un mensaje flotante unos segundos
export function toast(mensaje, ms = 2500) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = mensaje;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// Avatar: foto de Google o la inicial del nombre
export function avatar(perfil, extraClase = "") {
  const inicial = esc((perfil?.nombre || "?").trim().charAt(0).toUpperCase());
  const foto = perfil?.foto ? `<img src="${esc(perfil.foto)}" alt="" referrerpolicy="no-referrer">` : inicial;
  return `<span class="avatar ${extraClase}">${foto}</span>`;
}

// Tarjeta con las 6 habilidades y su nivel
export function tarjetaNiveles(perfil, t) {
  const habilidades = ["speaking", "listening", "vocabulario", "gramatica", "lectura", "escritura"];
  const celdas = habilidades.map(h => `
    <div class="nivel"><b>${esc(perfil.niveles?.[h] || "—")}</b><span>${t("hab." + h)}</span></div>`).join("");
  return `<div class="niveles">${celdas}</div>`;
}
