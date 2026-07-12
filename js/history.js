// history.js

import { getSessions } from "./database.js";

console.log("history.js chargé");

let filtreActuel = "";

function formatDuree(ms) {
  const minutes = Math.floor(ms / 60000);
  const secondes = Math.floor((ms % 60000) / 1000);
  const centiemes = Math.floor((ms % 1000) / 10);

  return `${String(minutes).padStart(2, "0")}:${String(secondes).padStart(2, "0")}.${String(centiemes).padStart(2, "0")}`;
}

function formatDate(dateISO) {
  return new Date(dateISO).toLocaleString("fr-FR");
}

export async function displayHistory() {
  console.log("displayHistory appelé");

  const container = document.getElementById("history");

  console.log("container :", container);

  if (!container) return;

  const sessions = await getSessions();

  // Création d'une copie du tableau
  const sortedSessions = [...sessions];

  // Tri : de la plus récente à la plus ancienne
  sortedSessions.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  // Application du filtre
  const filteredSessions = filtrerSessions(sortedSessions);

  container.innerHTML = "";

  if (filtreActuel === "") {
    container.textContent = "Sélectionnez un filtre";
    return;
  }

  if (filteredSessions.length === 0) {
    container.textContent = "Aucune session enregistrée pour cette activité.";
    return;
  }

  const ul = document.createElement("ul");

  filteredSessions.forEach((session) => {
    const li = document.createElement("li");

    li.textContent =
      `${session.activite} — ` +
      `${formatDuree(session.duree)} — ` +
      `${formatDate(session.date)}`;

    ul.appendChild(li);
  });

  container.appendChild(ul);
}

function filtrerSessions(sessions) {
  if (filtreActuel === "") {
    return [];
  }

  return sessions.filter((session) => {
    return session.activite === filtreActuel;
  });
}

// Ecouter le changement du filtre
function initHistoryFilter() {
  const select = document.getElementById("filtreActivite");

  if (!select) return;

  select.addEventListener("change", () => {
    filtreActuel = select.value;

    displayHistory();
  });
}

// Initialiser le filtre à l'ouverture de la page
export function initHistory() {
  console.log("Initialisation de l'historique");

  initHistoryFilter();
  displayHistory();
}
