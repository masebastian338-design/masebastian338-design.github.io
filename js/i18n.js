// =========================================================
// IDIOMA DE LA INTERFAZ (i18n = "internacionalización")
// ---------------------------------------------------------
// Regla del plan (inmersión progresiva):
//  - Estudiante B (Xiomara): interfaz en español al inicio.
//  - Estudiante A (Sebastián): interfaz en inglés.
// En fases siguientes, el nivel también influirá (p. ej. B en A2
// verá traducciones "toca para ver"). Esa lógica vive en idiomaPara().
// =========================================================

let idioma = "es";

// Decide el idioma según el perfil de quien inició sesión
export function idiomaPara(perfil) {
  if (!perfil) return "es";
  return perfil.rol === "A" ? "en" : "es";
}

export function establecerIdioma(perfil) {
  idioma = idiomaPara(perfil);
  document.documentElement.lang = idioma;
}

export function idiomaActual() { return idioma; }

// Texto bilingüe "en línea": tx("Hola", "Hi") → según el idioma actual.
// Se usa en páginas con mucho texto propio (evaluaciones) para no
// llenar el diccionario de abajo con cientos de claves.
export function tx(es, en) { return idioma === "en" ? en : es; }

// ---------------------------------------------------------
// INMERSIÓN PROGRESIVA: ¿cómo mostrar el español en el contenido?
//  - Estudiante B: traducciones visibles hasta A2; desde A2, "toca para ver".
//  - Estudiante A: resumen en español visible hasta B1; desde B1, oculto.
// Devuelve "visible" | "tocar" | "oculta".
// ---------------------------------------------------------
import { alMenos, nivelGeneral } from "./motor/niveles.js";

// clase: "ejemplo" (traducción de frases) o "resumen" (resumen de gramática)
export function modoTraduccion(perfil, clase = "ejemplo") {
  const nivel = nivelGeneral(perfil);
  if (perfil?.rol === "B") return alMenos(nivel, "A2") ? "tocar" : "visible";
  if (clase === "resumen") return alMenos(nivel, "B1") ? "oculta" : "visible";
  return "tocar";
}

// Muestra un texto en español según el modo de inmersión
export function traduccionHTML(textoES, perfil, escapar, clase = "ejemplo") {
  if (!textoES) return "";
  const modo = modoTraduccion(perfil, clase);
  if (modo === "oculta") return "";
  if (modo === "visible") return `<span class="trad">${escapar(textoES)}</span>`;
  return `<details class="trad"><summary>${t("verTraduccion")}</summary>${escapar(textoES)}</details>`;
}

// t("clave") devuelve el texto en el idioma actual.
// Si una clave no existe, devuelve la clave (así se nota el olvido).
export function t(clave, variables = {}) {
  const entrada = TEXTOS[clave];
  let texto = entrada ? (entrada[idioma] ?? entrada.es) : clave;
  // Reemplaza {nombre} por el valor correspondiente
  for (const [k, v] of Object.entries(variables)) texto = texto.replaceAll(`{${k}}`, v);
  return texto;
}

// ---------- Diccionario de textos ----------
const TEXTOS = {
  // Navegación
  "nav.inicio":       { es: "Inicio",      en: "Home" },
  "nav.hoy":          { es: "Hoy",         en: "Today" },
  "nav.vocabulario":  { es: "Palabras",    en: "Words" },
  "nav.pareja":       { es: "Pareja",      en: "Partner" },
  "nav.mas":          { es: "Más",         en: "More" },

  // Secciones (nombre y descripción corta)
  "sec.hoy":          { es: "Lección del día",        en: "Today's lesson" },
  "sec.hoy.d":        { es: "Tu sesión de 20 min",    en: "Your 20-min session" },
  "sec.ruta":         { es: "Ruta de aprendizaje",    en: "Learning path" },
  "sec.ruta.d":       { es: "Semanas y temas",        en: "Weeks and topics" },
  "sec.recursos":     { es: "Videos y recursos",      en: "Videos & resources" },
  "sec.recursos.d":   { es: "Videos, podcasts",       en: "Videos, podcasts" },
  "sec.quizzes":      { es: "Quizzes",                en: "Quizzes" },
  "sec.quizzes.d":    { es: "Práctica rápida",        en: "Quick practice" },
  "sec.speaking":     { es: "Speaking",               en: "Speaking" },
  "sec.speaking.d":   { es: "Habla y shadowing",      en: "Talk & shadowing" },
  "sec.retos":        { es: "Retos en pareja",        en: "Couple challenges" },
  "sec.retos.d":      { es: "3 por semana",           en: "3 per week" },
  "sec.vocabulario":  { es: "Vocabulario",            en: "Vocabulary" },
  "sec.vocabulario.d":{ es: "Repasos espaciados",     en: "Spaced reviews" },
  "sec.evaluaciones": { es: "Evaluaciones",           en: "Assessments" },
  "sec.evaluaciones.d":{ es: "Diagnóstico y semanal", en: "Placement & weekly" },
  "sec.estadisticas": { es: "Estadísticas",           en: "Stats" },
  "sec.estadisticas.d":{ es: "Tu evolución",          en: "Your progress" },
  "sec.perfil":       { es: "Mi perfil",              en: "My profile" },
  "sec.perfil.d":     { es: "Niveles y ajustes",      en: "Levels & settings" },
  "sec.pareja":       { es: "Perfil de mi pareja",    en: "My partner" },
  "sec.pareja.d":     { es: "Sus avances",            en: "Their progress" },
  "sec.calendario":   { es: "Calendario",             en: "Calendar" },
  "sec.calendario.d": { es: "Plan 5 + 1 + 1",         en: "5 + 1 + 1 plan" },
  "sec.agregar":      { es: "Agregar contenido",      en: "Add content" },
  "sec.agregar.d":    { es: "Importar JSON",          en: "Import JSON" },
  "sec.generar":      { es: "Generar contenido",      en: "Generate content" },
  "sec.generar.d":    { es: "Prompt para una IA",     en: "Prompt for an AI" },
  "sec.respaldo":     { es: "Respaldo",               en: "Backup" },
  "sec.respaldo.d":   { es: "Exportar y restaurar",   en: "Export & restore" },

  // Inicio
  "inicio.hola":      { es: "¡Hola, {nombre}!",       en: "Hi, {nombre}!" },
  "inicio.hoyEs":     { es: "Hoy te toca",            en: "Today is" },
  "dia.completo":     { es: "Sesión completa · 20 min", en: "Full session · 20 min" },
  "dia.ligero":       { es: "Día ligero · 5–10 min",  en: "Light day · 5–10 min" },
  "dia.descanso":     { es: "Día de descanso 😌",      en: "Rest day 😌" },
  "inicio.empezar":   { es: "Empezar sesión",         en: "Start session" },
  "inicio.metaPareja":{ es: "Meta de pareja esta semana", en: "Couple goal this week" },
  "inicio.retos":     { es: "{n} de 3 retos",         en: "{n} of 3 challenges" },
  "inicio.nivel":     { es: "Tu nivel",               en: "Your level" },
  "inicio.sinDiag":   { es: "Aún sin diagnóstico: este nivel es una estimación.", en: "No placement test yet: this level is an estimate." },
  "inicio.parejaDe":  { es: "Tu pareja",              en: "Your partner" },
  "inicio.sinPareja": { es: "Tu pareja aún no ha entrado.", en: "Your partner hasn't signed in yet." },

  // Perfil
  "perfil.rol":       { es: "Ruta",                   en: "Path" },
  "perfil.rolA":      { es: "Ruta A · desde A2",      en: "Path A · from A2" },
  "perfil.rolB":      { es: "Ruta B · desde cero",    en: "Path B · from scratch" },
  "perfil.niveles":   { es: "Nivel por habilidad",    en: "Level by skill" },
  "perfil.voz":       { es: "Voz para escuchar",      en: "Listening voice" },
  "perfil.acento":    { es: "Acento",                 en: "Accent" },
  "perfil.vozDisp":   { es: "Voz",                    en: "Voice" },
  "perfil.velocidad": { es: "Velocidad",              en: "Speed" },
  "perfil.probar":    { es: "▶ Probar voz",           en: "▶ Test voice" },
  "perfil.guardar":   { es: "Guardar ajustes",        en: "Save settings" },
  "perfil.guardado":  { es: "Ajustes guardados ✓",    en: "Settings saved ✓" },
  "perfil.sinVoz":    { es: "Este navegador no tiene voz sintética. Las actividades de audio se ocultarán.", en: "This browser has no speech voice. Audio activities will be hidden." },
  "perfil.sinVocesAcento": { es: "No hay voces de este acento en tu dispositivo; se usará otra voz en inglés.", en: "No voices for this accent on your device; another English voice will be used." },
  "perfil.idioma":    { es: "Idioma de la interfaz: español (automático según tu ruta y nivel).", en: "Interface language: English (automatic, based on your path and level)." },
  "perfil.salir":     { es: "Cerrar sesión",          en: "Sign out" },
  "perfil.grabar":    { es: "Grabación de voz",       en: "Voice recording" },
  "perfil.grabarSi":  { es: "Disponible en este dispositivo ✓", en: "Available on this device ✓" },
  "perfil.grabarNo":  { es: "No disponible en este navegador (se ocultará)", en: "Not available in this browser (will be hidden)" },

  // Habilidades
  "hab.speaking":     { es: "Speaking",    en: "Speaking" },
  "hab.listening":    { es: "Listening",   en: "Listening" },
  "hab.vocabulario":  { es: "Vocabulario", en: "Vocabulary" },
  "hab.gramatica":    { es: "Gramática",   en: "Grammar" },
  "hab.lectura":      { es: "Lectura",     en: "Reading" },
  "hab.escritura":    { es: "Escritura",   en: "Writing" },

  // Varios
  "pendiente.titulo": { es: "En construcción",        en: "Coming soon" },
  "pendiente.texto":  { es: "Esta sección llega en la Fase {fase}.", en: "This section arrives in Phase {fase}." },
  "volver":           { es: "← Volver",               en: "← Back" },
  "sinConexion":      { es: "Sin conexión: los cambios se guardarán al reconectar.", en: "Offline: changes will sync when you reconnect." },
  "demo":             { es: "MODO DEMO",              en: "DEMO MODE" },

  // ===== Fase 3: motor de aprendizaje =====
  // Generales
  "cargando":         { es: "Cargando…",              en: "Loading…" },
  "continuar":        { es: "Continuar",              en: "Continue" },
  "siguiente":        { es: "Siguiente",              en: "Next" },
  "terminar":         { es: "Terminar",               en: "Finish" },
  "salir":            { es: "Salir",                  en: "Exit" },
  "cancelar":         { es: "Cancelar",               en: "Cancel" },
  "semana":           { es: "Semana",                 en: "Week" },
  "pregunta":         { es: "Pregunta",               en: "Question" },
  "preguntas":        { es: "preguntas",              en: "questions" },
  "practicar":        { es: "Practicar",              en: "Practice" },
  "ultimo":           { es: "último",                 en: "last" },
  "verTraduccion":    { es: "Ver en español",         en: "See in Spanish" },
  "objetivo":         { es: "Objetivo",               en: "Goal" },
  "ejemplos":         { es: "Ejemplos",               en: "Examples" },
  "dialogo":          { es: "Diálogo",                en: "Dialogue" },
  "escuchar":         { es: "Escuchar",               en: "Listen" },
  "escucharDialogo":  { es: "Escuchar",               en: "Play" },
  "dialogo.consejo":  { es: "Escúchalo primero sin leer. Luego léelo mientras lo escuchas.", en: "Listen first without reading. Then listen again while reading." },

  // Tipos de día
  "tipo.completo":    { es: "Completo",               en: "Full" },
  "tipo.ligero":      { es: "Ligero",                 en: "Light" },
  "tipo.descanso":    { es: "Descanso",               en: "Rest" },

  // Inicio (datos del día)
  "inicio.racha":     { es: "días de racha",          en: "day streak" },
  "inicio.progresoHoy": { es: "{n} de {total} pasos hechos", en: "{n} of {total} steps done" },
  "inicio.hecho":     { es: "¡Sesión de hoy completada! ✓", en: "Today's session done! ✓" },
  "inicio.minHoy":    { es: "min hoy",                en: "min today" },
  "inicio.repasos":   { es: "repasos pendientes",     en: "reviews due" },

  // Sesión del día
  "paso":             { es: "Paso",                   en: "Step" },
  "paso.warmup":      { es: "Repaso espaciado",       en: "Spaced review" },
  "paso.leccion":     { es: "Lección",                en: "Lesson" },
  "paso.vocab":       { es: "Vocabulario en contexto", en: "Vocabulary in context" },
  "paso.quiz":        { es: "Quiz rápido",            en: "Quick quiz" },
  "paso.speaking":    { es: "Speaking challenge",     en: "Speaking challenge" },
  "paso.shadowing":   { es: "Shadowing",              en: "Shadowing" },
  "paso.evaluacion":  { es: "Evaluación semanal",     en: "Weekly assessment" },
  "hoy.modoRefuerzo": { es: "Semana de refuerzo",     en: "Reinforcement week" },
  "inicio.hacerDiag": { es: "Hacer diagnóstico (15–20 min)", en: "Take the placement test (15–20 min)" },
  "inicio.verNiveles": { es: "Ver mis niveles",       en: "See my levels" },
  "hoy.tarjetas":     { es: "{n} tarjetas",           en: "{n} cards" },
  "hoy.reforzamos":   { es: "Hoy reforzamos",         en: "Today we reinforce" },
  "hoy.sinLecciones": { es: "Terminaste todas las lecciones disponibles. Agrega contenido nuevo (Fase 5) — mientras tanto, la sesión repasa tus debilidades.", en: "You finished all available lessons. Add new content (Phase 5) — meanwhile, the session reviews your weak points." },
  "hoy.sinRepasos":   { es: "No tienes tarjetas pendientes hoy. ¡Bien! Pasemos a la lección.", en: "No cards due today. Nice! Let's go to the lesson." },
  "hoy.sinFrases":    { es: "Aún no hay frases para shadowing. Completa tu primera lección.", en: "No shadowing phrases yet. Complete your first lesson." },
  "hoy.descansoTexto": { es: "Descansar también es parte de aprender: tu cerebro consolida lo que practicaste. La racha no se rompe.", en: "Resting is part of learning: your brain consolidates what you practiced. Your streak is safe." },
  "hoy.estudiarIgual": { es: "Quiero estudiar de todos modos", en: "I want to study anyway" },
  "final.titulo":     { es: "¡Sesión completada!",    en: "Session complete!" },
  "final.racha":      { es: "Racha actual: {n}",      en: "Current streak: {n}" },
  "final.bloques":    { es: "Bloques opcionales (+10 min)", en: "Optional blocks (+10 min)" },
  "final.consejoFluidez": { es: "Te costó hablar sin pausas. Es normal: repite el shadowing de hoy una vez más antes de dormir.", en: "Speaking without pauses was hard today. That's normal: shadow today's phrases once more before bed." },
  "final.consejoExpresiones": { es: "No usaste todas las expresiones objetivo. Intenta usarlas mañana en una conversación real.", en: "You didn't use all the target expressions. Try using them tomorrow in a real conversation." },
  "bloque.shadowing": { es: "Shadowing profundo",     en: "Deep shadowing" },
  "bloque.reto":      { es: "Reto en pareja",         en: "Couple challenge" },
  "bloque.video":     { es: "Video largo",            en: "Long video" },

  // Quiz
  "verdadero":        { es: "Verdadero",              en: "True" },
  "falso":            { es: "Falso",                  en: "False" },
  "escribeAqui":      { es: "Escribe aquí…",          en: "Type here…" },
  "refuerzo":         { es: "refuerzo",               en: "reinforcement" },
  "correctas":        { es: "correctas",              en: "correct" },
  "correccionesImportantes": { es: "Correcciones importantes", en: "Key corrections" },
  "todoBien":         { es: "¡Todo correcto!",        en: "All correct!" },
  "quiz.debilidades": { es: "Tus puntos débiles",     en: "Your weak points" },
  "quiz.sinDebilidades": { es: "Todavía no hay suficientes datos. Aparecerán cuando hagas más quizzes.", en: "Not enough data yet. They'll show up as you do more quizzes." },
  "quiz.practicarDebilidades": { es: "Practicar mis debilidades ({n})", en: "Practice my weak points ({n})" },
  "quiz.porLeccion":  { es: "Quizzes de tus lecciones", en: "Quizzes from your lessons" },
  "quiz.vacio":       { es: "Aún no hay lecciones.",  en: "No lessons yet." },
  "volverQuizzes":    { es: "Volver a quizzes",       en: "Back to quizzes" },

  // Tarjetas (SRS)
  "quedan":           { es: "Quedan {n}",             en: "{n} left" },
  "mostrarRespuesta": { es: "Mostrar respuesta",      en: "Show answer" },
  "srs.otra":         { es: "Otra vez",               en: "Again" },
  "srs.dificil":      { es: "Difícil",                en: "Hard" },
  "srs.bien":         { es: "Bien",                   en: "Good" },
  "srs.facil":        { es: "Fácil",                  en: "Easy" },
  "srs.estado.nuevo": { es: "Nueva",                  en: "New" },
  "srs.estado.aprendiendo": { es: "Aprendiendo",      en: "Learning" },
  "srs.estado.repaso": { es: "En repaso",             en: "Reviewing" },
  "srs.estado.dominada": { es: "Dominada",            en: "Mastered" },
  "srs.filtro.todas": { es: "Todas",                  en: "All" },
  "srs.filtro.aprendiendo": { es: "Aprendiendo",      en: "Learning" },
  "srs.filtro.repaso": { es: "En repaso",             en: "Reviewing" },
  "srs.filtro.dominada": { es: "Dominadas",           en: "Mastered" },
  "vocab.instruccion": { es: "Escucha cada palabra y su ejemplo, y repítelos en voz alta. Mañana empezarán tus repasos.", en: "Listen to each word and example, and repeat them out loud. Your reviews start tomorrow." },
  "vocab.listo":      { es: "Listo, agregar a mis repasos", en: "Done, add to my reviews" },
  "vocab.hoy":        { es: "hoy",                    en: "today" },
  "vocab.enDias":     { es: "en {n} d",               en: "in {n}d" },
  "vocab.total":      { es: "palabras",               en: "words" },
  "vocab.pendientes": { es: "para hoy",               en: "due today" },
  "vocab.dominadas":  { es: "dominadas",              en: "mastered" },
  "vocab.repasarAhora": { es: "Repasar ahora ({n})",  en: "Review now ({n})" },
  "vocab.nadaHoy":    { es: "Nada que repasar hoy ✓", en: "Nothing to review today ✓" },
  "vocab.vacio":      { es: "Tus palabras aparecerán aquí cuando completes el paso de vocabulario de una lección.", en: "Your words will appear here after the vocabulary step of a lesson." },
  "vocab.explicacionSRS": { es: "Repetición espaciada (SM-2): cada palabra vuelve justo antes de que la olvides. Si te cuesta, vuelve pronto; si es fácil, se espacia más. Una palabra está dominada cuando su próximo repaso es en 21 días o más.", en: "Spaced repetition (SM-2): each word comes back right before you'd forget it. Hard words return soon; easy ones get spaced out. A word is mastered when its next review is 21+ days away." },

  // Speaking / shadowing
  "sinGrabacion":     { es: "Este navegador no permite grabar. Puedes practicar en voz alta sin grabación.", en: "This browser can't record. You can still practice out loud without recording." },
  "grabar":           { es: "Grabar",                 en: "Record" },
  "grabarOtraVez":    { es: "Grabar otra vez",        en: "Record again" },
  "detener":          { es: "Detener",                en: "Stop" },
  "micBloqueado":     { es: "No se pudo usar el micrófono. Revisa los permisos del navegador.", en: "Couldn't access the microphone. Check browser permissions." },
  "lento":            { es: "Lento",                  en: "Slow" },
  "comparar":         { es: "Comparar (modelo → tú)", en: "Compare (model → you)" },
  "shadowing.pasos":  { es: "1) Escucha  2) Grábate imitando el ritmo y la entonación  3) Compara", en: "1) Listen  2) Record yourself copying the rhythm and intonation  3) Compare" },
  "shadowing.comoTeSalio": { es: "¿Cómo te salió?",   en: "How did it go?" },
  "nota1":            { es: "Me costó",               en: "Hard" },
  "nota2":            { es: "Bien",                   en: "OK" },
  "nota3":            { es: "¡Muy bien!",             en: "Great!" },
  "intentaUsar":      { es: "Intenta usar",           en: "Try to use" },
  "speaking.consejo": { es: "Habla hasta {seg} s. No te detengas a corregirte: lo importante es seguir hablando.", en: "Speak for up to {seg}s. Don't stop to correct yourself — keep talking." },
  "speaking.intro":   { es: "Practica los retos de tus lecciones. Tus grabaciones se guardan solo en este dispositivo.", en: "Practice the challenges from your lessons. Recordings stay on this device only." },
  "speaking.bien":    { es: "¡Buen trabajo! Escucha tus grabaciones mañana: notarás el avance.", en: "Great job! Listen to your recordings tomorrow — you'll notice progress." },
  "speaking.shadowHecho": { es: "Practicaste {n} frases.", en: "You practiced {n} phrases." },
  "rubrica.titulo":   { es: "Autoevaluación",         en: "Self-assessment" },
  "rubrica.fluidez":  { es: "¿Qué tan fluido hablaste?", en: "How fluent were you?" },
  "rubrica.f1":       { es: "Muchas pausas largas",   en: "Many long pauses" },
  "rubrica.f2":       { es: "Algunas pausas",         en: "Some pauses" },
  "rubrica.f3":       { es: "Casi sin pausas",        en: "Almost no pauses" },
  "rubrica.respondio": { es: "Respondí todas las preguntas", en: "I answered every question" },
  "rubrica.expresiones": { es: "¿Qué expresiones usaste?", en: "Which expressions did you use?" },

  // Calendario
  "cal.racha":        { es: "racha",                  en: "streak" },
  "cal.mejor":        { es: "mejor racha",            en: "best streak" },
  "cal.comodin":      { es: "comodín del mes",        en: "monthly freeze" },
  "cal.minSemana":    { es: "Esta semana: {n} min de estudio", en: "This week: {n} min studied" },
  "cal.estudiado":    { es: "estudiado",              en: "studied" },
  "cal.tocaParaMover": { es: "Toca hoy o un día futuro para moverlo (ej. cambiar tu descanso).", en: "Tap today or a future day to move it (e.g. swap your rest day)." },
  "cal.aviso":        { es: "Esta semana ya no es 5 + 1 + 1. Está bien de vez en cuando; intenta mantener 5 días completos.", en: "This week is no longer 5 + 1 + 1. That's OK sometimes; try to keep 5 full days." },
  "cal.patron":       { es: "Tu semana normal",       en: "Your usual week" },
  "cal.diaLigero":    { es: "Día ligero (5–10 min)",  en: "Light day (5–10 min)" },
  "cal.diaDescanso":  { es: "Día de descanso",        en: "Rest day" },
  "cal.mismoDia":     { es: "El día ligero y el de descanso deben ser distintos.", en: "Light day and rest day must be different." },
  "cal.automatico":   { es: "Volver al patrón normal", en: "Back to usual pattern" },

  // Ruta
  "ruta.progreso":    { es: "{n} de {total} lecciones completadas", en: "{n} of {total} lessons completed" },
  "ruta.repasar":     { es: "toca para repasar",      en: "tap to review" },
  "ruta.siguiente":   { es: "siguiente",              en: "up next" },
  "ruta.masContenido": { es: "Las semanas 2–4 llegan en la Fase 5, y luego podrás agregar más con el importador.", en: "Weeks 2–4 arrive in Phase 5; after that you can add more with the importer." },
};
