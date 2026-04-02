import { TABLES, DEFAULTS } from "./config.js";
import { getSupabaseClient } from "./supabase.js";
import {
  state,
  setCurrentRoom,
  setParticipantId,
  setParticipants,
  setParticipantsChannel,
  setRealtimeReady,
  setScreensChannel,
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

// 🔥 START / STOP ARBEIT
export async function startWork(participantId, roomCode) {
  const client = getSupabaseClient();

  const { data: currentWorkers, error: readError } = await client
    .from(TABLES.participants)
    .select("id, working")
    .eq("room_code", roomCode)
    .eq("active", true);

  if (readError) throw readError;

  const someoneWorking = (currentWorkers || []).some((p) => p.working);
  const iAmWorking = (currentWorkers || []).some(
    (p) => p.id === participantId && p.working
  );

  if (someoneWorking && !iAmWorking) {
    throw new Error("Jemand arbeitet bereits");
  }

  const { error: clearError } = await client
    .from(TABLES.participants)
    .update({ working: false })
    .eq("room_code", roomCode);

  if (clearError) throw clearError;

  if (!participantId) return;

  const { error: setError } = await client
    .from(TABLES.participants)
    .update({ working: true })
    .eq("id", participantId);

  if (setError) throw setError;
}

// 🔥 TEILNEHMER ENTFERNEN
export async function removeParticipant(participantId) {
  const client = getSupabaseClient();

  const { error } = await client
    .from(TABLES.participants)
    .update({ active: false, working: false })
    .eq("id", participantId);

  if (error) throw error;
}

// 🔥 RAUM VERLASSEN
export async function leaveRoom(participantId) {
  const client = getSupabaseClient();

  const { error } = await client
    .from(TABLES.participants)
    .update({ active: false, working: false })
    .eq("id", participantId);

  if (error) throw error;
}

// 🏠 RAUM ERSTELLEN
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

// 🔍 RAUM FINDEN
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

// 🔄 CREATE ODER JOIN
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

// 👤 TEILNEHMER
export async function addParticipantToRoom({
  roomCode,
  name,
  visual,
  speaker,
  mic,
}) {
  const client = getSupabaseClient();

  const storageKey = `participantId_${roomCode}`;
  const existingId = localStorage.getItem(storageKey);

  if (existingId) {
    const { data: existing } = await client
      .from(TABLES.participants)
      .select("*")
      .eq("id", existingId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (existing) {
      if (!existing.active) {
        const { data: reactivated, error: reactivateError } = await client
          .from(TABLES.participants)
          .update({
            active: true,
            name,
            visual,
            speaker,
            mic,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (reactivateError) throw reactivateError;

        setParticipantId(reactivated.id);
        return reactivated;
      }

      const { data: updated, error: updateError } = await client
        .from(TABLES.participants)
        .update({
          name,
          visual,
          speaker,
          mic,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setParticipantId(updated.id);
      return updated;
    }
  }

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
        active: true,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  const participant = data || null;

  if (participant?.id) {
    setParticipantId(participant.id);
    localStorage.setItem(storageKey, participant.id);
  }

  return participant;
}

// 🔄 PRESENCE
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

// 📡 LOAD
export async function loadParticipants(roomCode) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(TABLES.participants)
    .select("*")
    .eq("room_code", roomCode)
    .eq("active", true)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  const rows = Array.isArray(data) ? data.map(normalizeParticipantRow) : [];
  setParticipants(rows);
  return rows;
}

// 🔴 REALTIME TEILNEHMER
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

        const me = state.currentUser.participantId;
        const stillExists = state.participants.find((p) => p.id === me);

        if (!stillExists && state.currentRoom) {
          alert("Du wurdest aus dem Raum entfernt");

          setCurrentRoom(null);
          setParticipants([]);
        }

        if (typeof onChange === "function") {
          onChange();
        }
      }
    )
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setRealtimeReady(true);

        setTimeout(async () => {
          await loadParticipants(roomCode);
          if (typeof onChange === "function") {
            onChange();
          }
        }, 100);
      }
    });

  setParticipantsChannel(channel);
}

// 🖥️ REALTIME SCREENS
export function unsubscribeScreensRealtime() {
  const client = getSupabaseClient();
  const channel = state.channels.screens;

  if (channel) {
    client.removeChannel(channel);
    setScreensChannel(null);
  }
}

export function subscribeScreensRealtime(roomCode, onChange) {
  const client = getSupabaseClient();

  unsubscribeScreensRealtime();

  const channel = client
    .channel(`screens-room-${roomCode}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLES.screens,
        filter: `room_code=eq.${roomCode}`,
      },
      async () => {
        if (typeof onChange === "function") {
          await onChange();
        }
      }
    )
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        if (typeof onChange === "function") {
          await onChange();
        }
      }
    });

  setScreensChannel(channel);
}

// 🚀 JOIN FLOW
export async function joinPreparedRoom({
  roomCode,
  name,
  presence,
  roomType = DEFAULTS.roomType,
}) {
  setCurrentRoom(roomCode);

  const client = getSupabaseClient();

  let room = await findRoomByCode(roomCode);

  const participant = await addParticipantToRoom({
    roomCode,
    name,
    visual: presence.visual,
    speaker: presence.speaker,
    mic: presence.mic,
  });

  if (!room) {
    const { data, error } = await client
      .from(TABLES.rooms)
      .insert([
        {
          code: roomCode,
          owner: name,
          owner_id: participant.id,
          room_type: roomType,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    room = data;
  }

  await loadParticipants(roomCode);

  return {
    room,
    participant,
  };
}
