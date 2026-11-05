// =========================================================
// PÁGINA: PERFIL DE MI PAREJA (solo lectura)
// =========================================================
import { t } from "../i18n.js";
import { esc, avatar, tarjetaNiveles } from "../ui/componentes.js";
import { nivelGeneral } from "../motor/niveles.js";

export function render({ pareja }) {
  if (!pareja) {
    return `<h1>${t("sec.pareja")}</h1>
      <div class="tarjeta"><p style="margin:0">${t("inicio.sinPareja")}</p></div>`;
  }
  return `
    <div class="encabezado">
      <div class="fila">
        ${avatar(pareja, "acento")}
        <div><h1 style="margin:0">${esc(pareja.nombre)}</h1>
        <span class="suave pequeno">${t(pareja.rol === "A" ? "perfil.rolA" : "perfil.rolB")}</span></div>
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta">${t("inicio.nivel")}</div>
      <h2>${esc(nivelGeneral(pareja))}</h2>
    </div>

    <div class="tarjeta">
      <div class="etiqueta">${t("perfil.niveles")}</div>
      ${tarjetaNiveles(pareja, t)}
    </div>

    <div class="tarjeta pareja">
      <div class="fila entre"><b>XP</b><b>${Number(pareja.xp) || 0}</b></div>
      <div class="fila entre"><span>🔥</span><b>${Number(pareja.racha?.actual) || 0}</b></div>
    </div>
  `;
}
