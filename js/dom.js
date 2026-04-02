import { SELECTORS } from "./config.js";

function getElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    console.warn(`Element nicht gefunden: ${selector}`);
  }

  return element;
}

export const dom = {
  nameInput: getElement(SELECTORS.nameInput),
  roomInput: getElement(SELECTORS.roomInput),
  roomTypeSelect: getElement(SELECTORS.roomTypeSelect),
  createRoomBtn: getElement(SELECTORS.createRoomBtn),
  joinRoomBtn: getElement(SELECTORS.joinRoomBtn),
  statusBox: getElement(SELECTORS.statusBox),

  visualStatus: getElement(SELECTORS.visualStatus),
  speakerStatus: getElement(SELECTORS.speakerStatus),
  micStatus: getElement(SELECTORS.micStatus),

  toggleVisualBtn: getElement(SELECTORS.toggleVisualBtn),
  toggleSpeakerBtn: getElement(SELECTORS.toggleSpeakerBtn),
  toggleMicBtn: getElement(SELECTORS.toggleMicBtn),

  currentRoomLabel: getElement(SELECTORS.currentRoomLabel),
  workStatusLabel: getElement(SELECTORS.workStatusLabel),
  participantCountBadge: getElement(SELECTORS.participantCountBadge),
  participantsList: getElement(SELECTORS.participantsList),

  chatInput: getElement(SELECTORS.chatInput),
  sendChatBtn: getElement(SELECTORS.sendChatBtn),
  chatMessages: getElement(SELECTORS.chatMessages),
  tableStage: getElement(SELECTORS.tableStage),
};
