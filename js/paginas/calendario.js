// =========================================================
// PÁGINA: CALENDARIO 5 + 1 + 1, racha y tiempo de estudio
// ---------------------------------------------------------
// - Eliges qué día de la semana es ligero y cuál es descanso.
// - Puedes mover un día concreto (tocándolo) sin cambiar el patrón.
// - Ves las últimas 4 semanas: qué días estudiaste y cuántos minutos.
// =========================================================
import { t, idiomaActual } from "../i18n.js";
import { esc, toast, minutos } from "../ui/componentes.js";
import * as prog from "../datos/progreso.js";
import { actualizarPerfil } from "../datos/perfiles.js";
import { semana, fechaISO, sumarDias, lunesDe, desdeISO, revisarSemana } from "../motor/calendario.js";

const ICONO = { completo: "📘", ligero: "🌱", descanso: "😌" };

export function render() {
  return `<h1>${t("sec.calendario")}</h1><div id="cal"><p class="suave">${t("cargando")}</p></div>`;
}

export async function montar(raiz, { perfil }) {
  const caja = raiz.querySelector("#cal");
  const loc = idiomaActual() === "en" ? "en-US" : "es";
  const nombreDia = (n, formato = "short") =>
    new Date(2026, 10, 1 + ((n + 7) % 7), 12).toLocaleDateString(loc, { weekday: formato }); // 1 nov 2026 = domingo

  let historial = await prog.dias(perfil.uid);
  const racha = await prog.actualizarRacha(perfil);

  function vista() {
    const hoy = fechaISO();
    const cal = perfil.calendario || {};
    const { avisos } = revisarSemana(cal, hoy);

    // 4 semanas: 3 anteriores + la actual
    const semanas = [-21, -14, -7, 0].map(d => semana(cal, sumarDias(lunesDe(hoy), d)));
    const filas = semanas.map(s => `<div class="semana">${s.map(d => {
      const h = historial[d.fecha];
      const clase = [d.tipo, h?.completado ? "estudiado" : "", d.fecha === hoy ? "hoy" : "", d.fecha > hoy ? "futuro" : ""].join(" ");
      return `<button class="dia ${clase}" data-fecha="${d.fecha}" ${d.fecha < hoy ? "disabled" : ""}>
        <span class="num">${desdeISO(d.fecha).getDate()}</span>
        <span class="ico">${h?.completado ? "✓" : ICONO[d.tipo]}</span>
        <span class="min">${h?.segundos ? minutos(h.segundos) + "′" : ""}</span>
      </button>`;
    }).join("")}</div>`).join("");

    const cabecera = [1, 2, 3, 4, 5, 6, 0].map(n => `<span>${esc(nombreDia(n, "narrow"))}</span>`).join("");
    const opciones = sel => [1, 2, 3, 4, 5, 6, 0].map(n =>
      `<option value="${n}" ${n === sel ? "selected" : ""}>${esc(nombreDia(n, "long"))}</option>`).join("");

    const minSemana = semanas[3].reduce((s, d) => s + (historial[d.fecha]?.segundos || 0), 0);

    caja.innerHTML = `
      <div class="niveles" style="grid-template-columns:repeat(3,1fr)">
        <div class="nivel"><b>🔥 ${racha.actual}</b><span>${t("cal.racha")}</span></div>
        <div class="nivel"><b>${racha.mejor}</b><span>${t("cal.mejor")}</span></div>
        <div class="nivel"><b>${racha.comodinDisponible ? "🃏 1" : "—"}</b><span>${t("cal.comodin")}</span></div>
      </div>
      <p class="suave pequeno" style="margin-top:8px">${t("cal.minSemana", { n: minutos(minSemana) })}</p>

      <div class="tarjeta">
        <div class="cal-cabecera">${cabecera}</div>
        ${filas}
        <p class="suave pequeno" style="margin:8px 0 0">${ICONO.completo} ${t("tipo.completo")} · ${ICONO.ligero} ${t("tipo.ligero")} · ${ICONO.descanso} ${t("tipo.descanso")} · ✓ ${t("cal.estudiado")}</p>
        <p class="suave pequeno" style="margin:4px 0 0">${t("cal.tocaParaMover")}</p>
      </div>
      ${avisos.length ? `<div class="aviso">${t("cal.aviso")}</div>` : ""}

      <div class="tarjeta">
        <div class="etiqueta">${t("cal.patron")}</div>
        <label for="ligero">🌱 ${t("cal.diaLigero")}</label>
        <select id="ligero">${opciones(cal.ligero ?? 6)}</select>
        <label for="descanso">😌 ${t("cal.diaDescanso")}</label>
        <select id="descanso">${opciones(cal.descanso ?? 0)}</select>
        <button class="boton ancho" id="guardar" style="margin-top:12px">${t("perfil.guardar")}</button>
      </div>`;

    caja.querySelector("#guardar").onclick = async () => {
      const ligero = Number(caja.querySelector("#ligero").value);
      const descanso = Number(caja.querySelector("#descanso").value);
      if (ligero === descanso) { toast(t("cal.mismoDia")); return; }
      await guardarCalendario({ ...cal, ligero, descanso });
      toast(t("perfil.guardado"));
    };

    // Tocar un día (hoy o futuro) → elegir su tipo solo para esa fecha
    caja.querySelectorAll(".dia:not([disabled])").forEach(b => b.onclick = () => elegirTipo(b.dataset.fecha));
  }

  function elegirTipo(fecha) {
    const cal = perfil.calendario || {};
    const fechaTexto = desdeISO(fecha).toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" });
    const dlg = document.createElement("div");
    dlg.className = "hoja";
    dlg.innerHTML = `<div class="hoja-caja">
      <h3>${esc(fechaTexto)}</h3>
      ${["completo", "ligero", "descanso"].map(tp => `<button class="boton secundario ancho" data-t="${tp}" style="margin-bottom:8px">${ICONO[tp]} ${t("tipo." + tp)}</button>`).join("")}
      ${cal.cambios?.[fecha] ? `<button class="boton secundario ancho" data-t="auto">↺ ${t("cal.automatico")}</button>` : ""}
      <button class="boton ancho" data-t="cancelar" style="margin-top:8px">${t("cancelar")}</button>
    </div>`;
    document.body.appendChild(dlg);
    dlg.onclick = async ev => {
      const tp = ev.target.closest("[data-t]")?.dataset.t;
      if (!tp && ev.target !== dlg) return;
      dlg.remove();
      if (!tp || tp === "cancelar") return;
      const cambios = { ...(cal.cambios || {}) };
      if (tp === "auto") delete cambios[fecha]; else cambios[fecha] = tp;
      // "Mover" = intercambiar: si este día pasa a ligero/descanso, el otro día
      // de ese tipo en la misma semana (si aún no pasó) se vuelve completo.
      if (tp === "ligero" || tp === "descanso") {
        for (const d of semana({ ...cal, cambios }, fecha)) {
          if (d.fecha !== fecha && d.tipo === tp && d.fecha >= fechaISO()) cambios[d.fecha] = "completo";
        }
      }
      // Limpia cambios de fechas pasadas para que no crezca sin fin
      for (const f of Object.keys(cambios)) if (f < sumarDias(fechaISO(), -60)) delete cambios[f];
      await guardarCalendario({ ...cal, cambios });
    };
  }

  async function guardarCalendario(calendario) {
    try {
      await actualizarPerfil(perfil.uid, { calendario });
      perfil.calendario = calendario;
      Object.assign(racha, await prog.actualizarRacha(perfil));
      historial = await prog.dias(perfil.uid);
    } catch (e) { toast("Error: " + (e.code || e.message)); }
    vista();
  }

  vista();
}
