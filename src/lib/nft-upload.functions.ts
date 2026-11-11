import { createServerFn } from "@tanstack/react-start";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const MAX = 5 * 1024 * 1024;
const id = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");

/** Stores an NFT picture and its metadata JSON; returns short permanent links. */
export const uploadNftMedia = createServerFn({ method: "POST" })
  .inputValidator((d: { image: string; type: string; name: string; description: string; origin: string }) => {
    if (!TYPES[d.type]) throw new Error("Use a PNG, JPG, WEBP or GIF picture.");
    if (typeof d.image !== "string" || d.image.length > MAX * 1.4) throw new Error("Picture must be under 5 MB.");
    if (!/^https?:\/\/[a-z0-9.:-]+$/i.test(d.origin)) throw new Error("Bad origin");
    return { ...d, name: String(d.name).slice(0, 100), description: String(d.description).slice(0, 500) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Uint8Array.from(atob(data.image), (c) => c.charCodeAt(0));
    if (bytes.length > MAX) throw new Error("Picture must be under 5 MB.");
    const imgName = `${id()}.${TYPES[data.type]}`;
    const up = await supabaseAdmin.storage.from("nft").upload(imgName, bytes, { contentType: data.type });
    if (up.error) throw new Error("Picture upload failed");
    const image = `${data.origin}/api/public/nft/${imgName}`;
    const meta = { name: data.name, description: data.description, image, type: data.type, format: "HIP412@2.0.0" };
    const metaName = `${id()}.json`;
    const up2 = await supabaseAdmin.storage.from("nft").upload(metaName, JSON.stringify(meta), { contentType: "application/json" });
    if (up2.error) throw new Error("Details upload failed");
    return { image, metadata: `${data.origin}/api/public/nft/${metaName}` };
  });
