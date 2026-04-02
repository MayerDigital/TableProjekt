import { client } from "./supabase.js";
import { STORAGE_BUCKET } from "./config.js";

export async function uploadFile(file, path) {
  return await client.storage
    .from(STORAGE_BUCKET)
    .upload(path, file);
}
