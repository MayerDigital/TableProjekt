import { TABLES } from "./config.js";
import { dom } from "./dom.js";
import { getSupabaseClient } from "./supabase.js";
import { state } from "./state.js";
import { escapeHtml, setStatus } from "./utils.js";

let chatChannel = null;
let currentChatRoom = null;

function renderChatMessages(messages = []) {
  if (!dom.chatMessages) return;

  if (!messages.length) {
    dom.chatMessages.innerHTML = `
      <div class="empty-state">Noch keine Nachrichten im Raum.</div>
    `;
    return;
  }

  dom.chatMessages.innerHTML = messages
    .map((msg) => {
      const sender = escapeHtml(msg.sender || "Unbekannt");
      const message = escapeHtml(msg.message || "");
      const time = msg.created_at
        ? new Date(msg.created_at).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      return `
        <div class="participant-card">
          <div class="participant-name">${sender}</div>
          <div style="margin: 6px 0 8px 0;">${message}</div>
          <div class="participant-meta">
            <span>${time}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

export async function loadChatMessages(roomCode) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(TABLES.chatMessages)
    .select("*")
    .eq("room_code", roomCode)
    .order("created_at", { ascending: true });

  if (error) throw error;

  renderChatMessages(Array.isArray(data) ? data : []);
}

export function unsubscribeChatRealtime() {
  const client = getSupabaseClient();

  if (chatChannel) {
    client.removeChannel(chatChannel);
    chatChannel = null;
  }

  currentChatRoom = null;
}

export function subscribeChatRealtime(roomCode) {
  const client = getSupabaseClient();

  unsubscribeChatRealtime();
  currentChatRoom = roomCode;

  chatChannel = client
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
      }
    )
    .subscribe();
}

export async function sendChatMessage() {
  const roomCode = state.currentRoom;
  const sender = state.currentUser.name;
  const message = dom.chatInput?.value?.trim() || "";

  if (!roomCode) {
    setStatus(dom.statusBox, "Bitte zuerst einem Raum beitreten.", true);
    return;
  }

  if (!sender) {
    setStatus(dom.statusBox, "Bitte zuerst deinen Namen eingeben.", true);
    return;
  }

  if (!message) return;

  const client = getSupabaseClient();

  const { error } = await client.from(TABLES.chatMessages).insert([
    {
      room_code: roomCode,
      sender,
      message,
    },
  ]);

  if (error) throw error;

  if (dom.chatInput) {
    dom.chatInput.value = "";
    dom.chatInput.focus();
  }
}

export async function initChatForRoom(roomCode) {
  if (!dom.chatInput || !dom.sendChatBtn) return;

  dom.chatInput.disabled = false;
  dom.sendChatBtn.disabled = false;

  await loadChatMessages(roomCode);
  subscribeChatRealtime(roomCode);
}

export function bindChatEvents() {
  dom.sendChatBtn?.addEventListener("click", async () => {
    try {
      await sendChatMessage();
    } catch (error) {
      console.error(error);
      setStatus(
        dom.statusBox,
        `Chat-Fehler: ${error.message || "Nachricht konnte nicht gesendet werden."}`,
        true
      );
    }
  });

  dom.chatInput?.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    try {
      await sendChatMessage();
    } catch (error) {
      console.error(error);
      setStatus(
        dom.statusBox,
        `Chat-Fehler: ${error.message || "Nachricht konnte nicht gesendet werden."}`,
        true
      );
    }
  });
}
