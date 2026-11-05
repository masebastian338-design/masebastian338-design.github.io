// =========================================================
// PÁGINA: EVALUACIONES
// ---------------------------------------------------------
// Vista principal (#/evaluaciones) y sub-vistas con ?ver=…
//   diagnostico · speaking · rubrica · semanal · reportes · reporte&id=…
// =========================================================
import { t, tx } from "../i18n.js";
import { esc, toast, tarjetaNiveles } from "../ui/componentes.js";
import { cargarContenido, leccionesDeRuta } from "../datos/contenido.js";
import * as prog from "../datos/progreso.js";
import * as datosEval from "../datos/evaluaciones.js";
import { fechaISO, sumarDias, lunesDe } from "../motor/calendario.js";
import { esSemanaMensual } from "../motor/evaluacion.js";
import { nivelGeneral } from "../motor/niveles.js";
import {
  ejecutarDiagnostico, htmlPanelPrompt, montarCopiar, formularioSpeaking, rubricaSpeaking,
  ejecutarEvaluacionSemanal, htmlResultadoEvaluacion, htmlReporte, textoReporte, nombreHab,
} from "../ui/evaluacion.js";

export function render() {
  return `<div id="evals"><p class="suave">${t("cargando")}</p></div>`;
}

// Datos que necesita la evaluación semanal (también lo usa la página Hoy)
export async function contextoEvaluacion(perfil, leccionHoy = null) {
  const [contenido, completados] = await Promise.all([cargarContenido(), prog.completados(perfil.uid)]);
  const hoy = fechaISO();
  const hace28 = sumarDias(hoy, -28);
  const leccionesMes = leccionesDeRuta(contenido, perfil.rol)
    .filter(l => completados[l.id]?.fecha >= hace28 || l.id === leccionHoy).map(l => l.titulo);
  return { contenido, completados, leccionHoy, hoy, semana: datosEval.semanaActual(perfil), leccionesMes };
}

export async function montar(raiz, estado) {
  const caja = raiz.querySelector("#evals");
  const { perfil } = estado;
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const ver = params.get("ver");
  const volver = `<a href="#/evaluaciones" class="suave">${t("volver")}</a>`;

  // ---------- Diagnóstico ----------
  if (ver === "diagnostico") {
    caja.innerHTML = `${volver}<div id="act" style="margin-top:12px"></div>`;
    const act = caja.querySelector("#act");
    const { resultados, respuestas } = await ejecutarDiagnostico(act, perfil);
    await datosEval.guardarDiagnostico(perfil, resultados, respuestas);
    act.innerHTML = `
      <div class="tarjeta destacada centro"><div class="logo-grande">🎯</div>
        <h2>${tx("¡Diagnóstico terminado!", "Placement test complete!")}</h2>
        <p>${tx("Nivel general", "Overall level")}: <b>${esc(nivelGeneral(perfil))}</b></p></div>
      <div class="tarjeta">${Object.entries(resultados).map(([h, n]) => `<div class="fila entre"><span>${nombreHab(h)}</span><b>${esc(n)}</b></div>`).join("")}</div>
      <p>${tx("Falta el speaking, que pesa mucho en tu nivel general. Hazlo con Claude (10–15 min) o con la rúbrica.",
              "Speaking is still missing, and it weighs a lot in your overall level. Do it with Claude (10–15 min) or with the rubric.")}</p>
      <a class="boton ancho" href="#/evaluaciones?ver=speaking">🎙️ ${tx("Diagnóstico de speaking", "Speaking assessment")}</a>`;
    return;
  }

  // ---------- Speaking con Claude ----------
  if (ver === "speaking") {
    caja.innerHTML = `${volver}<h1 style="margin-top:12px">🎙️ ${tx("Diagnóstico de speaking", "Speaking assessment")}</h1>
      <p class="suave">${tx("Claude conduce una conversación graduada de 10–15 minutos y te da tu nivel. Gratis sirve.", "Claude runs a 10–15 minute graded conversation and gives you your level. The free plan works.")}</p>
      ${await htmlPanelPrompt("diagnostico", perfil)}`;
    montarCopiar(caja);
    const r = await formularioSpeaking(caja, perfil);
    await guardarYMostrarSpeaking(r);
    return;
  }

  // ---------- Rúbrica alternativa ----------
  if (ver === "rubrica") {
    caja.innerHTML = `${volver}<div id="act" style="margin-top:12px"></div>`;
    const r = await rubricaSpeaking(caja.querySelector("#act"), perfil);
    await guardarYMostrarSpeaking(r);
    return;
  }

  async function guardarYMostrarSpeaking(r) {
    try { await datosEval.guardarSpeaking(perfil, { ...r, tipo: "diagnostico" }); }
    catch (e) { toast("Error: " + (e.code || e.message)); return; }
    caja.innerHTML = `${volver}
      <div class="tarjeta destacada centro" style="margin-top:12px"><div class="logo-grande">🎙️</div>
        <h2>Speaking: ${esc(r.nivel)}</h2>
        <p>${tx("Nivel general actualizado", "Overall level updated")}: <b>${esc(nivelGeneral(perfil))}</b></p></div>
      ${r.errores?.length ? `<div class="tarjeta"><div class="etiqueta">${tx("A reforzar", "To work on")}</div><ul>${r.errores.map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>` : ""}`;
  }

  // ---------- Evaluación semanal ----------
  if (ver === "semanal") {
    const hecha = await datosEval.evaluacionDeSemana(perfil.uid);
    caja.innerHTML = `${volver}<div id="act" style="margin-top:12px"></div>`;
    const act = caja.querySelector("#act");
    if (hecha) { act.innerHTML = htmlResultadoEvaluacion(hecha); return; }
    await ejecutarEvaluacionSemanal(act, perfil, await contextoEvaluacion(perfil));
    location.hash = "#/evaluaciones";
    return;
  }

  // ---------- Reportes ----------
  if (ver === "reportes" || ver === "reporte") {
    const lista = await datosEval.reportes(perfil.uid);
    const id = params.get("id");
    if (ver === "reporte" && lista[id]) {
      caja.innerHTML = `<a href="#/evaluaciones?ver=reportes" class="suave">${t("volver")}</a><div style="margin-top:12px">${htmlReporte(lista[id])}</div>
        <div class="tarjeta"><div class="etiqueta">${tx("Texto para compartir", "Text to share")}</div>
        <textarea readonly rows="7">${esc(textoReporte(lista[id], perfil))}</textarea>
        <button class="boton secundario ancho" data-copiar>📋 ${tx("Copiar", "Copy")}</button></div>`;
      montarCopiar(caja);
      return;
    }
    const semana = datosEval.semanaActual(perfil);
    caja.innerHTML = `${volver}<h1 style="margin-top:12px">📊 ${tx("Reportes de evolución", "Progress reports")}</h1>
      <p class="suave">${tx("Se genera uno cada 4 semanas, al hacer la evaluación mensual.", "One is created every 4 weeks, with the monthly assessment.")}</p>
      <ul class="lista-simple">${Object.entries(lista).sort().reverse().map(([k, r]) =>
        `<li><a href="#/evaluaciones?ver=reporte&id=${esc(k)}">${tx("Semanas", "Weeks")} ${r.bloque}–${r.bloque + 3}</a> <span class="suave pequeno">${esc(r.inicio)}</span></li>`).join("")
        || `<li class="suave">${tx("Todavía no hay reportes.", "No reports yet.")}</li>`}</ul>
      ${semana >= 4 ? `<button class="boton secundario ancho" id="generar">${tx("Generar reporte ahora", "Create report now")}</button>` : ""}`;
    caja.querySelector("#generar")?.addEventListener("click", async () => {
      await datosEval.generarReporte(perfil);
      toast(tx("Reporte generado ✓", "Report created ✓"));
      montar(raiz, estado);
    });
    return;
  }

  // ---------- Vista principal ----------
  const evals = await datosEval.evaluaciones(perfil.uid);
  const semana = datosEval.semanaActual(perfil);
  const mensual = esSemanaMensual(semana);
  const estaSemana = evals[lunesDe(fechaISO())];
  const refuerzo = datosEval.refuerzoActivo(perfil);
  const historial = Object.values(evals).sort((a, b) => b.lunes.localeCompare(a.lunes)).slice(0, 6);
  const dg = perfil.diagnostico;
  const sp = perfil.ultimoSpeaking;

  caja.innerHTML = `
    <h1>${t("sec.evaluaciones")}</h1>
    ${refuerzo ? `<div class="aviso">💪 ${tx(`Semana de refuerzo (hasta ${refuerzo.hasta}): ${refuerzo.habilidades.map(nombreHab).join(", ")}.`, `Reinforcement week (until ${refuerzo.hasta}): ${refuerzo.habilidades.map(nombreHab).join(", ")}.`)}</div>` : ""}

    <div class="tarjeta destacada">
      <div class="etiqueta">${tx("Nivel general", "Overall level")}</div>
      <h2 style="margin:0 0 8px">${esc(nivelGeneral(perfil))}</h2>
      ${tarjetaNiveles(perfil, t)}
      <p class="suave pequeno" style="margin:8px 0 0">${tx("Ponderado: speaking y listening pesan más (5), vocabulario 4, gramática 3, lectura y escritura 2.",
                                                         "Weighted: speaking and listening count most (5), vocabulary 4, grammar 3, reading and writing 2.")}</p>
    </div>

    <div class="tarjeta">
      <div class="etiqueta">1. ${tx("Diagnóstico inicial", "Placement test")}</div>
      ${dg ? `<p style="margin:0 0 8px">✓ ${esc(dg.fecha)} · ${Object.entries(dg.resultados).map(([h, n]) => `${nombreHab(h)} ${esc(n)}`).join(" · ")}</p>` : `<p>${tx("15–20 min. Vocabulario, gramática, lectura y listening.", "15–20 min. Vocabulary, grammar, reading and listening.")}</p>`}
      <a class="boton ${dg ? "secundario" : ""} ancho" href="#/evaluaciones?ver=diagnostico">${dg ? tx("Repetir diagnóstico", "Retake test") : tx("Hacer diagnóstico", "Take the test")}</a>
    </div>

    <div class="tarjeta">
      <div class="etiqueta">2. Speaking</div>
      ${sp ? `<p style="margin:0 0 8px">✓ ${esc(sp.fecha)} · <b>${esc(sp.nivel)}</b> (${esc(sp.fuente === "claude" ? "Claude" : tx("rúbrica", "rubric"))})</p>` : ""}
      <div class="fila">
        <a class="boton ${sp ? "secundario" : ""}" href="#/evaluaciones?ver=speaking" style="flex:1">🤖 ${tx("Con Claude", "With Claude")}</a>
        <a class="boton secundario" href="#/evaluaciones?ver=rubrica" style="flex:1">📋 ${tx("Rúbrica", "Rubric")}</a>
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta">3. ${mensual ? tx("Evaluación mensual", "Monthly assessment") : tx("Evaluación semanal", "Weekly assessment")} · ${tx("semana", "week")} ${semana}</div>
      ${estaSemana ? `<p style="margin:0 0 8px">✓ ${tx("Hecha esta semana", "Done this week")} (${estaSemana.bien}/${estaSemana.total})</p>
        <a class="boton secundario ancho" href="#/evaluaciones?ver=semanal">${tx("Ver resultados", "See results")}</a>`
      : `<p class="pequeno">${tx("Se hace automáticamente en tu 5.º día completo (sustituye al quiz). También puedes hacerla aquí.",
                                 "It runs automatically on your 5th full day (replaces the quiz). You can also take it here.")}
        ${mensual ? tx(" Esta es la evaluación mensual: incluye 5 min con Claude.", " This is the monthly one: it includes 5 min with Claude.") : ""}</p>
        <a class="boton ancho" href="#/evaluaciones?ver=semanal">${tx("Hacer evaluación", "Take assessment")}</a>`}
    </div>

    ${historial.length ? `<div class="tarjeta"><div class="etiqueta">${tx("Historial", "History")}</div>
      <ul class="lista-simple pequeno">${historial.map(e => `<li>${tx("Semana", "Week")} ${e.semana}${e.mensual ? " ⭐" : ""} · ${Object.entries(e.puntajes || {}).filter(([, v]) => v != null).map(([h, v]) => `${nombreHab(h)} ${Math.round(v * 100)}%`).join(" · ")}</li>`).join("")}</ul></div>` : ""}

    <a class="tarjeta fila entre" href="#/evaluaciones?ver=reportes" style="text-decoration:none;color:inherit">
      <b>📊 ${tx("Reportes de evolución", "Progress reports")}</b><span>→</span></a>`;
}
