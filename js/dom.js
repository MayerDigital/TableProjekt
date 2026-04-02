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

  // Bildschirmfreigaben
  screenShareSection: getElement(SELECTORS.screenShareSection),
  screenShareGrid: getElement(SELECTORS.screenShareGrid),

  screenSlot1: getElement(SELECTORS.screenSlot1),
  screenStatus1: getElement(SELECTORS.screenStatus1),
  screenPreview1: getElement(SELECTORS.screenPreview1),
  screenVideo1: getElement(SELECTORS.screenVideo1),
  screenPlaceholder1: getElement(SELECTORS.screenPlaceholder1),
  shareScreenBtn1: getElement(SELECTORS.shareScreenBtn1),
  stopScreenBtn1: getElement(SELECTORS.stopScreenBtn1),

  screenSlot2: getElement(SELECTORS.screenSlot2),
  screenStatus2: getElement(SELECTORS.screenStatus2),
  screenPreview2: getElement(SELECTORS.screenPreview2),
  screenVideo2: getElement(SELECTORS.screenVideo2),
  screenPlaceholder2: getElement(SELECTORS.screenPlaceholder2),
  shareScreenBtn2: getElement(SELECTORS.shareScreenBtn2),
  stopScreenBtn2: getElement(SELECTORS.stopScreenBtn2),

  screenSlot3: getElement(SELECTORS.screenSlot3),
  screenStatus3: getElement(SELECTORS.screenStatus3),
  screenPreview3: getElement(SELECTORS.screenPreview3),
  screenVideo3: getElement(SELECTORS.screenVideo3),
  screenPlaceholder3: getElement(SELECTORS.screenPlaceholder3),
  shareScreenBtn3: getElement(SELECTORS.shareScreenBtn3),
  stopScreenBtn3: getElement(SELECTORS.stopScreenBtn3),

  screenSlot4: getElement(SELECTORS.screenSlot4),
  screenStatus4: getElement(SELECTORS.screenStatus4),
  screenPreview4: getElement(SELECTORS.screenPreview4),
  screenVideo4: getElement(SELECTORS.screenVideo4),
  screenPlaceholder4: getElement(SELECTORS.screenPlaceholder4),
  shareScreenBtn4: getElement(SELECTORS.shareScreenBtn4),
  stopScreenBtn4: getElement(SELECTORS.stopScreenBtn4),
};
