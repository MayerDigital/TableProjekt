export const APP_NAME = "TableProjekt™";
export const APP_VERSION = "1.0.0-step2";

export const SUPABASE_URL = "HIER_DEINE_SUPABASE_URL_EINFUEGEN";
export const SUPABASE_ANON_KEY = "HIER_DEINEN_SUPABASE_ANON_KEY_EINFUEGEN";

export const TABLES = {
  rooms: "rooms",
  participants: "participants",
  chatMessages: "chat_messages",
  screens: "screens",
};

export const DEFAULTS = {
  roomPrefix: "TP",
  statusMessage: "TableProjekt ist bereit.",
};

export const SELECTORS = {
  nameInput: "#nameInput",
  roomInput: "#roomInput",
  createRoomBtn: "#createRoomBtn",
  joinRoomBtn: "#joinRoomBtn",
  statusBox: "#statusBox",

  visualStatus: "#visualStatus",
  speakerStatus: "#speakerStatus",
  micStatus: "#micStatus",

  toggleVisualBtn: "#toggleVisualBtn",
  toggleSpeakerBtn: "#toggleSpeakerBtn",
  toggleMicBtn: "#toggleMicBtn",

  currentRoomLabel: "#currentRoomLabel",
  workStatusLabel: "#workStatusLabel",
  participantCountBadge: "#participantCountBadge",
  participantsList: "#participantsList",

  chatInput: "#chatInput",
  sendChatBtn: "#sendChatBtn",
  chatMessages: "#chatMessages",
  tableStage: "#tableStage",
};
