// =========================================================
// PÁGINA: SPEAKING (retos individuales + shadowing libre)
// =========================================================
import { t, idiomaActual } from "../i18n.js";
import { esc } from "../ui/componentes.js";
import { hayGrabacion } from "../ui/voz.js";
import { cargarContenido, obtener, leccionesDeRuta } from "../datos/contenido.js";
import * as prog from "../datos/progreso.js";
import { siguienteLeccion, frasesDeLeccion } from "../motor/sesion.js";
import { ejecutarShadowing, ejecutarSpeaking, speakingARespuestas, shadowingARespuestas } from "../ui/speaking.js";

export function render() {
  return `<h1>${t("sec.speaking")}</h1><div id="speaking"><p class="suave">${t("cargando")}</p></div>`;
}

export async function montar(raiz, { perfil }) {
  const caja = raiz.querySelector("#speaking");
  const contenido = await cargarContenido();
  const uid = perfil.uid;
  const es = idiomaActual() === "es";

  async function vista() {
    const completados = await prog.completados(uid);
    const actual = siguienteLeccion(contenido, perfil.rol, completados);
    const lecciones = leccionesDeRuta(contenido, perfil.rol).filter(l => completados[l.id] || l === actual);

    caja.innerHTML = `
      ${hayGrabacion ? "" : `<div class="aviso">${t("sinGrabacion")}</div>`}
      <p class="suave">${t("speaking.intro")}</p>
      <ul class="lista-simple">${lecciones.map(l => `
        <li>
          <b>${esc(es && l.tituloES ? l.tituloES : l.titulo)}</b>
          <div class="fila" style="margin-top:8px">
            ${l.speaking ? `<button class="boton secundario" data-sp="${esc(l.speaking)}">🎙️ ${t("paso.speaking")}</button>` : ""}
            <button class="boton secundario" data-sh="${esc(l.id)}">🗣️ Shadowing</button>
          </div>
        </li>`).join("") || `<li class="suave">${t("quiz.vacio")}</li>`}</ul>`;

    caja.querySelectorAll("[data-sp]").forEach(b => b.onclick = async () => {
      const sp = obtener(contenido, b.dataset.sp);
      const r = await ejecutarSpeaking(caja, sp, perfil);
      await prog.registrarRespuestas(uid, speakingARespuestas(r));
      await prog.guardarResultado(uid, { tipo: "speaking", speakingId: sp.id, ...r });
      fin(r.fluidez >= 2 ? t("speaking.bien") : t("final.consejoFluidez"));
    });
    caja.querySelectorAll("[data-sh]").forEach(b => b.onclick = async () => {
      const l = obtener(contenido, b.dataset.sh);
      const notas = await ejecutarShadowing(caja, frasesDeLeccion(contenido, l, 8), perfil, "libre");
      await prog.registrarRespuestas(uid, shadowingARespuestas(notas));
      fin(t("speaking.shadowHecho", { n: notas.length }));
    });
  }

  function fin(mensaje) {
    caja.innerHTML = `<div class="tarjeta destacada centro"><div class="logo-grande">👏</div><p>${esc(mensaje)}</p></div>
      <button class="boton ancho" id="volver">${t("continuar")}</button>`;
    caja.querySelector("#volver").onclick = vista;
  }

  vista();
}
