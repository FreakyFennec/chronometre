import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";

const loader = new GLTFLoader();

export function loadChronometre() {
  return new Promise((resolve, reject) => {

    loader.load(
      "models/chronometre-01.glb",

      (gltf) => {

        const modele = gltf.scene;

        const elements = {
          modele,
          trotteuseSecondes: null,
          trotteuseMinutes: null
        };

        modele.traverse((obj) => {

          if (obj.name.includes("trotteuse-01")) {
            elements.trotteuseSecondes = obj;
          }

          if (obj.name.includes("trotteuse-02")) {
            elements.trotteuseMinutes = obj;
          }

          if (obj.isMesh) {
            obj.geometry.computeVertexNormals();
          }

        });

        resolve(elements);

      },

      undefined,

      (erreur) => {
        reject(erreur);
      }
    );

  });
}