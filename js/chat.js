import { TABLES } from "./config.js";
import { getSupabaseClient } from "./supabase.js";
import { state, setChatMessages, setChatChannel } from "./state.js";

function normalizeChatRow(row) {
  return {
    id: row.id,
    room_code: row.room_code || "",
    sender: row.sender || "Unbekannt",
    message: row.message || "",
    created_at: row.created_at || null,
  };
}

export async function loadChatMessages(roomCode) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(TABLES.chatMessages)
    .select("*")
    .eq("room_code", roomCode)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = Array.isArray(data) ? data.map(normalizeChatRow) : [];
  setChatMessages(rows);
  return rows;
}

export async function sendChatMessage(messageText) {
  const client = getSupabaseClient();

  if (!state.currentRoom) {
    throw new Error("Kein aktiver Raum.");
  }

  if (!state.currentUser.name) {
    throw new Error("Kein Teilnehmername vorhanden.");
  }

  const cleanMessage = String(messageText || "").trim();

  if (!cleanMessage) {
    throw new Error("Nachricht ist leer.");
  }

  const { data, error } = await client
    .from(TABLES.chatMessages)
    .insert([
      {
        room_code: state.currentRoom,
        sender: state.currentUser.name,
        message: cleanMessage,
      },
    ])
    .select();

  if (error) throw error;

  return data?.[0] || null;
}

export function unsubscribeChatRealtime() {
  const client = getSupabaseClient();
  const channel = state.channels.chat;

  if (channel) {
    client.removeChannel(channel);
    setChatChannel(null);
  }
}

export function subscribeChatRealtime(roomCode, onChange) {
  const client = getSupabaseClient();

  unsubscribeChatRealtime();

  const channel = client
    .channel(`chat-room-${roomCode}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLES.chatMessages,
        filter: `room_code=eq.${roomCode}`,
      },
      async () => {
        await loadChatMessages(roomCode);
        if (typeof onChange === "function") {
          onChange();
        }
      }
    )
    .subscribe();

  setChatChannel(channel);
}
