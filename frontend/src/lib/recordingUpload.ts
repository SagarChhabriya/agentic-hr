import { createClient } from '@supabase/supabase-js';
import { interviewsApi } from '../services/api';

const BUCKET = 'interview-recordings';

/**
 * 1) Signed URL from API → direct browser upload to Supabase (large files; shows in Storage logs).
 * 2) Multipart through API (small deploys / no frontend Supabase env).
 * 3) Legacy anon POST + PATCH path.
 */
export async function uploadInterviewRecordingBestEffort(
  blob: Blob,
  interviewId: string,
  candidateNameForFallback: string,
): Promise<void> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (url && anon && blob.size > 0) {
    try {
      const sig = await interviewsApi.createRecordingSignedUpload(interviewId);
      const supabase = createClient(url, anon);
      // Blob → multipart FormData in storage-js; some browsers/CORS choke on that for signed PUT.
      // ArrayBuffer → raw body + Content-Type: video/webm (matches Storage signed-upload API).
      const body = await blob.arrayBuffer();
      // Must match the signed JWT: backend signs with upsert=false by default; x-upsert:true breaks the PUT.
      const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(sig.storage_path, sig.token, body, {
        contentType: 'video/webm',
        upsert: false,
        cacheControl: '3600',
      });
      if (error) throw error;
      await interviewsApi.saveRecordingPath(interviewId, sig.storage_path);
      return;
    } catch (e) {
      console.warn('[Recording] Signed direct-to-Supabase upload failed, trying API proxy:', e);
    }
  }

  try {
    await interviewsApi.uploadRecordingBlob(interviewId, blob, { timeout: 180_000 });
  } catch (backendErr) {
    console.warn('[Recording] API upload failed, trying anon storage:', backendErr);
    const { uploadRecording } = await import('./supabaseStorage');
    const direct = await uploadRecording(blob, interviewId, candidateNameForFallback);
    if (direct) {
      try {
        await interviewsApi.saveRecordingPath(interviewId, direct.path);
      } catch (e) {
        console.warn('[Recording] saveRecordingPath failed:', e);
      }
    }
  }
}
