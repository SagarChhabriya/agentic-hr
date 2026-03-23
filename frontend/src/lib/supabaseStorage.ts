/**
 * Uploads a video blob to Supabase Storage using the REST API directly —
 * no SDK required. Falls back silently if env vars are not configured.
 *
 * Required Vercel env vars:
 *   VITE_SUPABASE_URL      e.g. https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY  your project's public anon key
 *
 * Supabase setup (one-time, in the Supabase dashboard):
 *   1. Go to Storage → Create bucket named "interview-recordings"
 *   2. Set the bucket to private (default)
 *   3. Add a storage policy:
 *        INSERT allowed for role: anon  (or authenticated)
 *        Definition: true  (or restrict by folder/user as needed)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const BUCKET = 'interview-recordings';

export const isSupabaseStorageConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Upload a recording blob to Supabase Storage.
 * Returns the public/signed URL on success, null on failure or if not configured.
 */
export async function uploadRecording(
  blob: Blob,
  interviewId: string,
  candidateName = 'candidate',
): Promise<string | null> {
  if (!isSupabaseStorageConfigured) return null;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${interviewId}/${candidateName}_${timestamp}.webm`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'video/webm',
        'x-upsert': 'false',
      },
      body: blob,
    });

    if (!res.ok) {
      console.warn('[Supabase Storage] Upload failed:', res.status, await res.text());
      return null;
    }

    // Return a path reference (not a public URL since the bucket is private)
    return `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`;
  } catch (err) {
    console.warn('[Supabase Storage] Upload error:', err);
    return null;
  }
}
