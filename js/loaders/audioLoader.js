// js/loaders/audioLoader.js

export function loadAudio(path) {

  return new Promise((resolve, reject) => {

    const audio = new Audio();

    audio.src = path;
    audio.preload = "auto";

    audio.addEventListener("canplaythrough", () => {
      resolve(audio);
    });

    audio.addEventListener("error", () => {
      console.error("Impossible de charger :", path);
      reject(new Error(`Erreur de chargement : ${path}`));
    });
  });
}