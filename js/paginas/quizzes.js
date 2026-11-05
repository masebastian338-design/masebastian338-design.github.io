// =========================================================
// PÁGINA: QUIZZES (práctica libre)
// ---------------------------------------------------------
// - "Práctica de mis debilidades": preguntas elegidas por el motor.
// - Quizzes de las lecciones ya vistas (y la actual).
// Los resultados también alimentan la detección de debilidades.
// =========================================================
import { t, idiomaActual } from "../i18n.js";
import { esc, nombreEtiqueta } from "../ui/componentes.js";
import { cargarContenido, obtener, leccionesDeRuta } from "../datos/contenido.js";
import * as prog from "../datos/progreso.js";
import { preguntasDeRefuerzo, siguienteLeccion } from "../motor/sesion.js";
import { debilidades } from "../motor/debilidades.js";
import { fechaISO } from "../motor/calendario.js";
import { ejecutarQuiz, htmlCorrecciones, aRespuestas } from "../ui/ejercicios.js";

export function render() {
  return `<h1>${t("sec.quizzes")}</h1><div id="quizzes"><p class="suave">${t("cargando")}</p></div>`;
}

export async function montar(raiz, { perfil }) {
  const caja = raiz.querySelector("#quizzes");
  const contenido = await cargarContenido();
  const uid = perfil.uid;

  async function vista() {
    const [completados, resumenes] = await Promise.all([prog.completados(uid), prog.errores(uid)]);
    const actual = siguienteLeccion(contenido, perfil.rol, completados);
    const lecciones = leccionesDeRuta(contenido, perfil.rol).filter(l => completados[l.id] || l === actual);
    const debiles = debilidades(resumenes);
    const refuerzo = preguntasDeRefuerzo(contenido, perfil.rol, completados, resumenes, null, 8, fechaISO() + Math.random());
    const es = idiomaActual() === "es";

    caja.innerHTML = `
      <div class="tarjeta pareja">
        <div class="etiqueta">🎯 ${t("quiz.debilidades")}</div>
        ${debiles.length ? debiles.map(d => `<span class="chip">${esc(nombreEtiqueta(d.etiqueta))} · ${Math.round(d.tasa * 100)}%</span>`).join(" ")
                         : `<p class="pequeno" style="margin:0">${t("quiz.sinDebilidades")}</p>`}
        ${refuerzo.length ? `<button class="boton ancho" id="refuerzo" style="margin-top:12px">${t("quiz.practicarDebilidades", { n: refuerzo.length })}</button>` : ""}
      </div>
      <h3>${t("quiz.porLeccion")}</h3>
      <ul class="lista-simple">${lecciones.map(l => {
        const q = l.quiz ? obtener(contenido, l.quiz) : null;
        if (!q) return "";
        const c = completados[q.id];
        return `<li class="fila entre"><div><b>${esc(es && l.tituloES ? l.tituloES : l.titulo)}</b><br>
          <span class="suave pequeno">${q.preguntas.length} ${t("preguntas")}${c?.total ? ` · ${t("ultimo")}: ${c.bien}/${c.total}` : ""}</span></div>
          <button class="boton secundario" data-q="${esc(q.id)}">${t("practicar")}</button></li>`;
      }).join("") || `<li class="suave">${t("quiz.vacio")}</li>`}</ul>`;

    caja.querySelector("#refuerzo")?.addEventListener("click", () => correr(refuerzo, null));
    caja.querySelectorAll("[data-q]").forEach(b => b.onclick = () => {
      const q = obtener(contenido, b.dataset.q);
      correr(q.preguntas.map((p, i) => ({ ...p, quizId: q.id, idx: i, habilidad: p.habilidad || q.habilidad })), q.id);
    });
  }

  async function correr(preguntas, quizId) {
    const res = await ejecutarQuiz(caja, preguntas, perfil, String(Date.now()));
    const bien = res.filter(r => r.correcto).length;
    await prog.registrarRespuestas(uid, aRespuestas(res));
    await prog.guardarResultado(uid, { tipo: "quiz", quizId, bien, total: res.length, origen: "practica" });
    // En práctica libre, las correcciones se ven al final del quiz
    caja.innerHTML = `<div class="tarjeta">${htmlCorrecciones(res, perfil)}</div>
      <button class="boton ancho" id="volver">${t("volverQuizzes")}</button>`;
    caja.querySelector("#volver").onclick = vista;
  }

  vista();
}
