import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createSession } from "./session.js";
import { saveSession, getSessions } from "./database.js";
import { initHistory, displayHistory } from "./history.js";

// Variables globales
let scene;
let camera;
let renderer;
let controls;

let modele;

let trotteuseMinutes;
let trotteuseSecondes;


const raycaster = new THREE.Raycaster();

const souris = new THREE.Vector2();

let enMarche = false;
let debut = 0;
let temps = 0;

let activiteActuelle = "";

// Interface HTML
const selectActivite = document.getElementById("activite");

selectActivite.addEventListener("change", () => {
  activiteActuelle = selectActivite.value;

  console.log("Activité choisie :", activiteActuelle);
});

// Démarrage de l'application
init();

function init() {
  scene = new THREE.Scene();

  scene.background = new THREE.Color(0x202020);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.01,
    1000,
  );

  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });

  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.setSize(window.innerWidth, window.innerHeight);

  document.getElementById("scene").appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true;

  window.addEventListener("pointerdown", onPointerDown);

  const ambiante = new THREE.AmbientLight(0xffffff, 2);

  scene.add(ambiante);

  const soleil = new THREE.DirectionalLight(
    0xffffff,

    4,
  );

  soleil.position.set(5, 5, 5);

  scene.add(soleil);

  chargerGLB();

  animate();

  window.addEventListener("resize", resize);

  initHistory();
}

function chargerGLB() {
  const loader = new GLTFLoader();

  loader.load(
    "models/chronometre-01.glb",

    (gltf) => {
      modele = gltf.scene;

      scene.add(modele);

      const boite = new THREE.Box3().setFromObject(modele);

      modele.traverse((obj) => {
        if (obj.name.includes("trotteuse-01")) {
          trotteuseSecondes = obj;

          console.log("Trotteuse secondes trouvée :", obj.name);
        }

        if (obj.name.includes("trotteuse-02")) {
          trotteuseMinutes = obj;

          console.log("Trotteuse minutes trouvée :", obj.name);
        }
      });

      const centre = boite.getCenter(new THREE.Vector3());

      const taille = boite.getSize(new THREE.Vector3());

      modele.position.sub(centre);

      const max = Math.max(taille.x, taille.y, taille.z);

      const echelle = 20 / max;

      modele.scale.setScalar(echelle);

      // Recentrage après mise à l'échelle
      const boiteCentre = new THREE.Box3().setFromObject(modele);

      const nouveauCentre = boiteCentre.getCenter(new THREE.Vector3());

      modele.position.sub(nouveauCentre);

      // Recalcule la boîte après mise à l'échelle
      const boite2 = new THREE.Box3().setFromObject(modele);
      const taille2 = boite2.getSize(new THREE.Vector3());

      camera.position.set(0, 0, taille2.y * 2.5);

      camera.lookAt(0, 0, 0);

      camera.lookAt(0, 0, 0);

      console.log("Objets présents :");

      modele.traverse((obj) => {
        console.log(obj.name);
      });
    },

    (xhr) => {
      console.log(
        Math.round((xhr.loaded / xhr.total) * 100),

        "%",
      );
    },

    (error) => {
      console.error(error);
    },
  );
}

function onPointerDown(event) {
  console.log("CLICK");

  if (!modele) return;

  const rect = renderer.domElement.getBoundingClientRect();

  souris.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;

  souris.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(souris, camera);

  const intersections = raycaster.intersectObject(modele, true);

  console.log("Intersections :", intersections.length);

  for (let i = 0; i < intersections.length; i++) {
    let objet = intersections[i].object;

    console.log("Test objet :", objet.name);

    while (objet) {
      if (objet.name.includes("bouton-start-stop-01")) {
        console.log("START détecté");

        startStop();

        return;
      }

      if (objet.name.includes("bouton-reset-01")) {
        console.log("RESET détecté");

        resetChrono();

        return;
      }

      objet = objet.parent;
    }
  }
}

async function startStop() {
  if (!enMarche) {
    if (activiteActuelle === "") {
      console.log("Aucune activité sélectionnée. Veuillez en choisir une.");
      return;
    }

    console.log("Demarrage :", activiteActuelle);
    debut = performance.now() - temps;
    enMarche = true;
  } else {
    temps = performance.now() - debut;
    enMarche = false;

    const session = createSession(
      activiteActuelle,
      temps
    );

    saveSession(session);
    await saveSession(session);
    displayHistory();
  }
}

function resetChrono() {
  enMarche = false;
  temps = 0;
  debut = 0;

  if (trotteuseSecondes) {
    trotteuseSecondes.rotation.z = 0;
  }

  if (trotteuseMinutes) {
    trotteuseMinutes.rotation.z = 0;
  }
}

function updateChrono() {
  if (enMarche) {
    temps = performance.now() - debut;
  }

  const minutes = Math.floor(temps / 60000);

  const secondes = Math.floor(temps / 1000) % 60;

  const centiemes = Math.floor((temps % 1000) / 10);

  if (trotteuseMinutes) {
    const minutesAiguille = Math.floor(temps / 60000);

    const angle = -minutesAiguille * ((Math.PI * 2) / 60);

    trotteuseMinutes.rotation.z = angle;
  }
  if (trotteuseSecondes) {
    const secondes = Math.floor(temps / 1000);

    const angle = -secondes * ((Math.PI * 2) / 60);

    trotteuseSecondes.rotation.z = angle;
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (controls) controls.update();

  updateChrono();

  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,

    window.innerHeight,
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",

    () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .then(() => {
          console.log("Service Worker enregistré");
        })
        .catch((err) => {
          console.error(err);
        });
    },
  );
}
