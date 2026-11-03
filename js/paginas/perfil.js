// =========================================================
// PÁGINA: MI PERFIL (niveles, ajustes de voz, cerrar sesión)
// =========================================================
import { t } from "../i18n.js";
import { esc, avatar, toast, tarjetaNiveles } from "../ui/componentes.js";
import { hayVoz, hayGrabacion, obtenerVoces, vocesDeAcento, hablar } from "../ui/voz.js";
import { actualizarPerfil } from "../datos/perfiles.js";

export function render({ perfil }) {
  const a = perfil.ajustes || {};
  const vozHTML = hayVoz ? `
    <label for="acento">${t("perfil.acento")}</label>
    <select id="acento">
      <option value="en-US" ${a.acento === "en-US" ? "selected" : ""}>🇺🇸 American (en-US)</option>
      <option value="en-GB" ${a.acento === "en-GB" ? "selected" : ""}>🇬🇧 British (en-GB)</option>
    </select>
    <label for="voz">${t("perfil.vozDisp")}</label>
    <select id="voz"><option>…</option></select>
    <p id="aviso-acento" class="suave pequeno" hidden>${t("perfil.sinVocesAcento")}</p>
    <label for="velocidad">${t("perfil.velocidad")}: <span id="vel-valor">${a.velocidadVoz ?? 1}×</span></label>
    <input id="velocidad" type="range" min="0.6" max="1.2" step="0.05" value="${a.velocidadVoz ?? 1}">
    <div class="fila" style="margin-top:12px">
      <button class="boton secundario" id="probar">${t("perfil.probar")}</button>
      <button class="boton" id="guardar">${t("perfil.guardar")}</button>
    </div>` : `<p class="suave">${t("perfil.sinVoz")}</p>`;

  return `
    <div class="encabezado">
      <div class="fila">
        ${avatar(perfil)}
        <div><h1 style="margin:0">${esc(perfil.nombre)}</h1>
        <span class="suave pequeno">${esc(perfil.correo)}</span></div>
      </div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta">${t("perfil.rol")}</div>
      <b>${t(perfil.rol === "A" ? "perfil.rolA" : "perfil.rolB")}</b>
      <p class="suave pequeno" style="margin-top:8px">${t("perfil.idioma")}</p>
    </div>

    <div class="tarjeta">
      <div class="etiqueta">${t("perfil.niveles")}</div>
      ${tarjetaNiveles(perfil, t)}
    </div>

    <div class="tarjeta">
      <div class="etiqueta">${t("perfil.voz")}</div>
      ${vozHTML}
    </div>

    <div class="tarjeta">
      <div class="etiqueta">${t("perfil.grabar")}</div>
      <p style="margin:0">${t(hayGrabacion ? "perfil.grabarSi" : "perfil.grabarNo")}</p>
    </div>

    <button class="boton peligro ancho" id="salir">${t("perfil.salir")}</button>
  `;
}

// Conecta los botones después de dibujar la página
export async function montar(raiz, estado, { salir }) {
  raiz.querySelector("#salir").onclick = salir;
  if (!hayVoz) return;

  const { perfil } = estado;
  const selAcento = raiz.querySelector("#acento");
  const selVoz = raiz.querySelector("#voz");
  const vel = raiz.querySelector("#velocidad");
  const voces = await obtenerVoces();

  // Llena la lista de voces del acento elegido
  function llenarVoces() {
    let lista = vocesDeAcento(voces, selAcento.value);
    raiz.querySelector("#aviso-acento").hidden = lista.length > 0;
    if (!lista.length) lista = voces.filter(v => /^en[-_]/i.test(v.lang));
    selVoz.innerHTML = lista.map(v =>
      `<option value="${esc(v.name)}" ${v.name === perfil.ajustes?.vozNombre ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`
    ).join("") || `<option value="">—</option>`;
  }
  llenarVoces();

  const ajustesActuales = () => ({
    acento: selAcento.value,
    vozNombre: selVoz.value || null,
    velocidadVoz: Number(vel.value),
  });

  selAcento.onchange = llenarVoces;
  vel.oninput = () => { raiz.querySelector("#vel-valor").textContent = vel.value + "×"; };
  raiz.querySelector("#probar").onclick = () =>
    hablar("Hi! Let's practice English together. How was your day?", ajustesActuales());
  raiz.querySelector("#guardar").onclick = async () => {
    const ajustes = ajustesActuales();
    try {
      await actualizarPerfil(perfil.uid, { ajustes });
      perfil.ajustes = ajustes;
      toast(t("perfil.guardado"));
    } catch (e) {
      toast("Error: " + (e.code || e.message));
    }
  };
}
