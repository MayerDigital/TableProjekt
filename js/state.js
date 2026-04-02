export const state = {
  appReady: false,

  currentUser: {
    name: "",
  },

  currentRoom: null,

  presence: {
    visual: false,
    speaker: false,
    mic: false,
  },

  participants: [],
};

export function setUserName(name) {
  state.currentUser.name = String(name || "").trim();
}

export function setCurrentRoom(roomCode) {
  state.currentRoom = roomCode ? String(roomCode).trim() : null;
}

export function togglePresence(key) {
  if (!(key in state.presence)) return;
  state.presence[key] = !state.presence[key];
}

export function setParticipants(participants = []) {
  state.participants = Array.isArray(participants) ? participants : [];
}

export function setAppReady(value) {
  state.appReady = Boolean(value);
}
