// =========================================================
// SPEAKING Y SHADOWING
// ---------------------------------------------------------
// Shadowing: escuchas una frase (voz sintética), la repites
// grabándote y comparas tu voz con el modelo.
// Speaking challenge: respondes preguntas en voz alta (grabando)
// y al final te autoevalúas con una rúbrica breve.
// Las grabaciones se guardan SOLO en el dispositivo.
// Si el navegador no puede grabar, todo funciona sin grabar.
// =========================================================
import { t, traduccionHTML } from "../i18n.js";
import { esc, botonOir } from "./componentes.js";
import { hablar, hayGrabacion } from "./voz.js";
import { guardarGrabacion, grabacionesDe } from "../datos/grabaciones.js";

// ---------- Grabadora ----------
// Devuelve { iniciar(), detener() → Promise<Blob> }
async function crearGrabadora() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Elegimos un formato que el navegador soporte (Safari: mp4, Chrome: webm)
  const tipos = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"];
  const mimeType = tipos.find(m => MediaRecorder.isTypeSupported?.(m));
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const trozos = [];
  rec.ondataavailable = e => e.data.size && trozos.push(e.data);
  return {
    iniciar: () => rec.start(),
    detener: () => new Promise(res => {
      rec.onstop = () => {
        stream.getTracks().forEach(tr => tr.stop());   // apaga el micrófono
        res(new Blob(trozos, { type: rec.mimeType || "audio/mp4" }));
      };
      rec.stop();
    }),
  };
}

// Control de grabación reutilizable: botón ● / ■ + reproductor
// clave: dónde se guarda (id de frase o pregunta). maxSeg: corte automático.
function controlGrabacion(contenedor, clave, maxSeg = 60) {
  if (!hayGrabacion) {
    contenedor.innerHTML = `<p class="suave pequeno">${t("sinGrabacion")}</p>`;
    return;
  }
  contenedor.innerHTML = `
    <div class="fila">
      <button type="button" class="boton secundario btn-grabar">● ${t("grabar")}</button>
      <span class="reloj suave pequeno"></span>
    </div>
    <audio class="mi-audio" controls hidden></audio>`;
  const btn = contenedor.querySelector(".btn-grabar");
  const reloj = contenedor.querySelector(".reloj");
  const audio = contenedor.querySelector(".mi-audio");
  let grabadora = null, intervalo = null, corte = null, seg = 0;

  // Muestra la última grabación guardada, si existe
  grabacionesDe(clave).then(l => { if (l[0]) { audio.src = URL.createObjectURL(l[0].blob); audio.hidden = false; } }).catch(() => {});

  async function parar() {
    clearInterval(intervalo); clearTimeout(corte);
    const blob = await grabadora.detener();
    grabadora = null;
    btn.textContent = "● " + t("grabarOtraVez");
    btn.classList.remove("grabando");
    reloj.textContent = "";
    audio.src = URL.createObjectURL(blob);
    audio.hidden = false;
    try { await guardarGrabacion(clave, blob); } catch (e) { console.warn("No se guardó el audio:", e); }
  }

  btn.onclick = async () => {
    if (grabadora) return parar();
    try {
      speechSynthesis?.cancel?.();
      grabadora = await crearGrabadora();
    } catch (e) {
      contenedor.insertAdjacentHTML("beforeend", `<p class="aviso">${t("micBloqueado")}</p>`);
      return;
    }
    grabadora.iniciar();
    seg = 0;
    btn.textContent = "■ " + t("detener");
    btn.classList.add("grabando");
    intervalo = setInterval(() => { seg++; reloj.textContent = `${seg}s / ${maxSeg}s`; }, 1000);
    corte = setTimeout(parar, maxSeg * 1000);
  };
}

// ---------------------------------------------------------
// SHADOWING: una frase a la vez. Autoevaluación por frase
// (😕 / 🙂 / 😃). Devuelve [{ frase, nota: 1|2|3 }].
// ---------------------------------------------------------
export function ejecutarShadowing(caja, frases, perfil, claveBase) {
  return new Promise(resolve => {
    const notas = [];
    let i = 0;

    function mostrar() {
      if (i >= frases.length) { resolve(notas); return; }
      const frase = frases[i];
      caja.innerHTML = `
        <p class="suave pequeno">${t("shadowing.pasos")}</p>
        <p class="suave pequeno">${i + 1} / ${frases.length}</p>
        <div class="tarjeta frase-shadow">
          <p class="frase-grande">${esc(frase)}</p>
          <div class="fila">
            ${botonOir(frase, "🔊 " + t("escuchar"))}
            <button type="button" class="boton secundario" id="lento">🐢 ${t("lento")}</button>
          </div>
        </div>
        <div id="grabacion"></div>
        <button type="button" class="boton secundario" id="comparar" hidden>⇄ ${t("comparar")}</button>
        <p style="margin-top:16px"><b>${t("shadowing.comoTeSalio")}</b></p>
        <div class="opciones tres">
          <button type="button" class="opcion" data-n="1">😕 ${t("nota1")}</button>
          <button type="button" class="opcion" data-n="2">🙂 ${t("nota2")}</button>
          <button type="button" class="opcion" data-n="3">😃 ${t("nota3")}</button>
        </div>`;

      hablar(frase, perfil.ajustes);
      caja.querySelector("#lento").onclick = () =>
        hablar(frase, { ...perfil.ajustes, velocidadVoz: Math.max(0.5, (perfil.ajustes?.velocidadVoz || 1) * 0.7) });

      const clave = `${claveBase}:${frase}`;
      controlGrabacion(caja.querySelector("#grabacion"), clave, 20);

      // Comparar: primero el modelo, luego tu voz
      const comparar = caja.querySelector("#comparar");
      const audio = () => caja.querySelector(".mi-audio");
      const revisar = setInterval(() => { if (audio() && !audio().hidden) comparar.hidden = false; }, 500);
      comparar.onclick = async () => {
        await hablar(frase, perfil.ajustes);   // espera a que termine el modelo
        audio()?.play();
      };

      caja.querySelectorAll(".opcion").forEach(b => b.onclick = () => {
        clearInterval(revisar);
        notas.push({ frase, nota: Number(b.dataset.n) });
        i++;
        mostrar();
      });
    }
    mostrar();
  });
}

// ---------------------------------------------------------
// SPEAKING CHALLENGE: preguntas en voz alta + rúbrica final.
// Devuelve { fluidez: 1–3, respondio: bool, expresionesUsadas: [] }
// ---------------------------------------------------------
export function ejecutarSpeaking(caja, sp, perfil) {
  return new Promise(resolve => {
    let i = 0;
    const preguntas = sp.preguntas || [];

    function mostrarPregunta() {
      if (i >= preguntas.length) { mostrarRubrica(); return; }
      const q = preguntas[i];
      caja.innerHTML = `
        <p>${esc(sp.instruccion || "")}</p>
        ${traduccionHTML(sp.instruccionES, perfil, esc)}
        <div class="tarjeta">
          <p class="suave pequeno">${t("pregunta")} ${i + 1} / ${preguntas.length}</p>
          <p class="frase-grande">${esc(q)}</p>
          ${botonOir(q, "🔊 " + t("escuchar"))}
        </div>
        ${sp.expresionesObjetivo?.length ? `<p class="pequeno"><b>${t("intentaUsar")}:</b> ${sp.expresionesObjetivo.map(e => `<span class="chip">${esc(e)}</span>`).join(" ")}</p>` : ""}
        <p class="suave pequeno">${t("speaking.consejo", { seg: sp.duracionSeg || 60 })}</p>
        <div id="grabacion"></div>
        <button type="button" class="boton ancho" id="sig" style="margin-top:16px">${t("siguiente")}</button>`;
      hablar(q, perfil.ajustes);
      controlGrabacion(caja.querySelector("#grabacion"), `${sp.id}:p${i}`, sp.duracionSeg || 60);
      caja.querySelector("#sig").onclick = () => { i++; mostrarPregunta(); };
    }

    function mostrarRubrica() {
      const expr = sp.expresionesObjetivo || [];
      caja.innerHTML = `
        <h3>${t("rubrica.titulo")}</h3>
        <p><b>${t("rubrica.fluidez")}</b></p>
        <div class="opciones">
          <button type="button" class="opcion" data-f="1">😕 ${t("rubrica.f1")}</button>
          <button type="button" class="opcion" data-f="2">🙂 ${t("rubrica.f2")}</button>
          <button type="button" class="opcion" data-f="3">😃 ${t("rubrica.f3")}</button>
        </div>
        <label class="check"><input type="checkbox" id="respondio"> ${t("rubrica.respondio")}</label>
        ${expr.length ? `<p><b>${t("rubrica.expresiones")}</b></p>
          ${expr.map((e, k) => `<label class="check"><input type="checkbox" data-e="${k}"> ${esc(e)}</label>`).join("")}` : ""}
        <button type="button" class="boton ancho" id="fin" disabled style="margin-top:16px">${t("terminar")}</button>`;
      let fluidez = null;
      const fin = caja.querySelector("#fin");
      caja.querySelectorAll("[data-f]").forEach(b => b.onclick = () => {
        caja.querySelectorAll("[data-f]").forEach(x => x.classList.remove("elegida"));
        b.classList.add("elegida");
        fluidez = Number(b.dataset.f);
        fin.disabled = false;
      });
      fin.onclick = () => resolve({
        fluidez,
        respondio: caja.querySelector("#respondio").checked,
        expresionesUsadas: [...caja.querySelectorAll("[data-e]:checked")].map(c => expr[Number(c.dataset.e)]),
        expresionesTotal: expr.length,
      });
    }

    mostrarPregunta();
  });
}

// Convierte la autoevaluación en respuestas para el detector de debilidades
export function speakingARespuestas(r) {
  const salida = [
    { etiqueta: "speaking-fluidez", habilidad: "speaking", correcto: r.fluidez >= 2 },
    { etiqueta: "speaking-responder", habilidad: "speaking", correcto: !!r.respondio },
  ];
  if (r.expresionesTotal) salida.push({
    etiqueta: "speaking-expresiones", habilidad: "speaking",
    correcto: r.expresionesUsadas.length >= Math.ceil(r.expresionesTotal / 2),
  });
  return salida;
}

export function shadowingARespuestas(notas) {
  return notas.map(n => ({ etiqueta: "shadowing-pronunciacion", habilidad: "speaking", correcto: n.nota >= 2 }));
}
