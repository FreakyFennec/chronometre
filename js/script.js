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

    chronoButton.textContent =
      "⏱️ " + activiteActuelle;

    chronoMenu.classList.remove("open");

  });

});

// ===========================================================================
// Gestion du panneau latéral "Timer"
// ============================================================================

const timerPanel = document.getElementById("timerPanel");
const openTimerButton = document.getElementById("openTimer");
const closeTimerButton = document.getElementById("closeTimer");

function updateTimerButton() {
  if (timerPanel.classList.contains("open")) {
    openTimerButton.textContent = "❌ Fermer";
  } else {
    openTimerButton.textContent = "⏲️ Timer";
  }
}


function openTimer() {
  timerPanel.classList.add("open");
  updateTimerButton();
}


function closeTimer() {
  timerPanel.classList.remove("open");
  updateTimerButton();
}


openTimerButton.addEventListener("click", () => {

  if (timerPanel.classList.contains("open")) {
    closeTimer();
  } else {
    openTimer();
  }

});


closeTimerButton.addEventListener("click", closeTimer);

updateTimerButton();

const timerActionButton = document.getElementById("timerAction");

let timerInterval = null;
let timerRestant = 0;
let timerEnCours = false;


timerActionButton.addEventListener("click", () => {

  if (timerEnCours) {

    // Arrêter le timer
    clearInterval(timerInterval);

    timerInterval = null;
    timerEnCours = false;

    timerActionButton.textContent = "Démarrer";

    return;
  }

  // Démarrer le timer
  const minutes = Number(
    document.getElementById("timerDuration").value
  );

  if (minutes <= 0) {
    return;
  }

  timerRestant = minutes * 60;

  updateTimerDisplay();

  timerEnCours = true;
  timerActionButton.textContent = "Arrêter";

  timerInterval = setInterval(() => {

    timerRestant--;

    updateTimerDisplay();

    console.log("Temps restant :", timerRestant);


    if (timerRestant <= 0) {

      clearInterval(timerInterval);
      timerEnCours = false;
      timerInterval = null;

      updateTimerDisplay();

      timerActionButton.textContent = "Démarrer";


      console.log("Timer terminé");
    }

  }, 1000);

});

// Affichage du temps restant
const timerDisplay = document.getElementById("timerDisplay");

function updateTimerDisplay() {
  const minutes = Math.floor(timerRestant / 60);
  const secondes = timerRestant % 60;

  const texte =
    `${String(minutes).padStart(2, "0")}:${String(secondes).padStart(2, "0")}`;

  console.log(texte);

  timerDisplay.textContent = texte;
}


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

  if (
    timerPanel.classList.contains("open") &&
    !timerPanel.contains(event.target) &&
    event.target !== openTimerButton
  ) {
    timerPanel.classList.remove("open");
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
    }
  );
}

function onPointerDown(event) {
  if (!modele) return;

  const rect = renderer.domElement.getBoundingClientRect();

  souris.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;

  souris.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(souris, camera);

  const intersections = raycaster.intersectObject(modele, true);

  for (let i = 0; i < intersections.length; i++) {
    let objet = intersections[i].object;

    while (objet) {
      if (objet.name.includes("bouton-start-stop-01")) {

        startStop();

        return;
      }

      if (objet.name.includes("bouton-reset-01")) {

        resetChrono();

        return;
      }

      objet = objet.parent;
    }
  }

  if (
    timerPanel.classList.contains("open") &&
    !timerPanel.contains(event.target) &&
    event.target !== openTimerButton
  ) {
    closeTimer();
  }
}

async function startStop() {
  if (!enMarche) {
    if (activiteActuelle === "") {

      return;
    }

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
