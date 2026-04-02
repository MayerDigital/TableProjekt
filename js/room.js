import { TABLES, DEFAULTS } from "./config.js";
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

export async function setRoomOwner(roomCode, participantId) {
  const client = getSupabaseClient();

  const { error } = await client
    .from(TABLES.rooms)
    .update({
      owner_id: participantId,
    })
    .eq("code", roomCode);

  if (error) throw error;
}

// 🔥 FINAL KORRIGIERT
export async function startWork(participantId, roomCode) {
  const client = getSupabaseClient();

  // 🔓 STOP (nur mich!)
  if (!participantId) {
    const myId = state.currentUser.participantId;

    const { error } = await client
      .from(TABLES.participants)
      .update({ working: false })
      .eq("id", myId);

    if (error) throw error;
    return;
  }

  // 🔍 prüfen wer arbeitet
  const { data: currentWorkers, error: readError } = await client
    .from(TABLES.participants)
    .select("id")
    .eq("room_code", roomCode)
    .eq("working", true);

  if (readError) throw readError;

  const someoneWorking = currentWorkers.length > 0;
  const iAmWorking = currentWorkers.some(p => p.id === participantId);

  // ❌ Blockieren wenn anderer arbeitet
  if (someoneWorking && !iAmWorking) {
    throw new Error("Jemand arbeitet bereits");
  }

  // 🔄 alle zurücksetzen
  const { error: resetError } = await client
    .from(TABLES.participants)
    .update({ working: false })
    .eq("room_code", roomCode);

  if (resetError) throw resetError;

  // ✅ mich setzen
  const { error: setError } = await client
    .from(TABLES.participants)
    .update({ working: true })
    .eq("id", participantId);

  if (setError) throw setError;
}

// 🔥 NEU: TEILNEHMER ENTFERNEN
export async function removeParticipant(participantId) {
  const client = getSupabaseClient();

  const { error } = await client
    .from(TABLES.participants)
    .delete()
    .eq("id", participantId);

  if (error) throw error;
}

export async function createRoomInDb(
  roomCode,
  ownerName,
  roomType = DEFAULTS.roomType
) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(TABLES.rooms)
    .insert([
      {
        code: roomCode,
        owner: ownerName,
        room_type: roomType,
        owner_id: null,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data || null;
}

export async function findRoomByCode(roomCode) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(TABLES.rooms)
    .select("*")
    .eq("code", roomCode)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

export async function createOrJoinRoom(
  roomCode,
  ownerName,
  roomType = DEFAULTS.roomType
) {
  const existingRoom = await findRoomByCode(roomCode);

  if (existingRoom) {
    return existingRoom;
  }

  return await createRoomInDb(roomCode, ownerName, roomType);
}

export async function addParticipantToRoom({
  roomCode,
  name,
  visual,
  speaker,
  mic,
}) {
  const client = getSupabaseClient();

  // 🔥 Prüfen ob schon vorhanden
  const existingId = localStorage.getItem("participantId");

  if (existingId) {
    const { data: existing } = await client
      .from(TABLES.participants)
      .select("*")
      .eq("id", existingId)
      .maybeSingle();

    if (existing) {
      setParticipantId(existing.id);
      return existing;
    }
  }

  // 🔥 sonst neu erstellen
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
    .select()
    .single();

  if (error) throw error;

  const participant = data || null;

  if (participant?.id) {
    setParticipantId(participant.id);
    localStorage.setItem("participantId", participant.id);
  }

  return participant;
}
    .select()
    .single();

  if (error) throw error;

  const participant = data || null;
if (participant?.id) {
  setParticipantId(participant.id);

  // 🔥 NEU: speichern im Browser
  localStorage.setItem("participantId", participant.id);
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
    .select()
    .single();

  if (error) throw error;

  return data || null;
}

export async function loadParticipants(roomCode) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(TABLES.participants)
    .select("*")
    .eq("room_code", roomCode)
    .order("joined_at", { ascending: true });

  if (error) throw error;

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
  }

  setRealtimeReady(false);
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
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setRealtimeReady(true);
        await loadParticipants(roomCode);
        if (typeof onChange === "function") {
          onChange();
        }
      }
    });

  setParticipantsChannel(channel);
}

export async function joinPreparedRoom({
  roomCode,
  name,
  presence,
  roomType = DEFAULTS.roomType,
}) {
  setCurrentRoom(roomCode);

  const room = await createOrJoinRoom(roomCode, name, roomType);

  const participant = await addParticipantToRoom({
    roomCode,
    name,
    visual: presence.visual,
    speaker: presence.speaker,
    mic: presence.mic,
  });

  if (!room.owner_id && participant?.id) {
    await setRoomOwner(roomCode, participant.id);
    room.owner_id = participant.id;
  }

  await loadParticipants(roomCode);

  return {
    room,
    participant,
  };
}
