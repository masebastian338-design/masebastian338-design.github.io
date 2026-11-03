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
  "inicio.sinDiag":   { es: "Aún sin diagnóstico. Lo harás en la Fase 4.", en: "No placement test yet (coming in Phase 4)." },
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
};
