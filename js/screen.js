import { screenSlots } from "./state.js";
import * as state from "./state.js";
import { setStatus } from "./utils.js";
import { getSupabaseClient } from "./supabase.js";

// =============================
// REALTIME
// =============================

let screenChannel = null;

// =============================
// HILFSFUNKTIONEN
// =============================

function getStatusTarget() {
  return document.getElementById("statusBox");
}

function getCurrentRoomValue() {
  return state.state?.currentRoom || state.currentRoom || null;
}

function getCurrentParticipantNameValue() {
  return (
    state.state?.currentUser?.name ||
    state.currentParticipantName ||
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

function preserveLocalStreams() {
  const localStreams = {};
  const myName = getCurrentParticipantNameValue();

  for (let i = 0; i < 4; i++) {
    ensureSlot(i);

    if (
      screenSlots[i].stream &&
      screenSlots[i].owner &&
      myName &&
      screenSlots[i].owner === myName
    ) {
      localStreams[i] = {
        owner: screenSlots[i].owner,
        stream: screenSlots[i].stream,
        active: screenSlots[i].active,
      };
    }
  }

  return localStreams;
}

function restoreLocalStreams(localStreams, rows) {
  const myName = getCurrentParticipantNameValue();

  (rows || []).forEach((s) => {
    const index = Number(s.slot_index);

    if (index >= 0 && index <= 3) {
      ensureSlot(index);
      screenSlots[index].owner = s.owner;
      screenSlots[index].active = !!s.active;

      if (
        myName &&
        s.owner === myName &&
        localStreams[index] &&
        localStreams[index].stream
      ) {
        screenSlots[index].stream = localStreams[index].stream;
      }
    }
  });
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
// SCREEN LADEN (Initial + Refresh)
// =============================

export async function loadScreens() {
  const roomCode = getCurrentRoomValue();
  if (!roomCode) return;

  const client = getSupabaseClient();

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

  const localStreams = preserveLocalStreams();

  for (let i = 0; i < 4; i++) {
    ensureSlot(i);
    screenSlots[i].owner = null;
    screenSlots[i].stream = null;
    screenSlots[i].active = false;
  }

  restoreLocalStreams(localStreams, data || []);
  renderScreens();
}

// =============================
// REALTIME SCREEN SYNC
// =============================

function subscribeScreensRealtime() {
  const roomCode = getCurrentRoomValue();
  if (!roomCode) return;

  const client = getSupabaseClient();

  if (screenChannel) {
    client.removeChannel(screenChannel);
    screenChannel = null;
  }

  screenChannel = client
    .channel(`screen-share-${roomCode}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "screen_share",
        filter: `room_code=eq.${roomCode}`,
      },
      async () => {
        await loadScreens();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("📺 Screen-Realtime aktiv für Raum:", roomCode);
      }
    });
}

export function refreshScreenRealtime() {
  subscribeScreensRealtime();
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

    renderScreens();

    const client = getSupabaseClient();

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

    await loadScreens();
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

    renderScreens();

    if (roomCode && participantName) {
      const client = getSupabaseClient();

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

    await loadScreens();
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
// BUTTONS BINDEN
// =============================

export function bindScreenEvents() {
  document
    .getElementById("shareScreenBtn1")
    ?.addEventListener("click", () => startScreen(0));
  document
    .getElementById("stopScreenBtn1")
    ?.addEventListener("click", () => stopScreen(0));

  document
    .getElementById("shareScreenBtn2")
    ?.addEventListener("click", () => startScreen(1));
  document
    .getElementById("stopScreenBtn2")
    ?.addEventListener("click", () => stopScreen(1));

  document
    .getElementById("shareScreenBtn3")
    ?.addEventListener("click", () => startScreen(2));
  document
    .getElementById("stopScreenBtn3")
    ?.addEventListener("click", () => stopScreen(2));

  document
    .getElementById("shareScreenBtn4")
    ?.addEventListener("click", () => startScreen(3));
  document
    .getElementById("stopScreenBtn4")
    ?.addEventListener("click", () => stopScreen(3));

  subscribeScreensRealtime();
}

// =============================
// RENDER
// =============================

export function renderScreens() {
  for (let i = 0; i < 4; i++) {
    updateSingleScreenUI(i);
  }
}
