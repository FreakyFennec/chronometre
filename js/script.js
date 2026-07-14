import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { createSession } from "./session.js";
import { saveSession } from "./database.js";
import { initHistory, displayHistory } from "./history.js";

// Variables globales
let scene;
let camera;
let renderer;
let controls;
let environnementPret = false;

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
const chronoButton = document.getElementById("openChrono");
const chronoMenu = document.getElementById("chronoMenu");

const activityButtons = document.querySelectorAll(
  "#chronoMenu button"
);

chronoButton.addEventListener("click", () => {
  chronoMenu.classList.toggle("open");
});


activityButtons.forEach((button) => {

  button.addEventListener("click", () => {

    activiteActuelle = button.dataset.activity;

    console.log(
      "Activité choisie :",
      activiteActuelle
    );

    chronoButton.textContent =
      "⏱️ " + activiteActuelle;

    chronoMenu.classList.remove("open");

  });

});

// ===========================================================================
// Gestion du panneau latéral "Timer"
// ============================================================================

const timerButton = document.getElementById("openTimer");

timerButton.addEventListener("click", () => {

  const timerPanel = document.getElementById("timerPanel");

  timerPanel.classList.toggle("open");

});

// ============================================================================
// Gestion du panneau latéral "Historique"
// ============================================================================

// Récupération des éléments HTML
const historyPanel = document.getElementById("history");
const openHistoryButton = document.getElementById("openHistory");
const closeButton = document.getElementById("closeHistory");

/**
 * Met à jour le texte du bouton principal.
 * - Si le panneau est ouvert : "❌ Fermer"
 * - Sinon : "📜 Historique"
 */
function updateHistoryButton() {
  if (historyPanel.classList.contains("open")) {
    openHistoryButton.textContent = "❌ Fermer";
  } else {
    openHistoryButton.textContent = "📜 Historique";
  }
}

/**
 * Ouvre le panneau latéral.
 */
function openHistory() {
  historyPanel.classList.add("open");
  updateHistoryButton();
}

/**
 * Ferme le panneau latéral.
 */
function closeHistory() {
  historyPanel.classList.remove("open");
  updateHistoryButton();
}

/**
 * Ouvre ou ferme le panneau lorsque
 * l'utilisateur clique sur le bouton.
 */
openHistoryButton.addEventListener("click", () => {

  if (historyPanel.classList.contains("open")) {
    closeHistory();
  } else {
    openHistory();
  }

});

/**
 * Fermeture avec le bouton ✕
 */
closeButton.addEventListener("click", closeHistory);

/**
 * Fermeture lorsqu'on clique
 * à l'extérieur du panneau.
 */
document.addEventListener("pointerdown", (event) => {

  if (
    historyPanel.classList.contains("open") &&
    !historyPanel.contains(event.target) &&
    event.target !== openHistoryButton
  ) {
    closeHistory();
  }

});

/**
 * Initialise le texte du bouton
 * au chargement de la page.
 */
updateHistoryButton();


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

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;

  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.setSize(window.innerWidth, window.innerHeight);

  document.getElementById("scene").appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true;

  window.addEventListener("pointerdown", onPointerDown);


  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const rgbeLoader = new RGBELoader();

  rgbeLoader.load(
    "textures/environment/studio_small_08_2k.hdr",
    (texture) => {

      const envMap = pmremGenerator.fromEquirectangular(texture).texture;

      scene.environment = envMap;
      scene.environmentIntensity = 0.4;

      // scene.background = envMap;

      environnementPret = true;

      if (modele) {
        modele.visible = true;
      }

      texture.dispose();
      pmremGenerator.dispose();
    }
  );

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

      modele.visible = false;
      scene.add(modele);

      const boite = new THREE.Box3().setFromObject(modele);

      modele.traverse((obj) => {
        if (obj.name.includes("trotteuse-01")) {
          trotteuseSecondes = obj;
        }

        if (obj.name.includes("trotteuse-02")) {
          trotteuseMinutes = obj;
        }

        if (obj.isMesh) {
          obj.geometry.computeVertexNormals();
        }
      });

      const centre = boite.getCenter(new THREE.Vector3());

      const taille = boite.getSize(new THREE.Vector3());

      modele.position.sub(centre);

      const max = Math.max(taille.x, taille.y, taille.z);

      const echelle = 20 / max;

      modele.scale.setScalar(echelle);

      const boiteCentre = new THREE.Box3().setFromObject(modele);

      const nouveauCentre = boiteCentre.getCenter(new THREE.Vector3());

      modele.position.sub(nouveauCentre);

      const boite2 = new THREE.Box3().setFromObject(modele);
      const taille2 = boite2.getSize(new THREE.Vector3());

      camera.position.set(0, 0, taille2.y * 2.5);

      camera.lookAt(0, 0, 0);


      // Ici seulement le modèle existe
      if (environnementPret) {
        modele.visible = true;
      }

      console.log("Objets présents :");
    }
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

      console.log("Aucune activité sélectionnée.");

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

    // Enregistrement de la session dans IndexedDB
    await saveSession(session);

    // Mise à jour de l'affichage de l'historique
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
