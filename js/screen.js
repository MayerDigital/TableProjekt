import { screenSlots } from "./state.js";
import * as state from "./state.js";
import { setStatus } from "./utils.js";
import { client } from "./supabase.js";

// =============================
// HILFSFUNKTIONEN
// =============================

function getStatusTarget() {
  return document.getElementById("statusBox");
}

function getCurrentRoomValue() {
  return state.currentRoom || state.state?.currentRoom || null;
}

function getCurrentParticipantNameValue() {
  return (
    state.currentParticipantName ||
    state.state?.currentUser?.name ||
    state.state?.currentParticipantName ||
    null
  );
}

function ensureSlot(slotIndex) {
  if (!screenSlots[slotIndex]) {
    screenSlots[slotIndex] = {
      owner: null,
      stream: null,
      active: false,
    };
  }
}

function getSlotElements(slotIndex) {
  const nr = slotIndex + 1;

  return {
    status: document.getElementById(`screenStatus${nr}`),
    video: document.getElementById(`screenVideo${nr}`),
    placeholder: document.getElementById(`screenPlaceholder${nr}`),
  };
}

function updateSingleScreenUI(slotIndex) {
  ensureSlot(slotIndex);

  const slot = screenSlots[slotIndex];
  const { status, video, placeholder } = getSlotElements(slotIndex);

  if (status) {
    status.textContent = slot.active
      ? slot.owner
        ? `${slot.owner} aktiv`
        : "Aktiv"
      : "Inaktiv";
  }

  if (video) {
    if (slot.active && slot.stream) {
      video.srcObject = slot.stream;
      video.style.display = "block";
    } else {
      video.srcObject = null;
      video.style.display = "none";
    }
  }

  if (placeholder) {
    if (slot.active && slot.stream) {
      placeholder.style.display = "none";
    } else if (slot.active && !slot.stream) {
      placeholder.style.display = "flex";
      placeholder.textContent = slot.owner
        ? `${slot.owner} teilt gerade …`
        : "Freigabe aktiv";
    } else {
      placeholder.style.display = "flex";
      placeholder.textContent = "Keine Freigabe aktiv";
    }
  }
}

// =============================
// RESET
// =============================

export function resetScreens() {
  for (let i = 0; i < 4; i++) {
    ensureSlot(i);
    screenSlots[i].owner = null;
    screenSlots[i].stream = null;
    screenSlots[i].active = false;
  }

  renderScreens();
}

// =============================
// SCREEN LADEN (Realtime Sync)
// =============================

export async function loadScreens() {
  const roomCode = getCurrentRoomValue();
  if (!roomCode) return;

  const { data, error } = await client
    .from("screen_share")
    .select("*")
    .eq("room_code", roomCode)
    .eq("active", true);

  if (error) {
    console.error(error);
    setStatus(getStatusTarget(), "Screens konnten nicht geladen werden", true);
    return;
  }

  // Eigene lokale Streams merken
  const localStreams = {};
  for (let i = 0; i < 4; i++) {
    ensureSlot(i);
    if (screenSlots[i].stream) {
      localStreams[i] = screenSlots[i].stream;
    }
  }

  // Alles zurücksetzen, aber lokale Streams nicht blind verlieren
  for (let i = 0; i < 4; i++) {
    ensureSlot(i);
    screenSlots[i].owner = null;
    screenSlots[i].stream = null;
    screenSlots[i].active = false;
  }

  const myName = getCurrentParticipantNameValue();

  (data || []).forEach((s) => {
    const index = Number(s.slot_index);

    if (index >= 0 && index <= 3) {
      ensureSlot(index);
      screenSlots[index].owner = s.owner;
      screenSlots[index].active = true;

      // Nur den eigenen lokalen Stream wieder anhängen
      if (myName && s.owner === myName && localStreams[index]) {
        screenSlots[index].stream = localStreams[index];
      }
    }
  });

  renderScreens();
}

// =============================
// START SCREEN
// =============================

export async function startScreen(slotIndex) {
  try {
    ensureSlot(slotIndex);

    const roomCode = getCurrentRoomValue();
    const participantName = getCurrentParticipantNameValue();

    if (!roomCode) {
      setStatus(getStatusTarget(), "Kein Raum aktiv", true);
      return;
    }

    if (!participantName) {
      setStatus(getStatusTarget(), "Kein Teilnehmername aktiv", true);
      return;
    }

    if (
      screenSlots[slotIndex]?.active &&
      screenSlots[slotIndex]?.owner !== participantName
    ) {
      setStatus(getStatusTarget(), "Slot wird bereits genutzt", true);
      return;
    }

    // Falls eigener Stream auf diesem Slot schon läuft: erst stoppen
    if (
      screenSlots[slotIndex]?.active &&
      screenSlots[slotIndex]?.owner === participantName &&
      screenSlots[slotIndex]?.stream
    ) {
      await stopScreen(slotIndex);
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    screenSlots[slotIndex].stream = stream;
    screenSlots[slotIndex].owner = participantName;
    screenSlots[slotIndex].active = true;

    // Vorherigen eigenen Eintrag für denselben Slot aufräumen
    await client
      .from("screen_share")
      .delete()
      .eq("room_code", roomCode)
      .eq("owner", participantName)
      .eq("slot_index", slotIndex);

    const { error } = await client.from("screen_share").insert([
      {
        room_code: roomCode,
        owner: participantName,
        slot_index: slotIndex,
        active: true,
      },
    ]);

    if (error) {
      throw error;
    }

    const track = stream.getVideoTracks()[0];
    if (track) {
      track.onended = () => {
        stopScreen(slotIndex);
      };
    }

    renderScreens();
    setStatus(getStatusTarget(), `Bildschirm ${slotIndex + 1} gestartet`);
  } catch (err) {
    console.error(err);
    setStatus(
      getStatusTarget(),
      "Screen Fehler: " + (err?.message || "Unbekannter Fehler"),
      true
    );
  }
}

// =============================
// STOP SCREEN
// =============================

export async function stopScreen(slotIndex) {
  try {
    ensureSlot(slotIndex);

    const roomCode = getCurrentRoomValue();
    const participantName = getCurrentParticipantNameValue();
    const slot = screenSlots[slotIndex];

    if (slot?.stream) {
      slot.stream.getTracks().forEach((t) => t.stop());
    }

    screenSlots[slotIndex] = {
      owner: null,
      stream: null,
      active: false,
    };

    if (roomCode && participantName) {
      const { error } = await client
        .from("screen_share")
        .delete()
        .eq("room_code", roomCode)
        .eq("owner", participantName)
        .eq("slot_index", slotIndex);

      if (error) {
        throw error;
      }
    }

    renderScreens();
    setStatus(getStatusTarget(), `Bildschirm ${slotIndex + 1} beendet`);
  } catch (err) {
    console.error(err);
    setStatus(
      getStatusTarget(),
      "Stop Fehler: " + (err?.message || "Unbekannter Fehler"),
      true
    );
  }
}

// =============================
// STOP ALLE EIGENEN SCREENS
// =============================

export async function stopAllMyScreens() {
  const participantName = getCurrentParticipantNameValue();

  for (let i = 0; i < 4; i++) {
    ensureSlot(i);

    if (screenSlots[i]?.owner === participantName) {
      await stopScreen(i);
    }
  }
}

// =============================
// TOGGLE (UI Button)
// =============================

export async function toggleScreen() {
  const input = prompt("Screen wählen (1-4)", "1");
  if (!input) return;

  const slot = parseInt(input, 10) - 1;

  if (slot < 0 || slot > 3) {
    setStatus(getStatusTarget(), "Bitte 1-4 eingeben", true);
    return;
  }

  const participantName = getCurrentParticipantNameValue();
  const isMine = screenSlots[slot]?.owner === participantName;

  if (isMine) {
    await stopScreen(slot);
  } else {
    await startScreen(slot);
  }
}

// =============================
// BUTTONS BINDEN
// =============================

export function bindScreenEvents() {
  document.getElementById("shareScreenBtn1")?.addEventListener("click", () => startScreen(0));
  document.getElementById("stopScreenBtn1")?.addEventListener("click", () => stopScreen(0));

  document.getElementById("shareScreenBtn2")?.addEventListener("click", () => startScreen(1));
  document.getElementById("stopScreenBtn2")?.addEventListener("click", () => stopScreen(1));

  document.getElementById("shareScreenBtn3")?.addEventListener("click", () => startScreen(2));
  document.getElementById("stopScreenBtn3")?.addEventListener("click", () => stopScreen(2));

  document.getElementById("shareScreenBtn4")?.addEventListener("click", () => startScreen(3));
  document.getElementById("stopScreenBtn4")?.addEventListener("click", () => stopScreen(3));
}

// =============================
// RENDER
// =============================

export function renderScreens() {
  for (let i = 0; i < 4; i++) {
    updateSingleScreenUI(i);
  }
}
