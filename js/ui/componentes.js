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
