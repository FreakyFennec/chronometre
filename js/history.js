// js/history.js

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

  const sessions = await getSessions();

  const container = document.getElementById("historyContent");

  if (!container) return;

  container.innerHTML = "";

  // Lecture directe du filtre actuel
  const select = document.getElementById("filtreActivite");

  const filtreActuel = select ? select.value : "";


  // Copie + tri récent vers ancien
  const sortedSessions = [...sessions].sort((a, b) => {

    return new Date(b.date) - new Date(a.date);

  });


  // Filtrage
  const filteredSessions = sortedSessions.filter(session => {

    if (filtreActuel === "") {
      return true;
    }

    return session.activite === filtreActuel;

  });


  if (filteredSessions.length === 0) {

    container.innerHTML =
      "<p class='history-message'>Aucune session enregistrée pour cette activité.</p>";

    return;
  }


  const cards = document.createElement("div");

  cards.className = "history-cards";


  filteredSessions.forEach((session) => {

    const card = document.createElement("div");

    card.className = `session-card ${session.activite}`;

    card.innerHTML = `

      <div class="session-header">

        <span class="session-activity">
          ${session.activite}
        </span>

        <span class="session-date">
          ${formatDate(session.date)}
        </span>
      </div>

      <div class="session-duration">
        ${formatDuree(session.duree)}
      </div>
    `;

    cards.appendChild(card);
  });

  container.appendChild(cards);
}


function initHistoryFilter() {

  const select = document.getElementById("filtreActivite");

  if (!select) return;

  select.addEventListener("change", () => {
    displayHistory();
  });
}


export function initHistory() {

  initHistoryFilter();
  displayHistory();
}