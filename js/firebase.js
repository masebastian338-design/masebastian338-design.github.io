// =========================================================
// CONEXIÓN A FIREBASE
// Carga el SDK oficial directamente desde el CDN de Google
// (sin npm ni instalaciones). Se carga solo si hay configuración.
// =========================================================
import { firebaseConfig, FIREBASE_VERSION } from "./config.js";

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

// Guardamos aquí las funciones de Firebase para usarlas en otros archivos.
export const fb = {};

export async function iniciarFirebase() {
  // import() dinámico: descarga los módulos solo cuando hacen falta
  const appMod = await import(`${CDN}/firebase-app.js`);
  const authMod = await import(`${CDN}/firebase-auth.js`);
  const fsMod = await import(`${CDN}/firebase-firestore.js`);

  const app = appMod.initializeApp(firebaseConfig);

  // Firestore con caché local: guarda una copia en el dispositivo para
  // que la web funcione sin internet y sincronice al reconectarse.
  // persistentMultipleTabManager permite tener varias pestañas abiertas.
  let db;
  try {
    db = fsMod.initializeFirestore(app, {
      localCache: fsMod.persistentLocalCache({
        tabManager: fsMod.persistentMultipleTabManager(),
      }),
    });
  } catch (e) {
    // Si el navegador no permite la caché (p. ej. modo privado), usamos memoria.
    console.warn("Caché offline no disponible:", e);
    db = fsMod.getFirestore(app);
  }

  const auth = authMod.getAuth(app);
  // Mantener la sesión iniciada aunque se cierre el navegador
  await authMod.setPersistence(auth, authMod.browserLocalPersistence);

  Object.assign(fb, { app, auth, db, authMod, fsMod });
  return fb;
}
