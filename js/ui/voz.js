// =========================================================
// VOZ SINTÉTICA (Web Speech API) y GRABACIÓN (MediaRecorder)
// Todo se detecta: si el navegador no lo soporta, la web
// oculta la función en vez de romperse.
// =========================================================

export const hayVoz = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
export const hayGrabacion = !!(navigator.mediaDevices?.getUserMedia) && "MediaRecorder" in window;

// La lista de voces llega de forma asíncrona en algunos navegadores
// (Chrome). Esta función espera hasta 2 s al evento "voiceschanged".
export function obtenerVoces() {
  if (!hayVoz) return Promise.resolve([]);
  return new Promise(resolve => {
    const voces = speechSynthesis.getVoices();
    if (voces.length) return resolve(voces);
    const listo = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener("voiceschanged", listo, { once: true });
    setTimeout(listo, 2000);
  });
}

// Voces en inglés de un acento (ej. "en-US", "en-GB")
export function vocesDeAcento(voces, acento) {
  const norm = l => (l || "").replace("_", "-").toLowerCase();
  return voces.filter(v => norm(v.lang).startsWith(acento.toLowerCase()));
}

// Elige la mejor voz según los ajustes del usuario
export function elegirVoz(voces, ajustes = {}) {
  const ingles = voces.filter(v => /^en[-_]/i.test(v.lang));
  return ingles.find(v => v.name === ajustes.vozNombre)
      || vocesDeAcento(ingles, ajustes.acento || "en-US")[0]
      || ingles[0]
      || null;
}

// Lee un texto en voz alta con los ajustes del usuario.
// Devuelve una promesa que se cumple cuando termina de hablar.
// opciones.voz2 = true usa una segunda voz (para diálogos de 2 personas).
export async function hablar(texto, ajustes = {}, opciones = {}) {
  if (!hayVoz || !texto) return;
  const voces = await obtenerVoces();
  if (!opciones.encolar) speechSynthesis.cancel(); // detiene lo que estuviera sonando
  const frase = new SpeechSynthesisUtterance(texto);
  let voz = elegirVoz(voces, ajustes);
  if (opciones.voz2) {
    const otras = vocesDeAcento(voces, ajustes.acento || "en-US").filter(v => v !== voz);
    voz = otras[0] || voz;
  }
  if (voz) frase.voice = voz;
  frase.lang = voz?.lang || ajustes.acento || "en-US";
  frase.rate = ajustes.velocidadVoz || 1;
  return new Promise(resolve => {
    frase.onend = resolve;
    frase.onerror = resolve;
    // Seguridad: si el navegador nunca avisa el final, seguimos igual
    setTimeout(resolve, 2000 + texto.length * 150);
    speechSynthesis.speak(frase);
  });
}
