import { screenSlots } from "./state.js";
import * as state from "./state.js";
import { setStatus } from "./utils.js";
import { client } from "./supabase.js";

// =============================
// RESET
// =============================

export function resetScreens() {
  screenSlots.forEach(s => {
    s.owner = null;
    s.stream = null;
    s.active = false;
  });
}

// =============================
// SCREEN LADEN (Realtime Sync)
// =============================

export async function loadScreens() {
  if (!state.currentRoom) return;

  const { data } = await client
    .from("screen_share")
    .select("*")
    .eq("room_code", state.currentRoom)
    .eq("active", true);

  resetScreens();

  (data || []).forEach(s => {
    if (screenSlots[s.slot_index]) {
      screenSlots[s.slot_index].owner = s.owner;
      screenSlots[s.slot_index].active = true;

      // eigener Stream bleibt lokal erhalten
      if (state.currentParticipantName === s.owner) {
        screenSlots[s.slot_index].stream =
          screenSlots[s.slot_index].stream || null;
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
    if (!state.currentRoom) {
      setStatus("Kein Raum aktiv");
      return;
    }

    if (screenSlots[slotIndex]?.active &&
        screenSlots[slotIndex]?.owner !== state.currentParticipantName) {
      setStatus("Slot wird bereits genutzt");
      return;
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true
    });

    screenSlots[slotIndex].stream = stream;
    screenSlots[slotIndex].owner = state.currentParticipantName;
    screenSlots[slotIndex].active = true;

    await client.from("screen_share").insert([{
      room_code: state.currentRoom,
      owner: state.currentParticipantName,
      slot_index: slotIndex,
      active: true
    }]);

    stream.getTracks()[0].onended = () => {
      stopScreen(slotIndex);
    };

    renderScreens();
    setStatus("Screen " + (slotIndex + 1) + " gestartet");

  } catch (err) {
    setStatus("Screen Fehler: " + err.message);
  }
}

// =============================
// STOP SCREEN
// =============================

export async function stopScreen(slotIndex) {
  try {
    const slot = screenSlots[slotIndex];

    if (slot?.stream) {
      slot.stream.getTracks().forEach(t => t.stop());
    }

    screenSlots[slotIndex] = {
      owner: null,
      stream: null,
      active: false
    };

    await client
      .from("screen_share")
      .delete()
      .eq("room_code", state.currentRoom)
      .eq("owner", state.currentParticipantName)
      .eq("slot_index", slotIndex);

    renderScreens();
    setStatus("Screen " + (slotIndex + 1) + " beendet");

  } catch (err) {
    setStatus("Stop Fehler: " + err.message);
  }
}

// =============================
// TOGGLE (UI Button)
// =============================

export async function toggleScreen() {
  const input = prompt("Screen wählen (1-4)", "1");
  if (!input) return;

  const slot = parseInt(input) - 1;

  if (slot < 0 || slot > 3) {
    setStatus("Bitte 1-4 eingeben");
    return;
  }

  const isMine =
    screenSlots[slot]?.owner === state.currentParticipantName;

  if (isMine) {
    await stopScreen(slot);
  } else {
    await startScreen(slot);
  }
}

// =============================
// RENDER
// =============================

export function renderScreens() {
  const ids = [
    "primaryScreen",
    "screenThumb1",
    "screenThumb2",
    "screenThumb3"
  ];

  ids.forEach((id, i) => {
    const box = document.getElementById(id);
    if (!box) return;

    const body = box.querySelector(".screen-slot-body");
    if (!body) return;

    body.innerHTML = "";

    const slot = screenSlots[i];

    if (slot.active && slot.stream) {
      const video = document.createElement("video");
      video.srcObject = slot.stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "contain";

      body.appendChild(video);

    } else if (slot.active && !slot.stream) {
      body.innerHTML = `<p>${slot.owner} teilt...</p>`;

    } else {
      body.innerHTML = "<p>Keine Freigabe aktiv</p>";
    }
  });
}
