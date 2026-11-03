// =========================================================
// INICIO DE SESIÓN CON GOOGLE
// ---------------------------------------------------------
// Usamos signInWithPopup (ventana emergente). Firebase documenta
// que signInWithRedirect falla en navegadores modernos cuando la
// web NO está en Firebase Hosting (nuestro caso: GitHub Pages).
// https://firebase.google.com/docs/auth/web/redirect-best-practices
// =========================================================
import { fb } from "./firebase.js";

export async function iniciarSesionGoogle() {
  const { auth, authMod } = fb;
  const proveedor = new authMod.GoogleAuthProvider();
  // Siempre mostrar el selector de cuenta (útil si hay varias cuentas en el celular)
  proveedor.setCustomParameters({ prompt: "select_account" });
  return authMod.signInWithPopup(auth, proveedor);
}

export function cerrarSesion() {
  return fb.authMod.signOut(fb.auth);
}

// Llama a callback(usuario) cada vez que cambia la sesión
export function alCambiarSesion(callback) {
  return fb.authMod.onAuthStateChanged(fb.auth, callback);
}

// Traduce los códigos de error de Firebase a mensajes claros
export function mensajeErrorLogin(error) {
  const codigo = error?.code || "";
  const mensajes = {
    "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio e inténtalo otra vez.",
    "auth/popup-closed-by-user": "Se cerró la ventana de Google antes de terminar. Inténtalo otra vez.",
    "auth/cancelled-popup-request": "Se abrió otra ventana de inicio de sesión. Inténtalo otra vez.",
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase. Agrégalo en Authentication → Configuración → Dominios autorizados.",
    "auth/network-request-failed": "No hay conexión a internet. Revisa tu red.",
    "auth/operation-not-allowed": "El inicio de sesión con Google no está activado en Firebase (Authentication → Método de acceso).",
  };
  return mensajes[codigo] || `No se pudo iniciar sesión (${codigo || error?.message || "error desconocido"}).`;
}
