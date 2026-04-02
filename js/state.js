export const state = {
  appReady: false,
  realtimeReady: false,

  currentUser: {
    name: "",
    participantId: null,
  },

  currentRoom: null,
  currentRoomType: "business",

  presence: {
    visual: false,
    speaker: false,
    mic: false,
  },

  participants: [],
  chatMessages: [],

  channels: {
    participants: null,
    chat: null,
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
  state.currentRoomType = roomType || "business";
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

export function addChatMessage(message) {
  state.chatMessages.push(message);
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
