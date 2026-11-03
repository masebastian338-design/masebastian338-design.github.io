// =========================================================
// PÁGINA: INICIO
// =========================================================
import { t, idiomaActual } from "../i18n.js";
import { esc, avatar } from "../ui/componentes.js";

// ¿Qué tipo de día es hoy según el calendario 5 + 1 + 1 del perfil?
export function tipoDeDia(perfil, fecha = new Date()) {
  const dia = fecha.getDay();
  const cal = perfil.calendario || {};
  if (dia === cal.descanso) return "descanso";
  if (dia === cal.ligero) return "ligero";
  return "completo";
}

export function render({ perfil, pareja }) {
  const tipo = tipoDeDia(perfil);
  const retosHechos = 0; // se conecta en la Fase 6
  const nivel = perfil.niveles?.speaking ? "" : `<p class="suave pequeno">${t("inicio.sinDiag")}</p>`;

  return `
    <div class="encabezado">
      <div>
        <p class="saludo">${new Date().toLocaleDateString(idiomaActual() === "en" ? "en-US" : "es", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1>${t("inicio.hola", { nombre: esc(perfil.nombre) })}</h1>
      </div>
      <a href="#/perfil" aria-label="${t("sec.perfil")}">${avatar(perfil)}</a>
    </div>

    <div class="tarjeta destacada">
      <div class="etiqueta">${t("inicio.hoyEs")}</div>
      <h2>${t("dia." + tipo)}</h2>
      ${tipo !== "descanso" ? `<a class="boton ancho" href="#/hoy">${t("inicio.empezar")}</a>` : ""}
    </div>

    <div class="tarjeta pareja">
      <div class="etiqueta">${t("inicio.metaPareja")}</div>
      <div class="fila entre" style="margin-bottom:8px">
        <b>${t("inicio.retos", { n: retosHechos })}</b><span>🤝</span>
      </div>
      <div class="barra"><span style="width:${(retosHechos / 3) * 100}%"></span></div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta">${t("inicio.nivel")}</div>
      <h2>${esc(perfil.nivelEstimado || "—")}</h2>
      ${nivel}
    </div>

    <a class="tarjeta fila" href="#/pareja" style="text-decoration:none;color:inherit">
      ${pareja ? avatar(pareja, "acento") : avatar({ nombre: "?" }, "acento")}
      <div>
        <div class="etiqueta">${t("inicio.parejaDe")}</div>
        <b>${pareja ? esc(pareja.nombre) : t("inicio.sinPareja")}</b>
      </div>
    </a>
  `;
}
