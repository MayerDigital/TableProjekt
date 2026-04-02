import { SELECTORS } from "./config.js";

function getElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    console.warn(`[DOM] Element nicht gefunden: ${selector}`);
  }

  return element;
}

export const dom = {
  // Verbindung
  nameInput: getElement(SELECTORS.nameInput),
  roomInput: getElement(SELECTORS.roomInput),
  roomTypeSelect: getElement(SELECTORS.roomTypeSelect),
  createRoomBtn: getElement(SELECTORS.createRoomBtn),
  joinRoomBtn: getElement(SELECTORS.joinRoomBtn),
  statusBox: getElement(SELECTORS.statusBox),

  // Präsenz
  visualStatus: getElement(SELECTORS.visualStatus),
  speakerStatus: getElement(SELECTORS.speakerStatus),
  micStatus: getElement(SELECTORS.micStatus),

  toggleVisualBtn: getElement(SELECTORS.toggleVisualBtn),
  toggleSpeakerBtn: getElement(SELECTORS.toggleSpeakerBtn),
  toggleMicBtn: getElement(SELECTORS.toggleMicBtn),

  // Raumstatus
  currentRoomLabel: getElement(SELECTORS.currentRoomLabel),
  workStatusLabel: getElement(SELECTORS.workStatusLabel),

  // Teilnehmer
  participantCountBadge: getElement(SELECTORS.participantCountBadge),
  participantsList: getElement(SELECTORS.participantsList),

  // Chat
  chatInput: getElement(SELECTORS.chatInput),
  sendChatBtn: getElement(SELECTORS.sendChatBtn),
  chatMessages: getElement(SELECTORS.chatMessages),

  // Tisch
  tableStage: getElement(SELECTORS.tableStage),
};
