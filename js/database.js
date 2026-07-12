// database.js
const DB_NAME = "ChronometreDB";
const DB_VERSION = 1;
const STORE_NAME = "sessions";


function openDatabase() {
  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      console.log("Création de la base de données...");

      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {

        console.log("Création du store :");
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true
        });
      }
    };


    request.onsuccess = () => {
      resolve(request.result);
    };


    request.onerror = () => {
      reject(request.error);
    };

  });
}



export async function saveSession(session) {

  const db = await openDatabase();

  const transaction = db.transaction(
    STORE_NAME,
    "readwrite"
  );

  const store = transaction.objectStore(STORE_NAME);

  store.add(session);

  transaction.oncomplete = () => {
    console.log("Session sauvegardée :", session);
  };

  transaction.onerror = () => {
    console.error(
      "Erreur sauvegarde :",
      transaction.error
    );
  };
}