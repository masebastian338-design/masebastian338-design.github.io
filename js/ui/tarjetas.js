// =========================================================
// TARJETAS DE VOCABULARIO
//  - ejecutarRepaso: repaso espaciado (active recall + SM-2)
//  - ejecutarPresentacion: presenta palabras nuevas en contexto
// =========================================================
import { t, traduccionHTML } from "../i18n.js";
import { esc, botonOir } from "./componentes.js";
import { hablar } from "./voz.js";
import { calificar, estadoNuevo, previsualizar } from "../motor/srs.js";
import { obtener } from "../datos/contenido.js";
import { fechaISO } from "../motor/calendario.js";

// ---------------------------------------------------------
// Repaso: muestra la palabra en inglés → intentas recordar →
// ves la respuesta → calificas con 4 botones.
// "Otra vez" la manda al final de la fila (vuelve en esta sesión).
// guardar(estado) se llama tras cada calificación.
// Devuelve { repasadas, otraVez }.
// ---------------------------------------------------------
export function ejecutarRepaso(caja, estados, contenido, perfil, guardar) {
  return new Promise(resolve => {
    const fila = estados.map(e => ({ ...e }));
    const hoy = fechaISO();
    let repasadas = 0, otraVez = 0;

    function mostrar() {
      if (!fila.length) { resolve({ repasadas, otraVez }); return; }
      const e = fila[0];
      const v = obtener(contenido, e.id);
      if (!v) { fila.shift(); mostrar(); return; }   // palabra borrada del contenido

      caja.innerHTML = `
        <p class="suave pequeno centro">${t("quedan", { n: fila.length })}</p>
        <div class="flashcard">
          <div class="fc-frente">
            <div class="fc-palabra">${esc(v.palabra)}</div>
            ${v.ipa ? `<div class="suave pequeno">${esc(v.ipa)}</div>` : ""}
            ${botonOir(v.palabra)}
          </div>
          <div class="fc-reverso" hidden>
            <div class="fc-traduccion">${esc(v.traduccion)}</div>
            ${v.ejemplo ? `<p>${esc(v.ejemplo)} ${botonOir(v.ejemplo)}</p>` : ""}
            ${traduccionHTML(v.ejemploTraduccion, perfil, esc)}
          </div>
        </div>
        <button type="button" class="boton ancho" id="mostrar">${t("mostrarRespuesta")}</button>
        <div class="botones-srs" hidden></div>`;

      hablar(v.palabra, perfil.ajustes);
      const prev = previsualizar(e, hoy);
      const botones = caja.querySelector(".botones-srs");
      botones.innerHTML = ["otra", "dificil", "bien", "facil"].map(b =>
        `<button type="button" class="srs-${b}" data-b="${b}"><b>${t("srs." + b)}</b><small>${prev[b]}</small></button>`).join("");

      caja.querySelector("#mostrar").onclick = ev => {
        caja.querySelector(".fc-reverso").hidden = false;
        ev.currentTarget.hidden = true;
        botones.hidden = false;
      };

      botones.querySelectorAll("button").forEach(btn => btn.onclick = async () => {
        botones.querySelectorAll("button").forEach(x => x.disabled = true);
        const nuevo = calificar(e, btn.dataset.b, hoy);
        fila.shift();
        repasadas++;
        if (btn.dataset.b === "otra") { otraVez++; fila.push(nuevo); }
        try { await guardar(nuevo); } catch (err) { console.warn("No se guardó la tarjeta:", err); }
        mostrar();
      });
    }
    mostrar();
  });
}

// ---------------------------------------------------------
// Presentación de palabras nuevas (paso "vocabulario en contexto").
// Al terminar, cada palabra entra al sistema de repaso para
// repasarse mañana. Devuelve la lista de estados nuevos.
// ---------------------------------------------------------
export function ejecutarPresentacion(caja, ids, contenido, perfil, yaExisten = {}) {
  return new Promise(resolve => {
    const palabras = ids.map(id => obtener(contenido, id)).filter(Boolean);
    const filas = palabras.map(v => `
      <li class="palabra">
        <div class="fila entre">
          <div><b>${esc(v.palabra)}</b> <span class="suave pequeno">${esc(v.ipa || "")}</span></div>
          ${botonOir(v.palabra)}
        </div>
        <div class="trad-palabra">${esc(v.traduccion)}</div>
        ${v.ejemplo ? `<p class="pequeno">“${esc(v.ejemplo)}” ${botonOir(v.ejemplo)}</p>` : ""}
        ${traduccionHTML(v.ejemploTraduccion, perfil, esc)}
      </li>`).join("");

    caja.innerHTML = `
      <p>${t("vocab.instruccion")}</p>
      <ul class="lista-palabras">${filas}</ul>
      <button type="button" class="boton ancho" id="listo">${t("vocab.listo")}</button>`;

    caja.querySelector("#listo").onclick = () => {
      const hoy = fechaISO();
      // Las que ya estaban en repaso no se reinician
      const nuevas = palabras.filter(v => !yaExisten[v.id])
        .map(v => calificar(estadoNuevo(v.id, hoy), "bien", hoy)); // primer repaso: mañana
      resolve(nuevas);
    };
  });
}
