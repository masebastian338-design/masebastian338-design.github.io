// =========================================================
// PÁGINA: INICIO
// =========================================================
import { t, idiomaActual } from "../i18n.js";
import { esc, avatar, minutos } from "../ui/componentes.js";
import { tipoDeDia, fechaISO } from "../motor/calendario.js";
import { pendientes } from "../motor/srs.js";
import * as prog from "../datos/progreso.js";
import { nivelGeneral } from "../motor/niveles.js";

export function render({ perfil, pareja }) {
  const tipo = tipoDeDia(perfil.calendario, fechaISO());
  const retosHechos = 0; // se conecta en la Fase 6
  const nivel = perfil.diagnostico
    ? `<a class="boton secundario ancho" href="#/evaluaciones">${t("inicio.verNiveles")}</a>`
    : `<p class="suave pequeno">${t("inicio.sinDiag")}</p><a class="boton ancho" href="#/evaluaciones?ver=diagnostico">${t("inicio.hacerDiag")}</a>`;

  return `
    <div class="encabezado">
      <div>
        <p class="saludo">${new Date().toLocaleDateString(idiomaActual() === "en" ? "en-US" : "es", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1>${t("inicio.hola", { nombre: esc(perfil.nombre) })}</h1>
      </div>
      <a href="#/perfil" aria-label="${t("sec.perfil")}">${avatar(perfil)}</a>
    </div>

    <div class="niveles" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
      <a class="nivel" href="#/calendario"><b>🔥 ${Number(perfil.racha?.actual) || 0}</b><span>${t("inicio.racha")}</span></a>
      <a class="nivel" href="#/calendario"><b id="min-hoy">–</b><span>${t("inicio.minHoy")}</span></a>
      <a class="nivel" href="#/vocabulario"><b id="repasos">–</b><span>${t("inicio.repasos")}</span></a>
    </div>

    <div class="tarjeta destacada">
      <div class="etiqueta">${t("inicio.hoyEs")}</div>
      <h2>${t("dia." + tipo)}</h2>
      <p id="progreso-hoy" class="pequeno" style="margin:0 0 8px"></p>
      ${tipo !== "descanso" ? `<a class="boton ancho" href="#/hoy" id="btn-hoy">${t("inicio.empezar")}</a>` : ""}
    </div>

    <div class="tarjeta pareja">
      <div class="etiqueta">${t("inicio.metaPareja")}</div>
      <div class="fila entre" style="margin-bottom:8px">
        <b>${t("inicio.retos", { n: retosHechos })}</b><span>🤝</span>
      </div>
      <div class="barra"><span style="width:${(retosHechos / 3) * 100}%"></span></div>
    </div>

    <div class="tarjeta">
      <div class="etiqueta">${t("inicio.nivel")}</div>
      <h2>${esc(nivelGeneral(perfil))}</h2>
      ${nivel}
    </div>

    <a class="tarjeta fila" href="#/pareja" style="text-decoration:none;color:inherit">
      ${pareja ? avatar(pareja, "acento") : avatar({ nombre: "?" }, "acento")}
      <div>
        <div class="etiqueta">${t("inicio.parejaDe")}</div>
        <b>${pareja ? esc(pareja.nombre) : t("inicio.sinPareja")}</b>
        ${pareja ? `<div class="suave pequeno">🔥 ${Number(pareja.racha?.actual) || 0}</div>` : ""}
      </div>
    </a>
  `;
}

// Completa los datos del día (se cargan después de dibujar)
export async function montar(raiz, { perfil }) {
  try {
    const [dia, vocab] = await Promise.all([prog.dia(perfil.uid), prog.vocabulario(perfil.uid)]);
    raiz.querySelector("#min-hoy").textContent = minutos(dia?.segundos);
    raiz.querySelector("#repasos").textContent = pendientes(vocab, fechaISO()).length;
    const pasos = Object.keys(dia?.pasos || {}).length;
    const p = raiz.querySelector("#progreso-hoy");
    const btn = raiz.querySelector("#btn-hoy");
    if (dia?.completado) {
      p.textContent = t("inicio.hecho");
      if (btn) { btn.textContent = t("sec.hoy"); btn.classList.add("secundario"); }
    } else if (pasos) {
      p.textContent = t("inicio.progresoHoy", { n: pasos, total: dia.tipo === "ligero" ? 2 : 5 });
      if (btn) btn.textContent = t("continuar");
    }
  } catch (e) {
    console.warn("Inicio:", e);
  }
}
