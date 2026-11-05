// =========================================================
// COMPONENTES DE EVALUACIÓN
//  - ejecutarDiagnostico: diagnóstico adaptativo (15–20 min)
//  - panelPrompt: prompt listo para copiar a Claude
//  - formularioSpeaking: captura de resultados de Claude
//  - rubricaSpeaking: alternativa sin Claude (auto/mutua)
//  - ejecutarEvaluacionSemanal: evaluación de 8 min (+ mensual)
//  - htmlResultadoEvaluacion / htmlReporte / textoReporte
// =========================================================
import { tx, traduccionHTML } from "../i18n.js";
import { esc, toast, nombreEtiqueta } from "./componentes.js";
import { hablar } from "./voz.js";
import { ejecutarQuiz, esCorrecta, htmlCorrecciones } from "./ejercicios.js";
import { ejecutarSpeaking } from "./speaking.js";
import { mezclar } from "../motor/sesion.js";
import * as diag from "../motor/diagnostico.js";
import { armarEvaluacion, puntajes, leerResultadoClaude, esSemanaMensual } from "../motor/evaluacion.js";
import { desdeRango, rango, base, NIVELES, HABILIDADES, nivelDe } from "../motor/niveles.js";
import { debilidades } from "../motor/debilidades.js";
import * as datosEval from "../datos/evaluaciones.js";
import * as prog from "../datos/progreso.js";

export const NOMBRE_HAB = {
  speaking: ["Speaking", "Speaking"], listening: ["Listening", "Listening"],
  vocabulario: ["Vocabulario", "Vocabulary"], gramatica: ["Gramática", "Grammar"],
  lectura: ["Lectura", "Reading"], escritura: ["Escritura", "Writing"],
};
export const nombreHab = h => tx(...(NOMBRE_HAB[h] || [h, h]));

// Lista de todos los subniveles para los selectores: A0, A1.1 … C2.3
export const TODOS_NIVELES = ["A0", ...NIVELES.flatMap(n => [1, 2, 3].map(s => `${n}.${s}`))];

// ---------------------------------------------------------
// DIAGNÓSTICO ADAPTATIVO
// ---------------------------------------------------------
export async function ejecutarDiagnostico(caja, perfil) {
  const banco = await (await fetch("contenido/diagnostico.json")).json();
  const CLAVE = `te-diagnostico-${perfil.uid}`;
  let estado;
  try { estado = JSON.parse(localStorage.getItem(CLAVE)) || null; } catch { estado = null; }
  const guardarAvance = () => { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* ignorar */ } };

  return new Promise(resolve => {
    function intro() {
      const reanudar = estado && !estado.terminado && estado.respuestas.length;
      caja.innerHTML = `
        <div class="tarjeta destacada">
          <h2>${tx("Diagnóstico inicial", "Placement test")}</h2>
          <p>${tx("Unos 15–20 minutos. Tiene 4 partes: vocabulario, gramática, lectura y listening.",
                  "About 15–20 minutes. 4 parts: vocabulary, grammar, reading and listening.")}</p>
          <ul>
            <li>${tx("Empieza fácil y sube mientras aciertes. Cuando se ponga difícil, esa parte termina sola.", "It starts easy and gets harder while you answer correctly. When it gets too hard, that part ends.")}</li>
            <li>${tx("No adivines: si no sabes, toca «No lo sé». Así el resultado es real.", "Don't guess: if you don't know, tap \"I don't know\". That keeps the result accurate.")}</li>
            <li>${tx("No verás si acertaste hasta el final.", "You won't see answers until the end.")}</li>
            <li>${tx("El speaking se evalúa aparte, con Claude o con la rúbrica.", "Speaking is assessed separately, with Claude or the rubric.")}</li>
          </ul>
        </div>
        <button class="boton ancho" id="empezar">${reanudar ? tx("Continuar donde me quedé", "Continue where I left off") : tx("Empezar", "Start")}</button>
        ${reanudar ? `<button class="boton secundario ancho" id="reiniciar" style="margin-top:8px">${tx("Empezar de cero", "Start over")}</button>` : ""}`;
      caja.querySelector("#empezar").onclick = () => {
        if (!reanudar) { estado = diag.estadoInicial(); guardarAvance(); }
        pregunta();
      };
      caja.querySelector("#reiniciar")?.addEventListener("click", () => { estado = diag.estadoInicial(); guardarAvance(); pregunta(); });
    }

    let ultimaHab = null;
    function pregunta() {
      const p = diag.siguientePregunta(estado, banco.preguntas);
      if (!p) { fin(); return; }
      const hab = estado.habilidades[estado.h];
      // Pantalla de transición entre partes
      if (ultimaHab && ultimaHab !== hab) {
        ultimaHab = hab;
        caja.innerHTML = `<div class="tarjeta centro"><p class="suave">${tx("Parte", "Part")} ${estado.h + 1} / 4</p>
          <h2>${nombreHab(hab)}</h2>
          <p>${hab === "listening" ? tx("Escucha con atención. Puedes oír cada audio hasta 2 veces.", "Listen carefully. You can play each audio up to 2 times.")
              : hab === "lectura" ? tx("Lee el texto y responde.", "Read the text and answer.") : ""}</p></div>
          <button class="boton ancho" id="ok">${tx("Continuar", "Continue")}</button>`;
        caja.querySelector("#ok").onclick = pregunta;
        return;
      }
      ultimaHab = hab;

      let elegida = null;
      let reproducciones = 0;
      const opciones = mezclar(p.opciones, p.id);
      const pasaje = p.pasaje ? banco.pasajes[p.pasaje] : null;
      caja.innerHTML = `
        <div class="progreso-quiz"><span style="width:${diag.progreso(estado) * 100}%"></span></div>
        <p class="suave pequeno">${tx("Parte", "Part")} ${estado.h + 1}/4 · ${nombreHab(hab)}</p>
        ${pasaje ? `<div class="tarjeta pasaje">${esc(pasaje)}</div>` : ""}
        ${p.formato === "escuchar" ? `<div class="centro"><button class="boton secundario" id="oir">🔊 ${tx("Escuchar", "Listen")} (2)</button></div>` : ""}
        <h3>${esc(p.enunciado)}</h3>
        ${traduccionHTML(p.enunciadoES, perfil, esc)}
        <div class="opciones">${opciones.map(o => `<button class="opcion" data-v="${esc(o)}">${esc(o)}</button>`).join("")}
          <button class="opcion nose" data-v="">🤷 ${tx("No lo sé", "I don't know")}</button></div>
        <button class="boton ancho" id="sig" disabled>${tx("Siguiente", "Next")}</button>`;

      const oir = caja.querySelector("#oir");
      if (oir) {
        const reproducir = () => {
          if (reproducciones >= 2) return;
          reproducciones++;
          oir.textContent = `🔊 ${tx("Escuchar", "Listen")} (${2 - reproducciones})`;
          if (reproducciones >= 2) oir.disabled = true;
          hablar(p.audioTexto, { ...perfil.ajustes, velocidadVoz: p.velocidad || 1 });
        };
        oir.onclick = reproducir;
        reproducir();
      }
      caja.querySelectorAll(".opcion").forEach(b => b.onclick = () => {
        caja.querySelectorAll(".opcion").forEach(x => x.classList.remove("elegida"));
        b.classList.add("elegida");
        elegida = b.dataset.v;
        caja.querySelector("#sig").disabled = false;
      });
      caja.querySelector("#sig").onclick = () => {
        speechSynthesis?.cancel?.();
        estado = diag.responder(estado, p, elegida !== "" && esCorrecta(p, elegida), banco.preguntas);
        guardarAvance();
        pregunta();
      };
    }

    function fin() {
      const res = diag.resultado(estado);
      try { localStorage.removeItem(CLAVE); } catch { /* ignorar */ }
      resolve({ resultados: res, respuestas: estado.respuestas });
    }

    intro();
  });
}

// ---------------------------------------------------------
// PROMPT PARA CLAUDE (diagnóstico o mensual)
// ---------------------------------------------------------
export async function textoPrompt(tipo, perfil, extra = {}) {
  const archivo = tipo === "mensual" ? "evaluacion-mensual-speaking.md" : "diagnostico-speaking.md";
  let texto = await (await fetch("prompts/" + archivo)).text();
  const niveles = HABILIDADES.filter(h => h !== "speaking" && perfil.niveles?.[h])
    .map(h => `${NOMBRE_HAB[h][0]} ${perfil.niveles[h]}`).join(", ") || "sin diagnóstico todavía";
  const errores = [...(perfil.erroresSpeaking || []), ...(extra.debilidades || [])].slice(0, 8).join("; ") || "ninguno registrado aún";
  const ayuda = perfil.rol === "B" && rango(perfil.niveles?.speaking || perfil.nivelGeneral || "A0") < rango("A2.1")
    ? "Si no entiendo una pregunta, puedes repetirla más despacio o darme una pista muy corta en español, pero vuelve al inglés enseguida."
    : "No uses español en ningún momento.";
  const reemplazos = {
    NOMBRE: perfil.nombre, RUTA: perfil.rol === "A" ? "A (nivel aproximado A2, estudiante de Medicina)" : "B (principiante, empezando desde cero)",
    NIVELES: niveles, ERRORES: errores, AYUDA_ES: ayuda, SEMANA: extra.semana ?? "",
    NIVEL_SPEAKING: perfil.niveles?.speaking || nivelDe(perfil, "speaking"), TEMAS: extra.temas || "presentaciones y vida diaria",
  };
  for (const [k, v] of Object.entries(reemplazos)) texto = texto.replaceAll(`{{${k}}}`, v);
  return texto;
}

export async function htmlPanelPrompt(tipo, perfil, extra) {
  const texto = await textoPrompt(tipo, perfil, extra);
  return `
    <div class="tarjeta">
      <div class="etiqueta">1. ${tx("Copia el prompt", "Copy the prompt")}</div>
      <textarea class="prompt" readonly rows="8">${esc(texto)}</textarea>
      <button class="boton ancho" data-copiar>📋 ${tx("Copiar prompt", "Copy prompt")}</button>
    </div>
    <div class="tarjeta">
      <div class="etiqueta">2. ${tx("Habla con Claude", "Talk to Claude")}</div>
      <ol class="pequeno">
        <li>${tx("Abre la app de Claude (gratis sirve) y empieza un chat nuevo.", "Open the Claude app (free works) and start a new chat.")}</li>
        <li>${tx("Pega el prompt y envíalo.", "Paste the prompt and send it.")}</li>
        <li>${tx("Si tu app de Claude tiene modo de voz, úsalo para responder hablando. Si no, responde con el dictado por voz del teclado (el micrófono del teclado) — no escribas, ¡habla!", "If your Claude app has voice mode, use it to answer out loud. If not, answer with your keyboard's voice dictation (the keyboard mic) — don't type, speak!")}</li>
        <li>${tx("Al final, Claude te dará un bloque que empieza con «NIVEL:». Cópialo.", "At the end, Claude gives you a block starting with \"NIVEL:\". Copy it.")}</li>
      </ol>
    </div>`;
}

export function montarCopiar(raiz) {
  raiz.querySelectorAll("[data-copiar]").forEach(b => b.onclick = async () => {
    const area = b.parentElement.querySelector("textarea");
    try { await navigator.clipboard.writeText(area.value); toast(tx("Copiado ✓", "Copied ✓")); }
    catch { area.select(); document.execCommand?.("copy"); toast(tx("Selecciona el texto y cópialo", "Select the text and copy it")); }
  });
}

// ---------------------------------------------------------
// FORMULARIO: captura de resultados de speaking
// Devuelve el resultado o null si se cancela.
// ---------------------------------------------------------
export function formularioSpeaking(caja, perfil, { mensual = false, titulo = "" } = {}) {
  return new Promise(resolve => {
    caja.insertAdjacentHTML("beforeend", `
      <div class="tarjeta" id="form-speaking">
        <div class="etiqueta">3. ${titulo || tx("Guarda tu resultado", "Save your result")}</div>
        <label for="pegado">${tx("Pega aquí el bloque de Claude", "Paste Claude's block here")}</label>
        <textarea id="pegado" rows="6" placeholder="NIVEL: …&#10;FLUIDEZ: …"></textarea>
        <button class="boton secundario ancho" id="leer" style="margin-top:8px">${tx("Leer bloque", "Read block")}</button>
        <label for="nivel">${tx("Nivel de speaking", "Speaking level")}</label>
        <select id="nivel"><option value="">—</option>${TODOS_NIVELES.map(n => `<option>${n}</option>`).join("")}</select>
        <div class="fila"><div style="flex:1"><label for="fluidez">${tx("Fluidez (1–5)", "Fluency (1–5)")}</label>
          <select id="fluidez"><option value="">—</option>${[1, 2, 3, 4, 5].map(n => `<option>${n}</option>`).join("")}</select></div>
          <div style="flex:1"><label for="pron">${tx("Pronunciación (1–5)", "Pronunciation (1–5)")}</label>
          <select id="pron"><option value="">—</option>${[1, 2, 3, 4, 5].map(n => `<option>${n}</option>`).join("")}</select></div></div>
        ${mensual ? `<label class="check"><input type="checkbox" id="aprueba"> ${tx("Claude dice que APRUEBO mi nivel actual", "Claude says I PASS my current level")}</label>` : ""}
        <label for="errores">${tx("Errores frecuentes (uno por línea)", "Frequent mistakes (one per line)")}</label>
        <textarea id="errores" rows="4"></textarea>
        <label for="recs">${tx("Recomendaciones (una por línea)", "Recommendations (one per line)")}</label>
        <textarea id="recs" rows="3"></textarea>
        <button class="boton ancho" id="guardar-sp" style="margin-top:12px">${tx("Guardar resultado", "Save result")}</button>
        <button class="boton secundario ancho" id="usar-rubrica" style="margin-top:8px">${tx("No tengo acceso a Claude → usar rúbrica", "No access to Claude → use the rubric")}</button>
      </div>`);
    const f = caja.querySelector("#form-speaking");
    const $ = s => f.querySelector(s);
    let extra = { fortalezas: [] };

    $("#leer").onclick = () => {
      const r = leerResultadoClaude($("#pegado").value);
      if (!r.nivel && !r.fluidez) { toast(tx("No encontré «NIVEL:» en el texto", "Couldn't find \"NIVEL:\" in the text")); return; }
      if (r.nivel) $("#nivel").value = r.nivel;
      if (r.fluidez) $("#fluidez").value = r.fluidez;
      if (r.pronunciacion) $("#pron").value = r.pronunciacion;
      if (mensual && r.aprueba != null) $("#aprueba").checked = r.aprueba;
      $("#errores").value = r.errores.join("\n");
      $("#recs").value = r.recomendaciones.join("\n");
      extra = { fortalezas: r.fortalezas };
      toast(tx("Datos leídos ✓ Revísalos y guarda", "Read ✓ Check and save"));
    };
    $("#guardar-sp").onclick = () => {
      const nivel = $("#nivel").value;
      if (!nivel) { toast(tx("Elige el nivel de speaking", "Choose the speaking level")); return; }
      const lineas = id => $(id).value.split("\n").map(s => s.trim()).filter(Boolean);
      resolve({
        nivel, fluidez: Number($("#fluidez").value) || null, pronunciacion: Number($("#pron").value) || null,
        aprueba: mensual ? $("#aprueba").checked : null,
        errores: lineas("#errores"), recomendaciones: lineas("#recs"), fortalezas: extra.fortalezas,
        fuente: "claude", evaluador: "Claude",
      });
    };
    $("#usar-rubrica").onclick = async () => {
      const r = await rubricaSpeaking(caja, perfil);
      resolve(r);
    };
  });
}

// ---------------------------------------------------------
// RÚBRICA ALTERNATIVA (sin Claude): autoevaluación o evaluación
// de la pareja. 5 criterios × 5 descriptores (A1–C1).
// ---------------------------------------------------------
const RUBRICA = [
  { id: "fluidez", es: "Fluidez", en: "Fluency", d: [
    ["Frases sueltas memorizadas; muchas pausas.", "Isolated memorized phrases; many pauses."],
    ["Frases cortas sobre temas conocidos; pausas frecuentes.", "Short phrases on familiar topics; frequent pauses."],
    ["Mantiene una conversación sencilla; pausas para buscar palabras.", "Keeps a simple conversation going; pauses to find words."],
    ["Ritmo bastante regular; pocas pausas largas.", "Fairly even pace; few long pauses."],
    ["Fluido y espontáneo, casi sin esfuerzo.", "Fluent and spontaneous, almost effortless."]] },
  { id: "vocabulario", es: "Vocabulario", en: "Vocabulary", d: [
    ["Palabras básicas (saludos, familia, números).", "Basic words (greetings, family, numbers)."],
    ["Vocabulario de rutina y necesidades simples.", "Vocabulary for routines and simple needs."],
    ["Suficiente para temas cotidianos, usando rodeos.", "Enough for everyday topics, using workarounds."],
    ["Amplio; varía expresiones y evita repetir.", "Wide; varies expressions and avoids repetition."],
    ["Amplio y preciso, con expresiones idiomáticas.", "Wide and precise, with idiomatic expressions."]] },
  { id: "gramatica", es: "Gramática", en: "Grammar", d: [
    ["Estructuras muy simples, con muchos errores.", "Very simple structures, many errors."],
    ["Estructuras simples; errores sistemáticos.", "Simple structures; systematic errors."],
    ["Correcto en lo habitual; falla en estructuras complejas.", "Accurate in common structures; errors in complex ones."],
    ["Buen control; los errores no causan malentendidos.", "Good control; errors don't cause misunderstanding."],
    ["Alto grado de corrección constante.", "Consistently high accuracy."]] },
  { id: "pronunciacion", es: "Pronunciación", en: "Pronunciation", d: [
    ["Cuesta entenderlo/a sin esfuerzo.", "Hard to understand without effort."],
    ["Se entiende, con acento marcado.", "Understandable, with a strong accent."],
    ["Clara en general, aunque con acento.", "Generally clear, though accented."],
    ["Clara y natural; entonación adecuada.", "Clear and natural; appropriate intonation."],
    ["Usa la entonación para expresar matices.", "Uses intonation to express nuance."]] },
  { id: "interaccion", es: "Interacción", en: "Interaction", d: [
    ["Responde preguntas muy simples con ayuda.", "Answers very simple questions with help."],
    ["Responde y hace preguntas simples.", "Answers and asks simple questions."],
    ["Inicia, mantiene y cierra conversaciones simples.", "Starts, maintains and closes simple conversations."],
    ["Interactúa con naturalidad, también con nativos.", "Interacts naturally, also with native speakers."],
    ["Maneja turnos y matices con facilidad.", "Handles turn-taking and nuance with ease."]] },
];

export function rubricaSpeaking(caja, perfil) {
  return new Promise(resolve => {
    caja.innerHTML = `
      <h2>${tx("Rúbrica de speaking", "Speaking rubric")}</h2>
      <p class="suave">${tx("Conversa 5–10 minutos en inglés (con tu pareja o grabándote). Luego elige, en cada criterio, la descripción que mejor encaja.",
                            "Talk for 5–10 minutes in English (with your partner or recording yourself). Then choose the description that fits best for each criterion.")}</p>
      <label for="evaluador">${tx("¿Quién evalúa?", "Who is assessing?")}</label>
      <select id="evaluador"><option value="yo">${tx("Yo mismo/a (autoevaluación)", "Myself (self-assessment)")}</option>
        <option value="pareja">${tx("Mi pareja", "My partner")}</option></select>
      ${RUBRICA.map(c => `
        <div class="tarjeta"><div class="etiqueta">${tx(c.es, c.en)}</div>
          <div class="opciones">${c.d.map((d, i) => `<button class="opcion" data-c="${c.id}" data-i="${i}">${tx(d[0], d[1])}</button>`).join("")}</div>
        </div>`).join("")}
      <button class="boton ancho" id="fin-rub" disabled>${tx("Calcular nivel", "Calculate level")}</button>`;
    const elegidas = {};
    caja.querySelectorAll("[data-c]").forEach(b => b.onclick = () => {
      caja.querySelectorAll(`[data-c="${b.dataset.c}"]`).forEach(x => x.classList.remove("elegida"));
      b.classList.add("elegida");
      elegidas[b.dataset.c] = Number(b.dataset.i);
      caja.querySelector("#fin-rub").disabled = Object.keys(elegidas).length < RUBRICA.length;
    });
    caja.querySelector("#fin-rub").onclick = () => {
      // Cada descriptor equivale al subnivel medio de su nivel (A1.2, A2.2 …)
      const media = Object.values(elegidas).reduce((s, i) => s + (i * 3 + 2), 0) / RUBRICA.length;
      const nivel = desdeRango(media);
      const debiles = RUBRICA.filter(c => elegidas[c.id] === Math.min(...Object.values(elegidas))).map(c => tx(c.es, c.en));
      resolve({
        nivel, fluidez: elegidas.fluidez + 1, pronunciacion: elegidas.pronunciacion + 1, aprueba: null,
        errores: debiles.map(d => tx(`Reforzar: ${d}`, `Work on: ${d}`)), recomendaciones: [], fortalezas: [],
        fuente: "rubrica", evaluador: caja.querySelector("#evaluador").value, detalle: elegidas,
      });
    };
  });
}

// ---------------------------------------------------------
// EVALUACIÓN SEMANAL (y mensual cada 4.ª semana)
// ctx = { contenido, completados, leccionHoy, hoy, semana }
// ---------------------------------------------------------
export async function ejecutarEvaluacionSemanal(caja, perfil, ctx) {
  const mensual = esSemanaMensual(ctx.semana);
  const nivelesAntes = { ...(perfil.niveles || {}) };   // para el reporte (antes de cualquier cambio)
  const { preguntas, speaking } = armarEvaluacion({
    contenido: ctx.contenido, rol: perfil.rol, completados: ctx.completados, hoy: ctx.hoy, leccionHoy: ctx.leccionHoy,
  });

  // 1. Introducción
  await new Promise(res => {
    caja.innerHTML = `
      <div class="tarjeta destacada">
        <h2>${mensual ? tx("Evaluación mensual", "Monthly assessment") : tx("Evaluación semanal", "Weekly assessment")}</h2>
        <p>${tx(`${preguntas.length} preguntas + 1 pregunta de speaking · unos 8 minutos.`, `${preguntas.length} questions + 1 speaking question · about 8 minutes.`)}
        ${mensual ? tx(" Al final: 5 minutos de conversación con Claude.", " At the end: a 5-minute conversation with Claude.") : ""}</p>
        <p class="pequeno">${tx("Incluye lo de esta semana y repaso de semanas anteriores. Verás los resultados al final.",
                                "Covers this week plus review of earlier weeks. You'll see results at the end.")}</p>
        ${mensual ? `<p class="pequeno"><b>${tx("Solo en la evaluación mensual se puede subir de nivel MCER completo (ej. A2 → B1), y requiere aprobar el speaking.",
                                              "Only the monthly assessment can move you up a full CEFR level (e.g. A2 → B1), and it requires passing speaking.")}</b></p>` : ""}
      </div>
      <button class="boton ancho" id="ok">${tx("Empezar", "Start")}</button>`;
    caja.querySelector("#ok").onclick = res;
  });

  // 2. Preguntas (sin retroalimentación durante)
  const resultados = preguntas.length ? await ejecutarQuiz(caja, preguntas, perfil, ctx.hoy + "eval") : [];
  await prog.registrarRespuestas(perfil.uid, resultados.map(r => ({ etiqueta: r.p.etiquetaError, habilidad: r.p.habilidad, correcto: r.correcto })));

  // 3. Speaking (una pregunta + rúbrica breve)
  let rubrica = null;
  if (speaking?.pregunta) {
    rubrica = await ejecutarSpeaking(caja, {
      id: `eval-${ctx.hoy}`, preguntas: [speaking.pregunta], expresionesObjetivo: speaking.expresiones, duracionSeg: 90,
      instruccion: "Answer the question out loud for about 1 minute.", instruccionES: "Responde la pregunta en voz alta durante 1 minuto aprox.",
    }, perfil);
  }

  // 4. Mensual: conversación con Claude
  let speakingNivel = null, claude = null;
  if (mensual) {
    const temas = [...new Set(ctx.leccionesMes || [])].join(", ");
    const debs = debilidades(await prog.errores(perfil.uid), 5).map(d => nombreEtiqueta(d.etiqueta));
    caja.innerHTML = `<h2>${tx("Conversación con Claude (5 min)", "Conversation with Claude (5 min)")}</h2>
      ${await htmlPanelPrompt("mensual", perfil, { semana: ctx.semana, temas, debilidades: debs })}`;
    montarCopiar(caja);
    claude = await formularioSpeaking(caja, perfil, { mensual: true });
    // Nivel de speaking para la regla de subida. Si Claude dice "APRUEBA: SÍ",
    // el speaking cuenta como sólido en su nivel (X.3).
    speakingNivel = claude.nivel;
    if (claude.fuente === "claude" && claude.aprueba && claude.nivel !== "A0") {
      const tope = `${base(claude.nivel)}.3`;
      if (rango(tope) > rango(speakingNivel)) speakingNivel = tope;
    }
    await datosEval.guardarSpeaking(perfil, { ...claude, tipo: "mensual" });
  }

  // 5. Puntajes, reglas de nivel y guardado
  const pts = puntajes(resultados, rubrica);
  const doc = await datosEval.guardarEvaluacion(perfil, {
    puntajes: pts, mensual, speakingNivel,
    detalle: { nivelesAntes, total: resultados.length, bien: resultados.filter(r => r.correcto).length,
               errores: resultados.filter(r => !r.correcto).map(r => ({ quizId: r.p.quizId || null, idx: r.p.idx ?? null, generada: !!r.p.generada, enunciado: r.p.enunciado, respuesta: String(r.respuesta ?? ""), correcta: String(Array.isArray(r.p.respuesta) ? r.p.respuesta[0] : r.p.respuesta) })) },
  });

  // 6. Resultados
  await new Promise(res => {
    caja.innerHTML = `${htmlResultadoEvaluacion(doc)}
      ${resultados.length ? `<div class="tarjeta">${htmlCorrecciones(resultados, perfil)}</div>` : ""}
      ${mensual ? `<p class="centro"><a href="#/evaluaciones?ver=reportes">📊 ${tx("Ver reporte de evolución", "See progress report")}</a></p>` : ""}
      <button class="boton ancho" id="ok">${tx("Continuar", "Continue")}</button>`;
    caja.querySelector("#ok").onclick = res;
  });
  return doc;
}

// Resultado de una evaluación: barras por habilidad + cambios de nivel
export function htmlResultadoEvaluacion(doc) {
  const barras = Object.entries(doc.puntajes || {}).filter(([, v]) => v != null).map(([h, v]) => {
    const pct = Math.round(v * 100);
    const color = pct >= 80 ? "var(--exito)" : pct < 60 ? "var(--error)" : "var(--aviso)";
    return `<div class="barra-hab"><div class="fila entre"><span>${nombreHab(h)}</span><b>${pct}%</b></div>
      <div class="barra"><span style="width:${pct}%;background:${color}"></span></div></div>`;
  }).join("");
  const cambios = (doc.cambios || []).map(c => `<li>${c.tipo === "listo"
    ? tx(`🔓 ${nombreHab(c.habilidad)}: listo para subir a ${c.a} en la evaluación mensual.`, `🔓 ${nombreHab(c.habilidad)}: ready for ${c.a} at the monthly assessment.`)
    : tx(`⬆️ ${nombreHab(c.habilidad)}: ${c.de} → <b>${c.a}</b>`, `⬆️ ${nombreHab(c.habilidad)}: ${c.de} → <b>${c.a}</b>`)}</li>`).join("");
  return `
    <div class="tarjeta destacada centro"><div class="logo-grande">📝</div>
      <h2>${doc.mensual ? tx("Evaluación mensual", "Monthly assessment") : tx("Evaluación semanal", "Weekly assessment")}</h2>
      <p class="suave">${tx("Semana", "Week")} ${doc.semana} · ${doc.bien ?? "–"}/${doc.total ?? "–"}</p></div>
    <div class="tarjeta">${barras}
      <p class="suave pequeno" style="margin-top:8px">${tx("≥ 80 % dos semanas seguidas = subes de subnivel. < 60 % dos veces = semana de refuerzo (nunca bajas de nivel).",
                                                             "≥ 80% two weeks in a row = next sublevel. < 60% twice = reinforcement week (you never go down).")}</p></div>
    ${cambios ? `<div class="tarjeta"><ul class="lista-cambios">${cambios}</ul></div>` : ""}
    ${doc.refuerzo?.length ? `<div class="aviso">${tx(`La próxima semana será de refuerzo en: ${doc.refuerzo.map(nombreHab).join(", ")}. Habrá más repaso de tus debilidades.`,
                                                    `Next week is a reinforcement week for: ${doc.refuerzo.map(nombreHab).join(", ")}. More review of your weak points.`)}</div>` : ""}`;
}

// ---------------------------------------------------------
// REPORTE DE EVOLUCIÓN
// ---------------------------------------------------------
export function htmlReporte(r) {
  const filas = HABILIDADES.map(h => {
    const a = r.nivelesAntes?.[h], b = r.nivelesAhora?.[h];
    if (!a && !b) return "";
    const subio = a && b && rango(b) > rango(a);
    return `<tr><td>${nombreHab(h)}</td><td>${esc(a || "—")}</td><td>${subio ? "<b>" : ""}${esc(b || "—")}${subio ? " ⬆️</b>" : ""}</td></tr>`;
  }).join("");
  const evals = (r.evaluaciones || []).map(e => `<li>${esc(e.lunes)}${e.mensual ? " (mensual)" : ""}: ${Object.entries(e.puntajes || {}).filter(([, v]) => v != null).map(([h, v]) => `${nombreHab(h)} ${Math.round(v * 100)}%`).join(" · ")}</li>`).join("");
  return `
    <div class="tarjeta destacada"><h2>${tx("Reporte de evolución", "Progress report")}</h2>
      <p class="suave" style="margin:0">${tx("Semanas", "Weeks")} ${r.bloque}–${r.bloque + 3} · ${esc(r.inicio)} → ${esc(r.fin)}</p></div>
    <div class="niveles" style="grid-template-columns:repeat(3,1fr)">
      <div class="nivel"><b>${r.minutos}</b><span>${tx("minutos", "minutes")}</span></div>
      <div class="nivel"><b>${r.sesiones}</b><span>${tx("sesiones", "sessions")}</span></div>
      <div class="nivel"><b>${r.vocab?.dominada || 0}/${r.vocab?.total || 0}</b><span>${tx("palabras dominadas", "words mastered")}</span></div>
    </div>
    <div class="tarjeta" style="margin-top:12px"><div class="etiqueta">${tx("Niveles", "Levels")}</div>
      <table class="tabla"><tr><th></th><th>${tx("Antes", "Before")}</th><th>${tx("Ahora", "Now")}</th></tr>${filas}</table>
      <p class="pequeno" style="margin:8px 0 0">${tx("Nivel general", "Overall level")}: <b>${esc(r.nivelGeneral || "—")}</b></p></div>
    ${evals ? `<div class="tarjeta"><div class="etiqueta">${tx("Evaluaciones", "Assessments")}</div><ul class="pequeno">${evals}</ul></div>` : ""}
    ${r.debilidades?.length ? `<div class="tarjeta"><div class="etiqueta">${tx("A reforzar", "To work on")}</div>${r.debilidades.map(d => `<span class="chip">${esc(nombreEtiqueta(d.etiqueta))} · ${d.tasa}%</span>`).join(" ")}</div>` : ""}
    ${r.speaking ? `<div class="tarjeta"><div class="etiqueta">Speaking (${esc(r.speaking.fuente || "")})</div>
      <p style="margin:0">${tx("Nivel", "Level")} <b>${esc(r.speaking.nivel)}</b>${r.speaking.fluidez ? ` · ${tx("Fluidez", "Fluency")} ${r.speaking.fluidez}/5` : ""}${r.speaking.pronunciacion ? ` · ${tx("Pronunciación", "Pronunciation")} ${r.speaking.pronunciacion}/5` : ""}</p>
      ${r.speaking.recomendaciones?.length ? `<ul class="pequeno">${r.speaking.recomendaciones.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>` : ""}`;
}

// Versión en texto (para copiar y compartir, o pegar en una IA en la Fase 5)
export function textoReporte(r, perfil) {
  const lineas = [
    `REPORTE DE EVOLUCIÓN — ${perfil.nombre} (ruta ${perfil.rol}) — semanas ${r.bloque}–${r.bloque + 3} (${r.inicio} a ${r.fin})`,
    `Nivel general: ${r.nivelGeneral || "—"}`,
    ...HABILIDADES.filter(h => r.nivelesAntes?.[h] || r.nivelesAhora?.[h]).map(h => `- ${NOMBRE_HAB[h][0]}: ${r.nivelesAntes?.[h] || "—"} → ${r.nivelesAhora?.[h] || "—"}`),
    `Tiempo de estudio: ${r.minutos} min en ${r.sesiones} sesiones`,
    `Vocabulario: ${r.vocab?.total || 0} palabras, ${r.vocab?.dominada || 0} dominadas`,
    `Debilidades: ${(r.debilidades || []).map(d => `${d.etiqueta} (${d.tasa}% fallo)`).join("; ") || "ninguna"}`,
    r.speaking ? `Speaking: ${r.speaking.nivel} · errores: ${(r.speaking.errores || []).join("; ") || "—"}` : "",
  ];
  return lineas.filter(Boolean).join("\n");
}
