import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { createSession } from "./session.js";
import { saveSession } from "./database.js";
import { initHistory, displayHistory } from "./history.js";
import { loadChronometre } from "./loaders/modelLoader.js";
import { loadAudio } from "./loaders/audioLoader.js";

// ============================================================================
// Variables globales
// ============================================================================

// Scène Three.js
let scene;
let camera;
let renderer;
let controls;

let environnementPret = false;

// Modèle 3D
let modele;
let trotteuseMinutes;
let trotteuseSecondes;

// Détection des clics sur le modèle
const raycaster = new THREE.Raycaster();
const souris = new THREE.Vector2();

// État du chronomètre
let enMarche = false;
let debut = 0;
let temps = 0;

// Empêche les interactions avec le chrono lorsque le timer est ouvert
let chronoInteractif = true;

let tempsSession = 0;

// ============================================================================
// Menu de choix de l'activité (après arrêt du chrono)
// ============================================================================

const chronoButton = document.getElementById("openChrono");
const chronoMenu = document.getElementById("chronoMenu");

const activityButtons = document.querySelectorAll(
  "#chronoMenu button"
);

// Ouvre ou ferme le menu manuellement
chronoButton.addEventListener("click", async () => {

  // Débloque le chargement audio après une interaction utilisateur
  if (!sonChrono || !sonFin) {
    await chargerSons();
  }

  chronoMenu.classList.toggle("open");

  updateChronoButton();

});

// Choix de l'activité après une session
activityButtons.forEach((button) => {

  button.addEventListener("click", async () => {

    closeChrono();

    // Bouton "Ne pas enregistrer"
    if (button.dataset.activity === "") {
      tempsSession = 0;
      resetChrono();
      return;
    }

    // Ne pas enregistrer une session vide
    if (button.dataset.activity <= 0) {
      resetChrono();
      return;
    }

    const session = createSession(
      button.dataset.activity,
      tempsSession
    );

    await saveSession(session);

    await displayHistory();

    tempsSession = 0;
    resetChrono();
  });
});

// Met à jour le texte du bouton
function updateChronoButton() {

  chronoButton.textContent =
    chronoMenu.classList.contains("open")
      ? "❌ Fermer"
      : "⏱️ Chrono";

}

// Ouvre le menu
function openChrono() {

  chronoMenu.classList.add("open");

  updateChronoButton();

}

// Ferme le menu
function closeChrono() {

  chronoMenu.classList.remove("open");

  updateChronoButton();

}

// ===========================================================================
// Pour le son
// ===========================================================================

let sonChrono = null;
let sonFin = null;

async function chargerSons() {


  if (sonChrono && sonFin) {
    return;
  }

  sonChrono = await loadAudio("./sounds/chrono.mp3");
  sonChrono.loop = true;

  sonFin = await loadAudio("./sounds/klaxon-oogah.mp3");
  sonFin.loop = false;
}

chargerSons();

function startSound() {
  console.log("startSound");

  if (!sonChrono) {
    console.log("son pas chargé");
    return;
  }

  sonChrono.currentTime = 0;

  sonChrono.play()
    .then(() => {
      console.log("son démarré");
    })
    .catch((error) => {
      console.error("lecture audio bloquée :", error);
    });
}

function stopSound() {
  if (!sonChrono) return;

  sonChrono.pause();
  sonChrono.currentTime = 0;
}

function playEndSound() {
  console.log("playEndSound");

  if (!sonFin) {
    console.log("Son de fin non chargé");
    return;
  }

  console.log(sonFin.src);

  sonFin.pause(); // S'il était en cours
  sonFin.currentTime = 0;

  sonFin.play()
    .then(() => {
      console.log("Son de fin joué");
    })
    .catch((error) => {
      console.error("Lecture audio bloquée : ", error);
    });
}

// ===========================================================================
// Gestion du panneau "Timer"
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

// Pour gérer l'activation ou non du chrono
function openTimer() {
  timerPanel.classList.add("open");
  chronoInteractif = false;
  updateTimerButton();
}

function closeTimer() {
  timerPanel.classList.remove("open");
  chronoInteractif = true;
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

    stopSound();
    playEndSound();

    timerActionButton.textContent = "Démarrer";
    return;
  }

  // Démarrer le timer
  const minutes = Number(
    document.getElementById("timerMinutes").value
  );

  const secondes = Number(
    document.getElementById("timerSeconds").value
  );

  if(minutes === 0 && secondes === 0) {
    return;
  }

  if (secondes > 59) {
    return;
  }

  timerRestant = minutes * 60 + secondes;

  if (timerRestant <= 0) {
    return;
  }

  updateTimerDisplay();

  timerEnCours = true;
  timerActionButton.textContent = "Arrêter";

  startSound();

  timerInterval = setInterval(() => {

    timerRestant--;

    updateTimerDisplay();

    console.log("Temps restant :", timerRestant);


    if (timerRestant <= 0) {

      clearInterval(timerInterval);
      timerEnCours = false;
      timerInterval = null;

      stopSound();
      playEndSound();

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

// ============================================================================
// Gestion du panneau latéral "Historique"
// ============================================================================

// Récupération des éléments HTML
const historyPanel = document.getElementById("history");
const openHistoryButton = document.getElementById("openHistory");
const closeButton = document.getElementById("closeHistory");
const historyMenu = document.getElementById("historyMenu");


// Ouverture du menu de sélection des activités
openHistoryButton.addEventListener("click", () => {

  // Si le panneau historique est déjà ouvert : on le ferme
  if (historyPanel.classList.contains("open")) {
    closeHistory();
    return;
  }

  // Sinon on affiche le menu des activités
  historyMenu.classList.toggle("open");

});


// Choix d'une activité dans le menu
historyMenu.querySelectorAll("button").forEach(button => {

  button.addEventListener("click", () => {

    const activite = button.dataset.activity;

    // Applique le filtre dans le select du panneau historique
    document.getElementById("filtreActivite").value = activite;

    // Ferme le menu sous le bouton
    historyMenu.classList.remove("open");

    // Ouvre le panneau historique
    openHistory();

    // Recharge l'affichage filtré
    displayHistory();

  });

});


// Mise à jour du bouton principal
function updateHistoryButton() {

  if (historyPanel.classList.contains("open")) {
    openHistoryButton.textContent = "❌ Fermer";
  } else {
    openHistoryButton.textContent = "📜 History";
  }

}


// Ouvre le panneau historique
function openHistory() {

  historyPanel.classList.add("open");

  updateHistoryButton();

}


// Ferme le panneau historique
function closeHistory() {

  historyPanel.classList.remove("open");

  updateHistoryButton();

}


// Fermeture avec le bouton ✕
closeButton.addEventListener("click", closeHistory);


// Fermeture en cliquant à l'extérieur
document.addEventListener("pointerdown", (event) => {

  // Ferme le menu chrono si clic extérieur
  if (
    chronoMenu.classList.contains("open") &&
    !chronoMenu.contains(event.target) &&
    event.target !== chronoButton
  ) {
    closeChrono();
  }


  // Ferme le menu history si clic extérieur
  if (
    historyMenu.classList.contains("open") &&
    !historyMenu.contains(event.target) &&
    event.target !== openHistoryButton
  ) {
    historyMenu.classList.remove("open");
  }


  // Ferme le panneau history si clic extérieur
  if (
    historyPanel.classList.contains("open") &&
    !historyPanel.contains(event.target) &&
    event.target !== openHistoryButton
  ) {
    closeHistory();
  }


  // Ferme le timer si clic extérieur
  if (
    timerPanel.classList.contains("open") &&
    !timerPanel.contains(event.target) &&
    event.target !== openTimerButton
  ) {
    closeTimer();
  }

});

// Initialisation du bouton
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

  // chargerSons();

  prepareChronometre();

  animate();

  window.addEventListener("resize", resize);

  initHistory();
}

async function prepareChronometre() {

  const chrono = await loadChronometre();

  modele = chrono.modele;
  trotteuseSecondes = chrono.trotteuseSecondes;
  trotteuseMinutes = chrono.trotteuseMinutes;


  scene.add(modele);

  modele.visible = false;

  const boite = new THREE.Box3().setFromObject(modele);

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

  const distance = Math.max(taille2.x, taille2.y, taille2.z) * 2;

  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);

  controls.target.set(0, 0, 0);

  controls.minDistance = distance * 0.8; // l'utilisateur peut se rapprocher de 20 %
  controls.maxDistance = distance * 1.2; // il peut s'éloigner de 20 %

  controls.update();
  controls.saveState();

  // Ici seulement le modèle existe
  if (environnementPret) {
    modele.visible = true;
  }
}

function onPointerDown(event) {
  if (!chronoInteractif) return;
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

    // Démarrage immédiat
    debut = performance.now() - temps;
    enMarche = true;
    startSound();

    return;
  }

  // Arrêt chrono
  temps = performance.now() - debut;
  tempsSession = temps;

  // Sauvegarde du temps arrêté
  enMarche = false;
  stopSound();

  // Demande sous quelle activité enregistre le chrono
  openChrono();
}

function resetChrono() {
  enMarche = false;
  temps = 0;
  debut = 0;

  stopSound();

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
