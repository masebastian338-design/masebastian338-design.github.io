// =========================================================
// PÁGINA: LECCIÓN DEL DÍA (sesión núcleo + bloques opcionales)
// ---------------------------------------------------------
// 1. Carga contenido y progreso.
// 2. Arma la sesión con el motor (motor/sesion.js).
// 3. Muestra los pasos; cada paso se guarda al terminarlo, así
//    puedes cerrar la app y continuar después.
// 4. Al terminar todos: marca el día, actualiza la racha y
//    muestra SOLO las correcciones importantes.
// =========================================================
import { t, idiomaActual } from "../i18n.js";
import { esc, toast, nombreEtiqueta } from "../ui/componentes.js";
import { cargarContenido, obtener } from "../datos/contenido.js";
import * as prog from "../datos/progreso.js";
import { armarSesion } from "../motor/sesion.js";
import { tipoDeDia, fechaISO, numeroDeDiaCompleto } from "../motor/calendario.js";
import { esSemanaMensual } from "../motor/evaluacion.js";
import * as datosEval from "../datos/evaluaciones.js";
import { ejecutarEvaluacionSemanal, nombreHab } from "../ui/evaluacion.js";
import { contextoEvaluacion } from "./evaluaciones.js";
import { ejecutarRepaso, ejecutarPresentacion } from "../ui/tarjetas.js";
import { ejecutarQuiz, htmlCorrecciones, aRespuestas } from "../ui/ejercicios.js";
import { ejecutarShadowing, ejecutarSpeaking, speakingARespuestas, shadowingARespuestas } from "../ui/speaking.js";
import { htmlLeccion, montarLeccion } from "../ui/leccion.js";

const ICONOS = { evaluacion: "📝", warmup: "🔁", leccion: "📖", vocab: "🃏", quiz: "✅", speaking: "🎙️", shadowing: "🗣️", reto: "🤝", video: "🎬" };

export function render() {
  return `<div id="hoy"><p class="suave">${t("cargando")}</p></div>`;
}

export async function montar(raiz, estado) {
  const caja = raiz.querySelector("#hoy");
  const { perfil } = estado;
  const uid = perfil.uid;
  const hoy = fechaISO();

  // ---------- Datos ----------
  let datos;
  async function cargar() {
    const [contenido, completados, vocab, resumenes, dia, evalSemana] = await Promise.all([
      cargarContenido(), prog.completados(uid), prog.vocabulario(uid), prog.errores(uid), prog.dia(uid, hoy),
      datosEval.evaluacionDeSemana(uid, hoy),
    ]);
    const diaDoc = dia || {};
    const tipo = diaDoc.tipoForzado || tipoDeDia(perfil.calendario, hoy);
    // Si hoy ya empezaste una lección, se mantiene aunque cambie el progreso
    const compSinHoy = { ...completados };
    if (diaDoc.leccionId) delete compSinHoy[diaDoc.leccionId];
    // Evaluación semanal: desde el 5.º día completo, si aún no se hizo esta semana
    // (o si se hizo hoy dentro de esta sesión, para mostrarla como paso hecho)
    const tocaEvaluar = tipo === "completo" && numeroDeDiaCompleto(perfil.calendario, hoy) >= 5 && !evalSemana;
    const evaluacion = tocaEvaluar || diaDoc.pasos?.evaluacion
      ? { mensual: esSemanaMensual(datosEval.semanaActual(perfil)) } : null;
    const refuerzo = datosEval.refuerzoActivo(perfil, hoy);
    const sesion = armarSesion({ perfil, contenido, completados: compSinHoy, vocab, resumenes, hoy, tipo, evaluacion, refuerzo });
    datos = { contenido, completados, vocab, resumenes, dia: diaDoc, tipo, sesion };
  }

  try { await cargar(); }
  catch (e) { caja.innerHTML = `<div class="aviso error">${esc(e.code || e.message)}</div>`; return; }

  // ---------- Vista general ----------
  function vistaGeneral() {
    const { sesion, dia, tipo } = datos;
    const hechos = dia.pasos || {};

    if (tipo === "descanso" && !dia.tipoForzado) {
      caja.innerHTML = `
        <h1>${t("sec.hoy")}</h1>
        <div class="tarjeta destacada centro">
          <div class="logo-grande">😌</div>
          <h2>${t("dia.descanso")}</h2>
          <p>${t("hoy.descansoTexto")}</p>
        </div>
        <button class="boton secundario ancho" id="forzar">${t("hoy.estudiarIgual")}</button>`;
      caja.querySelector("#forzar").onclick = async () => {
        await prog.marcarDia(uid, { tipoForzado: "completo" });
        await cargar(); vistaGeneral();
      };
      return;
    }

    const pasosHTML = sesion.pasos.map((p, k) => `
      <li class="paso ${hechos[p.id] ? "hecho" : ""}">
        <span class="icono">${hechos[p.id] ? "✓" : ICONOS[p.id]}</span>
        <div><b>${k + 1}. ${t("paso." + p.id)}</b><small>${p.min} min${p.id === "warmup" ? " · " + t("hoy.tarjetas", { n: p.tarjetas.length }) : ""}</small></div>
      </li>`).join("");

    const siguiente = sesion.pasos.find(p => !hechos[p.id]);
    const leccion = sesion.leccionId ? obtener(datos.contenido, sesion.leccionId) : null;
    const debiles = sesion.debilidades.slice(0, 3);

    caja.innerHTML = `
      <h1>${t("sec.hoy")}</h1>
      <p class="suave">${t("dia." + tipo)}${leccion ? ` · ${esc(idiomaActual() === "es" && leccion.tituloES ? leccion.tituloES : leccion.titulo)}` : ""}</p>
      ${sesion.refuerzo ? `<div class="aviso">💪 ${t("hoy.modoRefuerzo")}: ${sesion.refuerzo.map(nombreHab).join(", ")}</div>` : ""}
      ${debiles.length ? `<div class="tarjeta pareja"><div class="etiqueta">🎯 ${t("hoy.reforzamos")}</div>
        ${debiles.map(d => `<span class="chip">${esc(nombreEtiqueta(d.etiqueta))}</span>`).join(" ")}</div>` : ""}
      ${!leccion && tipo === "completo" ? `<div class="aviso">${t("hoy.sinLecciones")}</div>` : ""}
      <ul class="pasos">${pasosHTML}</ul>
      ${siguiente ? `<button class="boton ancho" id="seguir">${Object.keys(hechos).length ? t("continuar") : t("inicio.empezar")} → ${t("paso." + siguiente.id)}</button>` : ""}
      <div id="final"></div>`;

    if (siguiente) caja.querySelector("#seguir").onclick = () => ejecutarPaso(siguiente);
    else mostrarFinal();
  }

  // ---------- Pantalla de una actividad ----------
  function marco(paso, indice, total) {
    caja.innerHTML = `
      <div class="fila entre">
        <span class="suave pequeno">${indice ? `${t("paso")} ${indice}/${total} · ` : ""}${ICONOS[paso.id]} ${t("paso." + paso.id)}</span>
        <button class="boton-x" id="salir" aria-label="${t("salir")}">✕</button>
      </div>
      <div id="actividad" style="margin-top:12px"></div>`;
    caja.querySelector("#salir").onclick = () => { speechSynthesis?.cancel?.(); vistaGeneral(); };
    return caja.querySelector("#actividad");
  }

  async function ejecutarPaso(paso) {
    const { sesion, contenido } = datos;
    const indice = sesion.pasos.indexOf(paso) + 1;
    const act = marco(paso, indice, sesion.pasos.length);
    const cambios = { pasos: { [paso.id]: true }, tipo: datos.tipo };
    if (sesion.leccionId) cambios.leccionId = sesion.leccionId;

    try {
      if (paso.id === "warmup") {
        const estados = paso.tarjetas.map(id => datos.vocab[id]).filter(Boolean);
        if (estados.length) {
          await ejecutarRepaso(act, estados, contenido, perfil, e => prog.guardarTarjeta(uid, e));
        } else {
          await pantallaSimple(act, `<p>${t("hoy.sinRepasos")}</p>`);
        }
      } else if (paso.id === "leccion") {
        const l = obtener(contenido, paso.leccionId);
        await pantallaSimple(act, htmlLeccion(l, perfil), r => montarLeccion(r, l, perfil));
      } else if (paso.id === "vocab") {
        const nuevas = await ejecutarPresentacion(act, paso.vocabIds, contenido, perfil, datos.vocab);
        await prog.guardarTarjetas(uid, nuevas);
      } else if (paso.id === "quiz") {
        const res = await ejecutarQuiz(act, paso.preguntas, perfil, hoy);
        await prog.registrarRespuestas(uid, aRespuestas(res));
        const bien = res.filter(r => r.correcto).length;
        await prog.guardarResultado(uid, { tipo: "quiz", quizId: paso.quizId, bien, total: res.length, origen: "sesion" });
        // Las correcciones se guardan y se muestran al FINAL de la sesión
        cambios.quiz = { bien, total: res.length };
        cambios.correcciones = res.filter(r => !r.correcto)
          .map(r => ({ quizId: r.p.quizId, idx: r.p.idx, respuesta: r.respuesta ?? null }));
      } else if (paso.id === "evaluacion") {
        const ctx = await contextoEvaluacion(perfil, sesion.leccionId);
        const doc = await ejecutarEvaluacionSemanal(act, perfil, ctx);
        cambios.evaluacion = { bien: doc.bien, total: doc.total, mensual: doc.mensual };
      } else if (paso.id === "speaking") {
        const sp = obtener(contenido, paso.speakingId);
        const r = await ejecutarSpeaking(act, sp, perfil);
        await prog.registrarRespuestas(uid, speakingARespuestas(r));
        cambios.speaking = r;
      } else if (paso.id === "shadowing") {
        if (paso.frases.length) {
          const notas = await ejecutarShadowing(act, paso.frases, perfil, "ligero");
          await prog.registrarRespuestas(uid, shadowingARespuestas(notas));
        } else {
          await pantallaSimple(act, `<p>${t("hoy.sinFrases")}</p>`);
        }
      }
      await prog.marcarDia(uid, cambios);
    } catch (e) {
      console.error(e);
      toast("Error: " + (e.code || e.message));
    }
    await cargar();
    vistaGeneral();
  }

  // Pantalla con contenido + botón "Continuar"
  function pantallaSimple(act, html, alMontar) {
    return new Promise(resolve => {
      act.innerHTML = `${html}<button class="boton ancho" id="ok" style="margin-top:12px">${t("continuar")}</button>`;
      alMontar?.(act);
      act.querySelector("#ok").onclick = () => { speechSynthesis?.cancel?.(); resolve(); };
    });
  }

  // ---------- Final de la sesión ----------
  async function mostrarFinal() {
    const { dia, sesion, contenido } = datos;
    const final = caja.querySelector("#final");

    // Primera vez que se termina hoy: marcar día, completar elementos, racha
    if (!dia.completado) {
      try {
        await prog.marcarDia(uid, { completado: true, tipo: datos.tipo, terminado: new Date().toISOString() });
        if (sesion.leccionId) {
          const l = obtener(contenido, sesion.leccionId);
          await prog.marcarCompletado(uid, l.id, { tipo: "leccion" });
          if (l.quiz) await prog.marcarCompletado(uid, l.quiz, { tipo: "quiz", bien: dia.quiz?.bien, total: dia.quiz?.total });
          if (l.speaking) await prog.marcarCompletado(uid, l.speaking, { tipo: "speaking" });
        }
        await prog.actualizarRacha(perfil);
        datos.dia.completado = true;
      } catch (e) { console.error(e); toast("Error: " + (e.code || e.message)); }
    }

    // Reconstruir las correcciones a partir de lo guardado
    const resultados = (dia.correcciones || []).map(c => {
      const q = obtener(contenido, c.quizId);
      const p = q?.preguntas?.[c.idx];
      return p ? { p: { ...p, habilidad: p.habilidad || q.habilidad }, respuesta: c.respuesta, correcto: false } : null;
    }).filter(Boolean);
    const totalQuiz = dia.quiz?.total || resultados.length;
    const relleno = Array.from({ length: Math.max(0, totalQuiz - resultados.length) }, () => ({ p: {}, correcto: true }));

    const sp = dia.speaking;
    const consejoSpeaking = sp ? [
      sp.fluidez === 1 ? `<li>${t("final.consejoFluidez")}</li>` : "",
      sp.expresionesTotal && sp.expresionesUsadas?.length < sp.expresionesTotal ? `<li>${t("final.consejoExpresiones")}</li>` : "",
    ].join("") : "";

    final.innerHTML = `
      <div class="tarjeta destacada centro">
        <div class="logo-grande">🎉</div>
        <h2>${t("final.titulo")}</h2>
        <p>🔥 ${t("final.racha", { n: perfil.racha?.actual ?? 0 })}</p>
      </div>
      ${totalQuiz ? `<div class="tarjeta">${htmlCorrecciones([...relleno, ...resultados], perfil)}</div>` : ""}
      ${dia.evaluacion ? `<a class="tarjeta fila entre" href="#/evaluaciones?ver=semanal" style="text-decoration:none;color:inherit">
        <b>📝 ${t("paso.evaluacion")}: ${dia.evaluacion.bien}/${dia.evaluacion.total}</b><span>→</span></a>` : ""}
      ${consejoSpeaking ? `<div class="tarjeta"><div class="etiqueta">🎙️ Speaking</div><ul>${consejoSpeaking}</ul></div>` : ""}
      ${sesion.bloques.length ? `<h3>${t("final.bloques")}</h3>
        <div class="menu-grid">${sesion.bloques.map(b => `
          <a href="#" data-bloque="${b.id}" class="${dia.bloques?.[b.id] ? "hecho" : ""}">
            <span class="icono">${dia.bloques?.[b.id] ? "✓" : ICONOS[b.id]}</span>${t("bloque." + b.id)}
            <small>+${b.min} min${b.fase ? " · " + t("pendiente.texto", { fase: b.fase }) : ""}</small></a>`).join("")}
        </div>` : ""}`;

    final.querySelectorAll("[data-bloque]").forEach(a => a.onclick = async ev => {
      ev.preventDefault();
      const b = sesion.bloques.find(x => x.id === a.dataset.bloque);
      if (b.fase) { toast(t("pendiente.texto", { fase: b.fase })); return; }
      if (b.id === "shadowing") {
        const act = marco({ id: "shadowing" });
        const notas = await ejecutarShadowing(act, b.frases, perfil, "profundo");
        await prog.registrarRespuestas(uid, shadowingARespuestas(notas));
        await prog.marcarDia(uid, { bloques: { shadowing: true } });
        await cargar(); vistaGeneral();
      }
    });
  }

  vistaGeneral();
}

