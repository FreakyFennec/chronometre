// history.js

import { getSessions } from "./database.js";

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
  const container = document.getElementById("history");

  if (!container) return;

  const sessions = await getSessions();

  // Création d'une copie du tableau
  const sortedSessions = [...sessions];

  // Tri : de la plus récente à la plus ancienne
  sortedSessions.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  container.innerHTML = "";

  if (sortedSessions.length === 0) {
    container.textContent = "Aucune session enregistrée.";
    return;
  }

  const ul = document.createElement("ul");

  sortedSessions.forEach((session) => {
    const li = document.createElement("li");

    li.textContent =
      `${session.activite} — ` +
      `${formatDuree(session.duree)} — ` +
      `${formatDate(session.date)}`;

    ul.appendChild(li);
  });

  container.appendChild(ul);
}