// =========================================================
// VISOR DE LECCIÓN: objetivo, explicación, ejemplos y diálogo
// (el diálogo se escucha con dos voces sintéticas)
// =========================================================
import { t, traduccionHTML, idiomaActual } from "../i18n.js";
import { esc, md, botonOir } from "./componentes.js";
import { hablar } from "./voz.js";
import { modoTraduccion } from "../i18n.js";

export function htmlLeccion(l, perfil) {
  const enES = idiomaActual() === "es";
  // Estudiante B: explicación en español mientras la traducción esté "visible";
  // después, explicación en inglés con el español a un toque.
  const explicacion = enES && modoTraduccion(perfil) === "visible"
    ? `<div class="explicacion">${md(l.explicacionES || l.explicacion || "")}</div>`
    : `<div class="explicacion">${md(l.explicacion || l.explicacionES || "")}</div>
       ${traduccionHTML(l.resumenES || l.explicacionES, perfil, md, "resumen")}`;

  const ejemplos = (l.ejemplos || []).map(e => `
    <li><div class="fila entre"><span>${esc(e.en)}</span>${botonOir(e.en)}</div>
      ${traduccionHTML(e.es, perfil, esc)}</li>`).join("");

  const dialogo = (l.dialogo || []).map(d => `
    <li class="linea-dialogo ${d.quien === "B" ? "derecha" : ""}">
      <span class="quien">${esc(d.quien)}</span>
      <div><div>${esc(d.en)}</div>${traduccionHTML(d.es, perfil, esc)}</div>
    </li>`).join("");

  return `
    <h2>${esc(enES && l.tituloES ? l.tituloES : l.titulo)}</h2>
    ${enES && l.tituloES ? `<p class="suave">${esc(l.titulo)}</p>` : ""}
    <div class="tarjeta destacada">
      <div class="etiqueta">${t("objetivo")}</div>
      <p style="margin:0">${esc(enES ? (l.objetivoES || l.objetivo) : l.objetivo)}</p>
    </div>
    <div class="tarjeta">${explicacion}</div>
    ${ejemplos ? `<div class="tarjeta"><div class="etiqueta">${t("ejemplos")}</div><ul class="ejemplos">${ejemplos}</ul></div>` : ""}
    ${dialogo ? `<div class="tarjeta">
        <div class="fila entre"><div class="etiqueta">${t("dialogo")}</div>
        <button type="button" class="boton secundario" id="oir-dialogo">▶ ${t("escucharDialogo")}</button></div>
        <p class="suave pequeno">${t("dialogo.consejo")}</p>
        <ul class="dialogo">${dialogo}</ul></div>` : ""}`;
}

// Conecta el botón "escuchar diálogo": lee cada línea con voz distinta por persona
export function montarLeccion(raiz, l, perfil) {
  const btn = raiz.querySelector("#oir-dialogo");
  if (!btn) return;
  btn.onclick = async () => {
    btn.disabled = true;
    const lineas = raiz.querySelectorAll(".linea-dialogo");
    for (let k = 0; k < l.dialogo.length; k++) {
      lineas.forEach(x => x.classList.remove("hablando"));
      lineas[k]?.classList.add("hablando");
      await hablar(l.dialogo[k].en, perfil.ajustes, { voz2: l.dialogo[k].quien === "B", encolar: k > 0 });
    }
    lineas.forEach(x => x.classList.remove("hablando"));
    btn.disabled = false;
  };
}
