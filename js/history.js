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

  container.innerHTML = "";

  if (sessions.length === 0) {
    container.textContent = "Aucune session enregistrée.";
    return;
  }

  const ul = document.createElement("ul");

  sessions.forEach((session) => {
    const li = document.createElement("li");

    li.textContent =
      `${session.activite} — ` +
      `${formatDuree(session.duree)} — ` +
      `${formatDate(session.date)}`;

    ul.appendChild(li);
  });

  container.appendChild(ul);
}