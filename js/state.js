import { DEFAULTS } from "./config.js";

export const screenSlots = [
  { owner: null, stream: null, active: false },
  { owner: null, stream: null, active: false },
  { owner: null, stream: null, active: false },
  { owner: null, stream: null, active: false },
];

export const state = {
  appReady: false,
  realtimeReady: false,

  currentUser: {
    name: "",
    participantId: null,
  },

  currentRoom: null,
  currentRoomType: DEFAULTS.roomType,

  presence: {
    visual: false,
    speaker: false,
    mic: false,
  },

  participants: [],
  chatMessages: [],

  screens: {
    slots: screenSlots,
  },

  channels: {
    participants: null,
    chat: null,
    screens: null,
    work: null,
  },
};

export function setUserName(name) {
  state.currentUser.name = String(name || "").trim();
}

export function setParticipantId(id) {
  state.currentUser.participantId = id || null;
}

export function setCurrentRoom(roomCode) {
  state.currentRoom = roomCode ? String(roomCode).trim() : null;
}

export function setCurrentRoomType(roomType) {
  state.currentRoomType = roomType || DEFAULTS.roomType;
}

export function togglePresence(key) {
  if (!(key in state.presence)) return;
  state.presence[key] = !state.presence[key];
}

export function setParticipants(participants = []) {
  state.participants = Array.isArray(participants) ? participants : [];
}

export function setChatMessages(messages = []) {
  state.chatMessages = Array.isArray(messages) ? messages : [];
}

export function setAppReady(value) {
  state.appReady = Boolean(value);
}

export function setRealtimeReady(value) {
  state.realtimeReady = Boolean(value);
}

export function setParticipantsChannel(channel) {
  state.channels.participants = channel || null;
}

export function setChatChannel(channel) {
  state.channels.chat = channel || null;
}

export function setScreensChannel(channel) {
  state.channels.screens = channel || null;
}

export function setWorkChannel(channel) {
  state.channels.work = channel || null;
}

export function resetScreenSlots() {
  screenSlots.forEach((slot) => {
    slot.owner = null;
    slot.stream = null;
    slot.active = false;
  });
}
