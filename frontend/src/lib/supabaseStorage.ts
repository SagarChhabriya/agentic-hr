/**
 * Uploads a video blob to Supabase Storage using the REST API directly.
 * Falls back silently if env vars are not configured.
 *
 * Required env vars (set in Vercel / .env.local):
 *   VITE_SUPABASE_URL      e.g. https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY  your project's public anon key
 *
 * Supabase setup (one-time, in the Supabase dashboard):
 *   1. Storage → Create bucket named "interview-recordings" (private)
 *   2. Storage Policies → INSERT allowed for role: anon
 *      (e.g. policy name: "Allow anon uploads", definition: true)
 *   The backend uses the service key to generate signed URLs for recruiters.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const BUCKET = 'interview-recordings';

export const isSupabaseStorageConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export interface UploadResult {
  /** Storage path relative to the bucket root, e.g. "uuid/name_ts.webm" */
  path: string;
  /** Full REST URL (not signed — use backend /recording-url for signed access) */
  rawUrl: string;
}

/**
 * Upload a recording blob to Supabase Storage.
 * Returns an UploadResult on success, null on failure or if not configured.
 */
export async function uploadRecording(
  blob: Blob,
  interviewId: string,
  candidateName = 'candidate',
): Promise<UploadResult | null> {
  if (!isSupabaseStorageConfigured) {
    console.info('[Supabase Storage] Not configured — skipping upload.');
    return null;
  }

  // Sanitize candidate name for safe filenames
  const safeName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `${interviewId}/${safeName}_${timestamp}.webm`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  try {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
        'Content-Type': 'video/webm',
        'x-upsert': 'false',
      },
      body: blob,
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn('[Supabase Storage] Upload failed:', res.status, text);
      return null;
    }

    return {
      path,
      rawUrl: `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    };
  } catch (err) {
    console.warn('[Supabase Storage] Upload error:', err);
    return null;
  }
}
