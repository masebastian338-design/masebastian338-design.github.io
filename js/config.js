// =========================================================
// CONFIGURACIÓN DE FIREBASE
// ---------------------------------------------------------
// Este es el ÚNICO archivo que tienes que editar para conectar
// la web con tu proyecto de Firebase.
//
// Pega aquí los valores que te da la consola de Firebase en:
//   Configuración del proyecto → Tus apps → App web → "SDK setup and configuration" → Config
//
// ¿Es seguro que esto sea público? Sí. Google lo explica aquí:
//   https://firebase.google.com/docs/projects/api-keys
// La llave solo identifica el proyecto. Quien protege los datos
// son las reglas de seguridad (docs/firestore.rules).
//
// Mientras los valores digan "PEGA_AQUI", la web funciona en
// MODO DEMO (sin login, datos de prueba guardados solo en este navegador).
// =========================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCbqHj-hn7oouIUjHrOv7-7AVRHWpT7Q7U",
  authDomain: "ingles-en-pareja.firebaseapp.com",
  projectId: "ingles-en-pareja",
  storageBucket: "ingles-en-pareja.firebasestorage.app",
  messagingSenderId: "228867590919",
  appId: "1:228867590919:web:9c2932413e628ef106d3a2",
  measurementId: "G-97SH5MYRRD", // de Analytics; la web no lo usa, pero no estorba
};

// Versión fija del SDK de Firebase (no cambiar sin probar antes).
export const FIREBASE_VERSION = "12.19.0";

// ¿Ya pegaste la configuración real?
export const configurado = !firebaseConfig.apiKey.includes("PEGA_AQUI");
