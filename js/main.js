import { APP_NAME, DEFAULTS } from "./config.js";
import { dom } from "./dom.js";
import {
  state,
  setUserName,
  setCurrentRoom,
  togglePresence,
  setParticipants,
  setAppReady,
} from "./state.js";
import {
  setText,
  setStatus,
  normalizeRoomCode,
  createRoomCode,
  escapeHtml,
} from "./utils.js";

function updatePresenceBadge(element, isActive) {
  if (!element) return;

  element.textContent = isActive ? "An" : "Aus";
  element.classList.remove("online", "offline");
  element.classList.add(isActive ? "online" : "offline");
}

function renderPresence() {
  updatePresenceBadge(dom.visualStatus, state.presence.visual);
  updatePresenceBadge(dom.speakerStatus, state.presence.speaker);
  updatePresenceBadge(dom.micStatus, state.presence.mic);
}

function renderRoomInfo() {
  setText(dom.currentRoomLabel, state.currentRoom || "–");
  setText(
    dom.workStatusLabel,
    state.currentRoom ? "Raum vorbereitet" : "Niemand arbeitet"
  );
}

function renderParticipants() {
  if (!dom.participantsList || !dom.participantCountBadge) return;

  const count = state.participants.length;
  setText(dom.participantCountBadge, String(count));

  if (count === 0) {
    dom.participantsList.innerHTML = `
      <div class="empty-state">Noch keine Teilnehmer geladen.</div>
    `;
    return;
  }

  dom.participantsList.innerHTML = state.participants
    .map((participant) => {
      const name = escapeHtml(participant.name || "Unbekannt");
      const room = escapeHtml(participant.room || "–");
      const visual = participant.visual ? "Visuell an" : "Visuell aus";
      const speaker = participant.speaker ? "Lautsprecher an" : "Lautsprecher aus";
      const mic = participant.mic ? "Mikro an" : "Mikro aus";

      return `
        <div class="participant-card">
          <div class="participant-name">${name}</div>
          <div class="participant-meta">
            <span>Raum: ${room}</span>
            <span>${visual}</span>
            <span>${speaker}</span>
            <span>${mic}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function seedLocalParticipantPreview() {
  if (!state.currentUser.name) {
    setParticipants([]);
    renderParticipants();
    return;
  }

  setParticipants([
    {
      name: state.currentUser.name,
      room: state.currentRoom || "–",
      visual: state.presence.visual,
      speaker: state.presence.speaker,
      mic: state.presence.mic,
    },
  ]);

  renderParticipants();
}

function handleCreateRoom() {
  const name = dom.nameInput?.value?.trim() || "";
  if (!name) {
    setStatus(dom.statusBox, "Bitte zuerst deinen Namen eingeben.", true);
    dom.nameInput?.focus();
    return;
  }

  const roomCode = createRoomCode(DEFAULTS.roomPrefix);

  setUserName(name);
  setCurrentRoom(roomCode);

  if (dom.roomInput) {
    dom.roomInput.value = roomCode;
  }

  renderRoomInfo();
  seedLocalParticipantPreview();

  setStatus(
    dom.statusBox,
    `Raum ${roomCode} wurde lokal vorbereitet. Im nächsten Schritt verbinden wir ihn mit Supabase.`
  );
}

function handleJoinRoom() {
  const name = dom.nameInput?.value?.trim() || "";
  const roomCode = normalizeRoomCode(dom.roomInput?.value || "");

  if (!name) {
    setStatus(dom.statusBox, "Bitte zuerst deinen Namen eingeben.", true);
    dom.nameInput?.focus();
    return;
  }

  if (!roomCode) {
    setStatus(dom.statusBox, "Bitte einen Raumcode eingeben.", true);
    dom.roomInput?.focus();
    return;
  }

  setUserName(name);
  setCurrentRoom(roomCode);

  if (dom.roomInput) {
    dom.roomInput.value = roomCode;
  }

  renderRoomInfo();
  seedLocalParticipantPreview();

  setStatus(
    dom.statusBox,
    `Beitritt zu ${roomCode} lokal vorbereitet. Im nächsten Schritt wird daraus der echte Raumzugang.`
  );
}

function handleTogglePresence(type) {
  togglePresence(type);
  renderPresence();
  seedLocalParticipantPreview();

  const labels = {
    visual: "Visuell verbunden",
    speaker: "Lautsprecher",
    mic: "Mikrofon",
  };

  const currentValue = state.presence[type] ? "aktiv" : "inaktiv";
  setStatus(dom.statusBox, `${labels[type]} ist jetzt ${currentValue}.`);
}

function bindEvents() {
  dom.createRoomBtn?.addEventListener("click", handleCreateRoom);
  dom.joinRoomBtn?.addEventListener("click", handleJoinRoom);

  dom.toggleVisualBtn?.addEventListener("click", () => handleTogglePresence("visual"));
  dom.toggleSpeakerBtn?.addEventListener("click", () => handleTogglePresence("speaker"));
  dom.toggleMicBtn?.addEventListener("click", () => handleTogglePresence("mic"));

  dom.nameInput?.addEventListener("input", (event) => {
    setUserName(event.target.value);
    seedLocalParticipantPreview();
  });

  dom.roomInput?.addEventListener("blur", () => {
    if (!dom.roomInput) return;
    dom.roomInput.value = normalizeRoomCode(dom.roomInput.value);
  });
}

function init() {
  document.title = APP_NAME;

  bindEvents();
  renderPresence();
  renderRoomInfo();
  renderParticipants();

  setAppReady(true);

  setStatus(dom.statusBox, DEFAULTS.statusMessage);
  console.log(`${APP_NAME} gestartet`, state);
}

init();
