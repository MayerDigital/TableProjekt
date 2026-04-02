import { APP_NAME, DEFAULTS, ROOM_TYPES } from "./config.js";
import { dom } from "./dom.js";
import {
  state,
  setUserName,
  setCurrentRoom,
  setCurrentRoomType,
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
import { getSupabaseClient } from "./supabase.js";
import {
  joinPreparedRoom,
  loadParticipants,
  subscribeParticipantsRealtime,
  updateCurrentParticipantPresence,
} from "./room.js";
import { bindChatEvents, initChatForRoom } from "./chat.js";

function getSelectedRoomType() {
  return dom.roomTypeSelect?.value || DEFAULTS.roomType;
}

function syncRoomTypeSelect() {
  if (!dom.roomTypeSelect) return;
  dom.roomTypeSelect.value = state.currentRoomType || DEFAULTS.roomType;
}

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
  const roomTypeLabel =
    ROOM_TYPES[state.currentRoomType] || ROOM_TYPES[DEFAULTS.roomType] || "Bereich";

  setText(
    dom.currentRoomLabel,
    state.currentRoom ? `${state.currentRoom} · ${roomTypeLabel}` : "–"
  );

  setText(
    dom.workStatusLabel,
    state.currentRoom
      ? state.realtimeReady
        ? "Raum live verbunden"
        : "Raum vorbereitet"
      : "Niemand arbeitet"
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
      const working = participant.working ? "Arbeitet gerade" : "Beobachtet";

      return `
        <div class="participant-card">
          <div class="participant-name">${name}</div>
          <div class="participant-meta">
            <span>Raum: ${room}</span>
            <span>${visual}</span>
            <span>${speaker}</span>
            <span>${mic}</span>
            <span>${working}</span>
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
      working: false,
    },
  ]);

  renderParticipants();
}

async function connectToRoom(roomCode, name, mode = "join") {
  try {
    const selectedRoomType = getSelectedRoomType();

    setStatus(dom.statusBox, "Verbinde mit Supabase …");
    setUserName(name);
    setCurrentRoom(roomCode);
    setCurrentRoomType(selectedRoomType);
    renderRoomInfo();

    const result = await joinPreparedRoom({
      roomCode,
      name,
      presence: state.presence,
      roomType: selectedRoomType,
    });

    const actualRoomType =
      result?.room?.room_type || selectedRoomType || DEFAULTS.roomType;

    setCurrentRoomType(actualRoomType);
    syncRoomTypeSelect();

    await loadParticipants(roomCode);
    renderParticipants();

    subscribeParticipantsRealtime(roomCode, () => {
      renderRoomInfo();
      renderParticipants();
    });

    await initChatForRoom(roomCode);

    renderRoomInfo();
    renderParticipants();

    const roomTypeLabel =
      ROOM_TYPES[state.currentRoomType] || ROOM_TYPES[DEFAULTS.roomType] || "Bereich";

    const actionText =
      mode === "create"
        ? `Raum ${roomCode} (${roomTypeLabel}) wurde erstellt und live verbunden.`
        : `Du bist dem Raum ${roomCode} (${roomTypeLabel}) live beigetreten.`;

    setStatus(dom.statusBox, actionText);
  } catch (error) {
    console.error(error);
    setStatus(
      dom.statusBox,
      `Supabase-Fehler: ${error.message || "Verbindung fehlgeschlagen."}`,
      true
    );
  }
}

function handleCreateRoom() {
  const name = dom.nameInput?.value?.trim() || "";

  if (!name) {
    setStatus(dom.statusBox, "Bitte zuerst deinen Namen eingeben.", true);
    dom.nameInput?.focus();
    return;
  }

  const roomCode = createRoomCode(DEFAULTS.roomPrefix);

  if (dom.roomInput) {
    dom.roomInput.value = roomCode;
  }

  connectToRoom(roomCode, name, "create");
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

  if (dom.roomInput) {
    dom.roomInput.value = roomCode;
  }

  connectToRoom(roomCode, name, "join");
}

async function handleTogglePresence(type) {
  togglePresence(type);
  renderPresence();

  if (!state.currentUser.participantId) {
    seedLocalParticipantPreview();
  }

  try {
    if (state.currentUser.participantId) {
      await updateCurrentParticipantPresence();

      if (state.currentRoom) {
        await loadParticipants(state.currentRoom);
        renderParticipants();
      }
    }

    const labels = {
      visual: "Visuell verbunden",
      speaker: "Lautsprecher",
      mic: "Mikrofon",
    };

    const currentValue = state.presence[type] ? "aktiv" : "inaktiv";
    setStatus(dom.statusBox, `${labels[type]} ist jetzt ${currentValue}.`);
  } catch (error) {
    console.error(error);
    setStatus(
      dom.statusBox,
      `Präsenz konnte nicht gespeichert werden: ${error.message || "Fehler"}`,
      true
    );
  }
}

function bindEvents() {
  dom.createRoomBtn?.addEventListener("click", handleCreateRoom);
  dom.joinRoomBtn?.addEventListener("click", handleJoinRoom);

  dom.toggleVisualBtn?.addEventListener("click", () => handleTogglePresence("visual"));
  dom.toggleSpeakerBtn?.addEventListener("click", () => handleTogglePresence("speaker"));
  dom.toggleMicBtn?.addEventListener("click", () => handleTogglePresence("mic"));

  dom.nameInput?.addEventListener("input", (event) => {
    setUserName(event.target.value);
    if (!state.currentUser.participantId) {
      seedLocalParticipantPreview();
    }
  });

  dom.roomInput?.addEventListener("blur", () => {
    if (!dom.roomInput) return;
    dom.roomInput.value = normalizeRoomCode(dom.roomInput.value);
  });

  dom.roomTypeSelect?.addEventListener("change", () => {
    if (!state.currentRoom) {
      setCurrentRoomType(getSelectedRoomType());
      renderRoomInfo();
    }
  });

  bindChatEvents();
}

function initSupabaseCheck() {
  try {
    getSupabaseClient();
    return true;
  } catch (error) {
    console.error(error);
    setStatus(
      dom.statusBox,
      `Supabase noch nicht bereit: ${error.message}`,
      true
    );
    return false;
  }
}

function init() {
  document.title = APP_NAME;

  bindEvents();
  setCurrentRoomType(getSelectedRoomType());
  syncRoomTypeSelect();
  renderPresence();
  renderRoomInfo();
  renderParticipants();

  const supabaseReady = initSupabaseCheck();

  setAppReady(true);

  if (supabaseReady) {
    setStatus(dom.statusBox, DEFAULTS.statusMessage);
  }

  console.log(`${APP_NAME} gestartet`, state);
}

init();
