export let currentRoom = null;
export let currentRoomOwner = null;
export let currentParticipantName = null;
export let currentParticipantStatus = null;

export let currentRole = "participant";

export let currentExpertInviteToken = null;
export let currentExpertInviteLink = "";
export let currentExpertSession = null;

export let localSharedScreens = {};
export let remoteScreenStreams = {};

export let peerConnections = {};
export let handledSignalIds = new Set();

export let screenSlots = [
  { title: "Hauptscreen", owner: null, stream: null, active: false },
  { title: "Screen 2", owner: null, stream: null, active: false },
  { title: "Screen 3", owner: null, stream: null, active: false },
  { title: "Screen 4", owner: null, stream: null, active: false }
];
