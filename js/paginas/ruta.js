// =========================================================
// PÁGINA: RUTA DE APRENDIZAJE (semanas, temas y lecciones)
// Toca una lección ya vista para repasarla.
// =========================================================
import { t, idiomaActual } from "../i18n.js";
import { esc } from "../ui/componentes.js";
import { cargarContenido, obtener, leccionesDeRuta, tema } from "../datos/contenido.js";
import * as prog from "../datos/progreso.js";
import { siguienteLeccion } from "../motor/sesion.js";
import { htmlLeccion, montarLeccion } from "../ui/leccion.js";

export function render() {
  return `<h1>${t("sec.ruta")}</h1><div id="ruta"><p class="suave">${t("cargando")}</p></div>`;
}

export async function montar(raiz, { perfil }) {
  const caja = raiz.querySelector("#ruta");
  const [contenido, completados] = await Promise.all([cargarContenido(), prog.completados(perfil.uid)]);
  const es = idiomaActual() === "es";

  function vista() {
    const lecciones = leccionesDeRuta(contenido, perfil.rol);
    const actual = siguienteLeccion(contenido, perfil.rol, completados);
    const hechas = lecciones.filter(l => completados[l.id]).length;

    // Agrupar por semana
    const porSemana = {};
    for (const l of lecciones) (porSemana[l.semana ?? 0] ||= []).push(l);

    caja.innerHTML = `
      <p class="suave">${t("ruta.progreso", { n: hechas, total: lecciones.length })}</p>
      <div class="barra" style="margin-bottom:16px"><span style="width:${lecciones.length ? (hechas / lecciones.length) * 100 : 0}%;background:var(--primario)"></span></div>
      ${Object.entries(porSemana).map(([sem, ls]) => {
        const tm = tema(contenido, ls[0].tema);
        return `<div class="tarjeta">
          <div class="etiqueta">${t("semana")} ${esc(sem)} · ${tm.icono} ${esc(es ? tm.nombreES : tm.nombre)}</div>
          <ul class="pasos">${ls.map(l => {
            const hecha = !!completados[l.id];
            const esActual = l === actual;
            return `<li class="paso ${hecha ? "hecho" : ""} ${esActual ? "actual" : ""}" ${hecha ? `data-l="${esc(l.id)}" role="button" tabindex="0"` : ""}>
              <span class="icono">${hecha ? "✓" : esActual ? "▶" : "🔒"}</span>
              <div><b>${esc(es && l.tituloES ? l.tituloES : l.titulo)}</b><small>${esc(l.nivel)}${hecha ? " · " + t("ruta.repasar") : esActual ? " · " + t("ruta.siguiente") : ""}</small></div>
            </li>`;
          }).join("")}</ul></div>`;
      }).join("")}
      <p class="suave pequeno">${t("ruta.masContenido")}</p>`;

    caja.querySelectorAll("[data-l]").forEach(li => li.onclick = () => {
      const l = obtener(contenido, li.dataset.l);
      caja.innerHTML = `<a href="#/ruta" class="suave" id="atras">${t("volver")}</a>${htmlLeccion(l, perfil)}`;
      caja.querySelector("#atras").onclick = ev => { ev.preventDefault(); vista(); };
      montarLeccion(caja, l, perfil);
    });
  }
  vista();
}
