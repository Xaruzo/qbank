import { supabase } from "./supabaseClient";

const DB_NAME = "qbank-reel-media-v1";
const STORE_NAME = "clips";
const IDB_PREFIX = "idb-reel://";
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB limit for cloud upload

interface StoredClipRecord {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  createdAt: number;
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this environment."));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open IndexedDB."));
  });
}

export function isIndexedDbReelUrl(url?: string | null): boolean {
  return Boolean(url && url.startsWith(IDB_PREFIX));
}

export async function saveLocalReelVideo(file: Blob, name = "clip.mp4"): Promise<string> {
  const id = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const db = await openMediaDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const record: StoredClipRecord = {
        id,
        blob: file,
        name,
        type: file.type || "video/mp4",
        createdAt: Date.now(),
      };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to save clip locally."));
    });
    return `${IDB_PREFIX}${id}`;
  } finally {
    db.close();
  }
}

export async function loadLocalReelVideoUrl(mediaUrl: string): Promise<string | null> {
  if (!isIndexedDbReelUrl(mediaUrl)) return mediaUrl;
  const id = mediaUrl.slice(IDB_PREFIX.length);
  if (!id) return null;

  const db = await openMediaDb();
  try {
    const record = await new Promise<StoredClipRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as StoredClipRecord | undefined);
      req.onerror = () => reject(req.error || new Error("Failed to load local clip."));
    });
    if (!record?.blob) return null;
    return URL.createObjectURL(record.blob);
  } finally {
    db.close();
  }
}

export async function deleteLocalReelVideo(mediaUrl?: string | null): Promise<void> {
  if (!mediaUrl || !isIndexedDbReelUrl(mediaUrl)) return;
  const id = mediaUrl.slice(IDB_PREFIX.length);
  if (!id) return;

  try {
    const db = await openMediaDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Failed to delete local clip."));
      });
    } finally {
      db.close();
    }
  } catch {
    // Ignore cleanup errors when IndexedDB is unavailable
  }
}

function getVideoExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "video/ogg") return "ogg";
  return "mp4";
}

export interface UploadedReelVideoResult {
  mediaUrl: string;
  storedIn: "supabase" | "indexeddb";
}

/**
 * Persists an uploaded video clip across page navigation and reloads.
 * Uploads to Supabase Storage when authenticated & bucket is available,
 * and falls back cleanly to browser IndexedDB when offline or unprovisioned.
 */
export async function uploadReelVideo(
  file: File,
  userId?: string
): Promise<UploadedReelVideoResult> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Please choose a valid .mp4, .webm, or .mov video file.");
  }

  if (supabase && userId && userId !== "local_user" && file.size <= MAX_VIDEO_BYTES) {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2, 8);
    const ext = getVideoExtension(file);
    const objectPath = `${userId}/${timestamp}-${randomStr}.${ext}`;
    const candidates: Array<{ bucket: string; path: string }> = [
      { bucket: "study-reels", path: objectPath },
      { bucket: "question-images", path: `study-reels/${objectPath}` },
    ];

    for (const candidate of candidates) {
      try {
        const { data, error } = await supabase.storage
          .from(candidate.bucket)
          .upload(candidate.path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "video/mp4",
          });

        if (!error && data?.path) {
          const { data: urlData } = supabase.storage
            .from(candidate.bucket)
            .getPublicUrl(data.path);
          if (urlData?.publicUrl) {
            return {
              mediaUrl: urlData.publicUrl,
              storedIn: "supabase",
            };
          }
        }
      } catch {
        // Try next bucket or fall back to IndexedDB
      }
    }
  }

  const idbUrl = await saveLocalReelVideo(file, file.name);
  return {
    mediaUrl: idbUrl,
    storedIn: "indexeddb",
  };
}

export async function deleteStoredReelMedia(mediaUrl?: string | null): Promise<void> {
  if (!mediaUrl) return;
  if (isIndexedDbReelUrl(mediaUrl)) {
    await deleteLocalReelVideo(mediaUrl);
    return;
  }

  if (!supabase) return;
  for (const bucket of ["study-reels", "question-images"]) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = mediaUrl.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(mediaUrl.slice(idx + marker.length).split("?")[0]);
      if (path) {
        try {
          await supabase.storage.from(bucket).remove([path]);
        } catch {
          // Best-effort cleanup
        }
      }
      return;
    }
  }
}
