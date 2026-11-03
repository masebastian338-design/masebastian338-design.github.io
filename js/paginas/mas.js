// =========================================================
// PÁGINA: MÁS (menú con todas las secciones)
// y página genérica "en construcción" para las que faltan.
// =========================================================
import { t } from "../i18n.js";

// Lista maestra de secciones: ruta, ícono y fase en que se construye.
export const SECCIONES = [
  { ruta: "hoy",          icono: "📅", fase: 3 },
  { ruta: "ruta",         icono: "🧭", fase: 3 },
  { ruta: "recursos",     icono: "🎬", fase: 5 },
  { ruta: "quizzes",      icono: "✅", fase: 3 },
  { ruta: "speaking",     icono: "🎙️", fase: 3 },
  { ruta: "retos",        icono: "🤝", fase: 6 },
  { ruta: "vocabulario",  icono: "🃏", fase: 3 },
  { ruta: "evaluaciones", icono: "📝", fase: 4 },
  { ruta: "estadisticas", icono: "📈", fase: 6 },
  { ruta: "perfil",       icono: "👤", fase: 2 },
  { ruta: "pareja",       icono: "💞", fase: 2 },
  { ruta: "calendario",   icono: "🗓️", fase: 3 },
  { ruta: "agregar",      icono: "➕", fase: 5 },
  { ruta: "generar",      icono: "✨", fase: 5 },
  { ruta: "respaldo",     icono: "💾", fase: 7 },
];

export function render() {
  const enlaces = SECCIONES.map(s => `
    <a href="#/${s.ruta}">
      <span class="icono">${s.icono}</span>
      ${t("sec." + s.ruta)}
      <small>${t("sec." + s.ruta + ".d")}</small>
    </a>`).join("");
  return `<h1>${t("nav.mas")}</h1><div class="menu-grid">${enlaces}</div>`;
}

// Página provisional para secciones de fases futuras
export function renderPendiente(ruta) {
  const s = SECCIONES.find(x => x.ruta === ruta);
  return `
    <a href="#/mas" class="suave">${t("volver")}</a>
    <h1 style="margin-top:12px">${s ? s.icono + " " + t("sec." + ruta) : ruta}</h1>
    <div class="tarjeta">
      <div class="etiqueta">${t("pendiente.titulo")}</div>
      <p style="margin:0">${t("pendiente.texto", { fase: s?.fase ?? "?" })}</p>
    </div>`;
}
