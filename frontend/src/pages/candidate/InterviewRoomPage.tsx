import { useState, useEffect, useRef, useCallback } from 'react';
import type { AxiosError } from 'axios';
import '@livekit/components-styles';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { useTheme } from '../../contexts/ThemeContext';
import { interviewsApi } from '../../services/api';

// ---------------------------------------------------------------------------
// Supabase Storage upload helper — silently disabled if env vars are absent
// ---------------------------------------------------------------------------
async function uploadRecordingToSupabase(
  blob: Blob,
  interviewId: string,
  candidateName?: string,
): Promise<string | null> {
  const { uploadRecording } = await import('../../lib/supabaseStorage');
  return uploadRecording(blob, interviewId, candidateName ?? 'candidate');
}

// ---------------------------------------------------------------------------
// Pre-join screen
// ---------------------------------------------------------------------------
function PreJoinScreen({
  onJoin,
  isPending,
  error,
  isDark,
}: {
  onJoin: () => void;
  isPending: boolean;
  error: string | null;
  isDark: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camOk, setCamOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        setCamOk(true);
        setMicOk(true);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.muted = true;
        }
      })
      .catch(() => {
        setCamOk(false);
        setMicOk(false);
      });
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const CheckIcon = ({ ok }: { ok: boolean | null }) =>
    ok === null ? (
      <span className="w-5 h-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin inline-block" />
    ) : ok ? (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 ${
        isDark ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'
      }`}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-xl overflow-hidden ${
          isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Interview Room</h1>
              <p className="text-sm opacity-80">Check your setup before joining</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          {/* Camera preview */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide opacity-60">Camera Preview</h2>
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {camOk === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white text-center px-4">
                  <svg className="w-10 h-10 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <p className="text-sm">Camera not detected.<br />Please allow access in your browser.</p>
                </div>
              )}
            </div>
          </div>

          {/* Checklist + instructions */}
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-sm uppercase tracking-wide opacity-60 mb-3">Device Check</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CheckIcon ok={camOk} />
                  <span className="text-sm">Camera {camOk === false ? '— not detected' : 'ready'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon ok={micOk} />
                  <span className="text-sm">Microphone {micOk === false ? '— not detected' : 'ready'}</span>
                </div>
              </div>
              {(camOk === false || micOk === false) && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Allow camera/microphone in browser settings and refresh this page.
                </p>
              )}
            </div>

            <div>
              <h2 className="font-semibold text-sm uppercase tracking-wide opacity-60 mb-3">Before you start</h2>
              <ul className={`space-y-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">•</span>
                  An AI agent will conduct the interview — speak clearly and naturally.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">•</span>
                  Your session is recorded for recruiter review.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">•</span>
                  Stay in a quiet, well-lit environment.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">•</span>
                  Close other tabs and apps to avoid audio interference.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <Link
            to="/candidate/applications"
            className="text-sm opacity-60 hover:opacity-100 transition-opacity"
          >
            ← Back to Applications
          </Link>
          <button
            onClick={onJoin}
            disabled={isPending}
            className="px-7 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Connecting…
              </>
            ) : (
              'Join Interview'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recording bar shown inside the interview room
// ---------------------------------------------------------------------------
function RecordingIndicator({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium shadow-lg ${
        isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-white text-gray-700 border border-gray-200'
      }`}
    >
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      Recording in progress
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function InterviewRoomPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tokenData, setTokenData] = useState<{
    token: string;
    room_name: string;
    livekit_url: string;
  } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'failed'>('idle');

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  const tokenMutation = useMutation({
    mutationFn: () => interviewsApi.getToken(interviewId!),
    onSuccess: (data) => setTokenData(data),
  });

  // Start recording when interview begins
  useEffect(() => {
    if (!tokenData) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        recordingStreamRef.current = stream;
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
        mediaRecorderRef.current = recorder;
        recordedChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.start(1000);
      })
      .catch(() => {
        // Recording not available — interview still proceeds normally
      });

    return () => {
      mediaRecorderRef.current?.stop();
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [tokenData]);

  // Stop recording and upload when interview completes
  const handleInterviewComplete = useCallback(async () => {
    setTokenData(null);
    setCompleted(true);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());

      // Wait briefly for final chunk
      await new Promise((r) => setTimeout(r, 500));

      const chunks = recordedChunksRef.current;
      if (chunks.length > 0 && interviewId) {
        setUploadStatus('uploading');
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = await uploadRecordingToSupabase(blob, interviewId);
        setUploadStatus(url ? 'done' : 'failed');
      }
    }
  }, [interviewId]);

  // Auto-navigate after completion
  useEffect(() => {
    if (!completed) return;
    if (countdown <= 0) { navigate('/candidate/applications'); return; }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [completed, countdown, navigate]);

  // Completion screen
  if (completed) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-8 ${
          isDark ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'
        }`}
      >
        <div
          className={`max-w-md w-full rounded-2xl border-2 p-10 text-center shadow-xl ${
            isDark ? 'border-emerald-700 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-3 text-emerald-800 dark:text-emerald-300">
            Interview Complete
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mb-2">
            Thank you for completing your AI interview. Your responses have been recorded and are
            being analysed.
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            You will be notified by email once the recruiter reviews your results.
          </p>

          {/* Upload status */}
          {uploadStatus === 'uploading' && (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-4">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving recording…
            </div>
          )}
          {uploadStatus === 'done' && (
            <p className="text-sm text-green-600 dark:text-green-400 mb-4">
              Recording saved successfully.
            </p>
          )}

          <Link
            to="/candidate/applications"
            className="inline-flex items-center justify-center w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-3 font-semibold transition-colors mb-3"
          >
            View My Applications
          </Link>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Redirecting automatically in {countdown}s…
          </p>
        </div>
      </div>
    );
  }

  if (!interviewId) {
    return (
      <div className={`px-4 py-12 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <p className="text-red-500">Invalid interview link.</p>
        <button
          onClick={() => navigate('/candidate/applications')}
          className="mt-4 text-blue-600 underline"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  // Pre-join screen
  if (!tokenData) {
    const err = tokenMutation.error as AxiosError<{ detail?: string }> | null;
    const errorMsg = err
      ? (typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : err.message || 'Failed to get interview access')
      : null;

    return (
      <PreJoinScreen
        onJoin={() => tokenMutation.mutate()}
        isPending={tokenMutation.isPending}
        error={errorMsg}
        isDark={isDark}
      />
    );
  }

  const serverUrl =
    tokenData.livekit_url.startsWith('wss') || tokenData.livekit_url.startsWith('ws')
      ? tokenData.livekit_url
      : `wss://${tokenData.livekit_url.replace(/^https?:\/\//, '')}`;

  return (
    <div className="h-screen relative">
      <RecordingIndicator isDark={isDark} />
      <LiveKitRoom
        serverUrl={serverUrl}
        token={tokenData.token}
        audio={true}
        video={true}
        connect={true}
        onDisconnected={handleInterviewComplete}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
