// =========================================================
// EJERCICIOS (quizzes)
// ---------------------------------------------------------
// Formatos: opcion · escuchar · completar · ordenar · verdadero-falso
// Regla pedagógica: durante el quiz NO se dice si acertaste
// (no interrumpir). Al final se muestran solo los errores,
// con su explicación.
// =========================================================
import { t, traduccionHTML, idiomaActual } from "../i18n.js";
import { esc, md, botonOir, nombreEtiqueta } from "./componentes.js";
import { hablar } from "./voz.js";
import { mezclar } from "../motor/sesion.js";

// Normaliza texto para comparar respuestas (sin mayúsculas, signos ni espacios extra)
export function normalizar(s) {
  return String(s ?? "").toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[.,!?¿¡"]/g, "")
    .replace(/\s+/g, " ").trim();
}

export function esCorrecta(p, respuesta) {
  if (p.formato === "verdadero-falso") return respuesta === p.respuesta;
  if (p.formato === "completar") {
    const validas = Array.isArray(p.respuesta) ? p.respuesta : [p.respuesta];
    return validas.some(v => normalizar(v) === normalizar(respuesta));
  }
  return normalizar(respuesta) === normalizar(p.respuesta);
}

// Respuesta correcta en texto (para las correcciones)
function textoCorrecto(p) {
  if (p.formato === "verdadero-falso") return p.respuesta ? t("verdadero") : t("falso");
  return Array.isArray(p.respuesta) ? p.respuesta[0] : p.respuesta;
}

// ---------------------------------------------------------
// Ejecuta un quiz pregunta por pregunta dentro de "caja".
// Devuelve una promesa con [{ p, respuesta, correcto }].
// ---------------------------------------------------------
export function ejecutarQuiz(caja, preguntas, perfil, semilla = "") {
  return new Promise(resolve => {
    const resultados = [];
    let i = 0;

    function mostrar() {
      const p = preguntas[i];
      let respuesta = null;
      const enunciadoES = traduccionHTML(p.enunciadoES, perfil, esc);
      let cuerpo = "";

      if (p.formato === "opcion" || p.formato === "escuchar") {
        cuerpo = `<div class="opciones">${p.opciones.map(o =>
          `<button type="button" class="opcion" data-valor="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
      } else if (p.formato === "verdadero-falso") {
        cuerpo = `<div class="opciones dos">
          <button type="button" class="opcion" data-valor="true">${t("verdadero")}</button>
          <button type="button" class="opcion" data-valor="false">${t("falso")}</button></div>`;
      } else if (p.formato === "completar") {
        cuerpo = `<input type="text" class="campo-respuesta" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t("escribeAqui")}">`;
      } else if (p.formato === "ordenar") {
        const fichas = mezclar(p.opciones, semilla + i);
        cuerpo = `<div class="linea-orden" aria-live="polite"></div>
          <div class="fichas">${fichas.map((f, k) =>
            `<button type="button" class="ficha" data-k="${k}">${esc(f)}</button>`).join("")}</div>`;
      }

      caja.innerHTML = `
        <div class="progreso-quiz"><span style="width:${(i / preguntas.length) * 100}%"></span></div>
        <p class="suave pequeno">${i + 1} / ${preguntas.length}${p.refuerzo ? ` · 🎯 ${t("refuerzo")}` : ""}</p>
        ${p.formato === "escuchar" ? `<div class="centro">${botonOir(p.audioTexto, "🔊 " + t("escuchar"))}</div>` : ""}
        <h3>${md(p.enunciado)}</h3>
        ${enunciadoES}
        ${cuerpo}
        <button type="button" class="boton ancho" id="siguiente" disabled>${i + 1 < preguntas.length ? t("siguiente") : t("terminar")}</button>`;

      const btnSig = caja.querySelector("#siguiente");
      const listo = v => { respuesta = v; btnSig.disabled = v === null || v === ""; };

      // Escuchar: reproduce automáticamente una vez
      if (p.formato === "escuchar") hablar(p.audioTexto, perfil.ajustes);

      caja.querySelectorAll(".opcion").forEach(b => b.onclick = () => {
        caja.querySelectorAll(".opcion").forEach(x => x.classList.remove("elegida"));
        b.classList.add("elegida");
        listo(p.formato === "verdadero-falso" ? b.dataset.valor === "true" : b.dataset.valor);
      });

      const campo = caja.querySelector(".campo-respuesta");
      if (campo) {
        campo.oninput = () => listo(campo.value.trim());
        campo.onkeydown = ev => { if (ev.key === "Enter" && !btnSig.disabled) btnSig.click(); };
        setTimeout(() => campo.focus(), 50);
      }

      // Ordenar: tocar una ficha la pasa a la línea; tocarla en la línea la regresa
      const linea = caja.querySelector(".linea-orden");
      if (linea) {
        const actualizar = () => {
          const palabras = [...linea.querySelectorAll(".ficha")].map(f => f.textContent);
          const completo = !caja.querySelector(".fichas .ficha");
          listo(completo ? palabras.join(" ") : null);
        };
        caja.querySelectorAll(".ficha").forEach(f => f.onclick = () => {
          (f.parentElement === linea ? caja.querySelector(".fichas") : linea).appendChild(f);
          actualizar();
        });
      }

      btnSig.onclick = () => {
        resultados.push({ p, respuesta, correcto: esCorrecta(p, respuesta) });
        i++;
        if (i < preguntas.length) mostrar();
        else resolve(resultados);
      };
    }

    if (!preguntas.length) resolve([]);
    else mostrar();
  });
}

// ---------------------------------------------------------
// Resumen final: puntaje + solo las correcciones importantes
// ---------------------------------------------------------
export function htmlCorrecciones(resultados, perfil) {
  const total = resultados.length;
  const bien = resultados.filter(r => r.correcto).length;
  const errores = resultados.filter(r => !r.correcto);
  const usarES = idiomaActual() === "es";

  const lista = errores.map(({ p, respuesta }) => {
    const tuya = p.formato === "verdadero-falso" ? (respuesta ? t("verdadero") : t("falso")) : (respuesta || "—");
    // B ve la explicación en español; A en inglés con resumen en español (hasta B1)
    const explicacion = usarES ? (p.explicacionES || p.explicacion) : p.explicacion;
    const extraES = !usarES ? traduccionHTML(p.explicacionES, perfil, esc, "resumen") : "";
    return `
      <li class="correccion">
        <p class="pequeno suave">${md(p.enunciado)}</p>
        <p><span class="tachado">${esc(tuya)}</span> → <b class="correcto">${esc(textoCorrecto(p))}</b></p>
        <p class="pequeno">${md(explicacion || "")}</p>
        ${extraES}
        ${p.etiquetaError ? `<span class="chip">${esc(nombreEtiqueta(p.etiquetaError))}</span>` : ""}
      </li>`;
  }).join("");

  return `
    <div class="puntaje"><b>${bien} / ${total}</b><span>${t("correctas")}</span></div>
    ${errores.length ? `<h3>${t("correccionesImportantes")}</h3><ul class="correcciones">${lista}</ul>`
                     : `<p class="centro">${t("todoBien")} 🎉</p>`}`;
}

// Convierte resultados del quiz al formato que usa el detector de debilidades
export function aRespuestas(resultados) {
  return resultados.map(({ p, correcto }) => ({
    etiqueta: p.etiquetaError, habilidad: p.habilidad || "gramatica", correcto,
  }));
}
