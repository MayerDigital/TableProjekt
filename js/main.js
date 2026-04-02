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
  startWork
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

// 🔥 NEU: BUTTON LOGIK
function updateWorkButton() {
  const btn = document.getElementById("startWorkBtn");
  if (!btn) return;

  const myId = state.currentUser.participantId;
  const workingUser = state.participants.find(p => p.working);

  // 🟡 frei
  if (!workingUser) {
    btn.style.background = "#ffc107";
    btn.style.color = "#000";
    btn.textContent = "Tisch frei";
    return;
  }

  // 🟢 ich arbeite
  if (workingUser.id === myId) {
    btn.style.background = "#28a745";
    btn.style.color = "#fff";
    btn.textContent = "Du arbeitest";
    return;
  }

  // 🔴 jemand anderes
  btn.style.background = "#dc3545";
  btn.style.color = "#fff";
  btn.textContent = `${workingUser.name} arbeitet`;
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
      const working = participant.working
        ? "🔥 Arbeitet"
        : "Beobachtet";

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

  updateWorkButton(); // 🔥 hier wird der Button aktualisiert
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

async function handleStartWork() {
  const participantId = state.currentUser.participantId;

  if (!participantId || !state.currentRoom) {
    setStatus(dom.statusBox, "Noch nicht im Raum", true);
    return;
  }

  try {
    await startWork(participantId, state.currentRoom);

    await loadParticipants(state.currentRoom);
    renderParticipants();
  } catch (error) {
    console.error(error);
    setStatus(dom.statusBox, "Fehler beim Starten der Arbeit", true);
  }
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

    const room = result.room;
    const participant = result.participant;

    const isOwner = room.owner_id === participant.id;
    state.isOwner = isOwner;

    const ownerBox = document.getElementById("ownerControls");
    if (ownerBox) {
      ownerBox.style.display = isOwner ? "block" : "none";
    }

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

  if (!name || !roomCode) return;

  connectToRoom(roomCode, name, "join");
}

function bindEvents() {
  dom.createRoomBtn?.addEventListener("click", handleCreateRoom);
  dom.joinRoomBtn?.addEventListener("click", handleJoinRoom);

  document.getElementById("startWorkBtn")?.addEventListener("click", handleStartWork);

  bindChatEvents();
}

function init() {
  document.title = APP_NAME;

  bindEvents();
  setCurrentRoomType(getSelectedRoomType());
  syncRoomTypeSelect();
  renderPresence();
  renderRoomInfo();
  renderParticipants();

  initSupabaseCheck();
  setAppReady(true);
}

function initSupabaseCheck() {
  try {
    getSupabaseClient();
  } catch (error) {
    console.error(error);
  }
}

init();
