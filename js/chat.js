import { client } from "./supabase.js";
import { setStatus } from "./utils.js";
import { currentRoom, currentParticipantName } from "./state.js";

export async function sendMessage(text) {
  if (!currentRoom || !currentParticipantName) return;

  const { error } = await client.from("chat_messages").insert([{
    room_code: currentRoom,
    sender_name: currentParticipantName,
    message: text
  }]);

  if (error) setStatus(error.message);
}
