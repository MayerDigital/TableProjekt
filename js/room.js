import { TABLES } from "./config.js";
import { getSupabaseClient } from "./supabase.js";
import {
  state,
  setCurrentRoom,
  setParticipantId,
  setParticipants,
  setParticipantsChannel,
  setRealtimeReady,
} from "./state.js";

function normalizeParticipantRow(row) {
  return {
    id: row.id,
    name: row.name || "Unbekannt",
    room: row.room_code || "–",
    visual: Boolean(row.visual),
    speaker: Boolean(row.speaker),
    mic: Boolean(row.mic),
    working: Boolean(row.working),
    joined_at: row.joined_at || null,
  };
}

export async function createRoomInDb(roomCode, ownerName) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(TABLES.rooms)
    .insert([
      {
        code: roomCode,
        owner: ownerName,
      },
    ])
    .select();

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}

export async function findRoomByCode(roomCode) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(TABLES.rooms)
    .select("*")
    .eq("code", roomCode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function createOrJoinRoom(roomCode, ownerName) {
  const existingRoom = await findRoomByCode(roomCode);

  if (existingRoom) {
    return existingRoom;
  }

  return await createRoomInDb(roomCode, ownerName);
}

export async function addParticipantToRoom({ roomCode, name, visual, speaker, mic }) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(TABLES.participants)
    .insert([
      {
        room_code: roomCode,
        name,
        visual,
        speaker,
        mic,
        working: false,
      },
    ])
    .select();

  if (error) {
    throw error;
  }

  const participant = data?.[0] || null;

  if (participant?.id) {
    setParticipantId(participant.id);
  }

  return participant;
}

export async function updateCurrentParticipantPresence() {
  const client = getSupabaseClient();
  const participantId = state.currentUser.participantId;

  if (!participantId) return null;

  const { data, error } = await client
    .from(TABLES.participants)
    .update({
      visual: state.presence.visual,
      speaker: state.presence.speaker,
      mic: state.presence.mic,
    })
    .eq("id", participantId)
    .select();

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}

export async function loadParticipants(roomCode) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(TABLES.participants)
    .select("*")
    .eq("room_code", roomCode)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data.map(normalizeParticipantRow) : [];
  setParticipants(rows);
  return rows;
}

export function unsubscribeParticipantsRealtime() {
  const client = getSupabaseClient();
  const channel = state.channels.participants;

  if (channel) {
    client.removeChannel(channel);
    setParticipantsChannel(null);
    setRealtimeReady(false);
  }
}

export function subscribeParticipantsRealtime(roomCode, onChange) {
  const client = getSupabaseClient();

  unsubscribeParticipantsRealtime();

  const channel = client
    .channel(`participants-room-${roomCode}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLES.participants,
        filter: `room_code=eq.${roomCode}`,
      },
      async () => {
        await loadParticipants(roomCode);
        if (typeof onChange === "function") {
          onChange();
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setRealtimeReady(true);
      }
    });

  setParticipantsChannel(channel);
}

export async function joinPreparedRoom({ roomCode, name, presence }) {
  setCurrentRoom(roomCode);

  await createOrJoinRoom(roomCode, name);

  const participant = await addParticipantToRoom({
    roomCode,
    name,
    visual: presence.visual,
    speaker: presence.speaker,
    mic: presence.mic,
  });

  await loadParticipants(roomCode);

  return participant;
}
