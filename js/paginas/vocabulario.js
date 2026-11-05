// =========================================================
// PÁGINA: VOCABULARIO (repasos espaciados + lista de palabras)
// =========================================================
import { t } from "../i18n.js";
import { esc, botonOir } from "../ui/componentes.js";
import { cargarContenido, obtener } from "../datos/contenido.js";
import * as prog from "../datos/progreso.js";
import { pendientes, resumen } from "../motor/srs.js";
import { fechaISO, diasEntre } from "../motor/calendario.js";
import { ejecutarRepaso } from "../ui/tarjetas.js";

export function render() {
  return `<h1>${t("sec.vocabulario")}</h1><div id="vocab"><p class="suave">${t("cargando")}</p></div>`;
}

export async function montar(raiz, { perfil }) {
  const caja = raiz.querySelector("#vocab");
  const contenido = await cargarContenido();
  let estados = await prog.vocabulario(perfil.uid);
  let filtro = "todas";

  function vista() {
    const hoy = fechaISO();
    const due = pendientes(estados, hoy);
    const r = resumen(estados);
    const lista = Object.values(estados)
      .filter(e => filtro === "todas" || e.estado === filtro)
      .sort((a, b) => a.proxima.localeCompare(b.proxima));

    const filas = lista.map(e => {
      const v = obtener(contenido, e.id);
      if (!v) return "";
      const dias = diasEntre(hoy, e.proxima);
      const cuando = dias <= 0 ? t("vocab.hoy") : t("vocab.enDias", { n: dias });
      return `<li class="fila entre palabra-lista">
        <div><b>${esc(v.palabra)}</b><br><span class="suave pequeno">${esc(v.traduccion)}</span></div>
        <div class="derecha-texto"><span class="estado-${e.estado}">${t("srs.estado." + e.estado)}</span><br>
        <span class="suave pequeno">${cuando}</span></div>
        ${botonOir(v.palabra)}
      </li>`;
    }).join("");

    caja.innerHTML = `
      <div class="niveles" style="grid-template-columns:repeat(3,1fr)">
        <div class="nivel"><b>${r.total}</b><span>${t("vocab.total")}</span></div>
        <div class="nivel"><b>${due.length}</b><span>${t("vocab.pendientes")}</span></div>
        <div class="nivel"><b>${r.dominada || 0}</b><span>${t("vocab.dominadas")}</span></div>
      </div>
      <button class="boton ancho" id="repasar" style="margin:16px 0" ${due.length ? "" : "disabled"}>
        ${due.length ? t("vocab.repasarAhora", { n: due.length }) : t("vocab.nadaHoy")}</button>
      ${r.total ? `
        <div class="filtros">${["todas", "aprendiendo", "repaso", "dominada"].map(f =>
          `<button class="chip ${f === filtro ? "activo" : ""}" data-f="${f}">${t("srs.filtro." + f)}</button>`).join("")}</div>
        <ul class="lista-simple">${filas || `<li class="suave">—</li>`}</ul>`
      : `<p class="suave">${t("vocab.vacio")}</p>`}
      <p class="suave pequeno">${t("vocab.explicacionSRS")}</p>`;

    caja.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { filtro = b.dataset.f; vista(); });
    const btn = caja.querySelector("#repasar");
    btn.onclick = async () => {
      await ejecutarRepaso(caja, due, contenido, perfil, async e => {
        estados[e.id] = e;
        await prog.guardarTarjeta(perfil.uid, e);
      });
      estados = await prog.vocabulario(perfil.uid);
      vista();
    };
  }
  vista();
}
