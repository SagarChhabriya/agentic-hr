import { useState, useEffect, useRef, useCallback } from 'react';
import type { AxiosError } from 'axios';
import '@livekit/components-styles';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
  ControlBar,
  isTrackReference,
} from '@livekit/components-react';
import { Track, ParticipantEvent } from 'livekit-client';
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
// AI Agent visualizer — replaces the generic silhouette
// ---------------------------------------------------------------------------
function AIAgentVisualizer({ isSpeaking, isConnected }: { isSpeaking: boolean; isConnected: boolean }) {
  const BAR_COUNT = 12;
  const barHeights = [0.4, 0.7, 1.0, 0.8, 0.6, 0.9, 1.0, 0.7, 0.5, 0.8, 0.6, 0.4];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden select-none">
      {/* Keyframe styles */}
      <style>{`
        @keyframes barWave {
          0%, 100% { transform: scaleY(0.25); }
          50%       { transform: scaleY(1); }
        }
        @keyframes orbPulse {
          0%, 100% { box-shadow: 0 0 40px 10px rgba(99,102,241,0.4), 0 0 80px 20px rgba(139,92,246,0.2); }
          50%       { box-shadow: 0 0 70px 20px rgba(99,102,241,0.7), 0 0 120px 40px rgba(139,92,246,0.4); }
        }
        @keyframes ringExpand {
          0%   { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>

      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-700"
        style={{
          width: 320, height: 320,
          background: isSpeaking
            ? 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          transition: 'background 0.7s ease',
        }}
      />

      {/* Orb container */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Expanding rings when speaking */}
        {isSpeaking && (
          <>
            <div className="absolute w-36 h-36 rounded-full border border-indigo-400/30"
              style={{ animation: 'ringExpand 2s ease-out infinite' }} />
            <div className="absolute w-36 h-36 rounded-full border border-violet-400/20"
              style={{ animation: 'ringExpand 2s ease-out infinite', animationDelay: '0.7s' }} />
            <div className="absolute w-36 h-36 rounded-full border border-purple-400/15"
              style={{ animation: 'ringExpand 2s ease-out infinite', animationDelay: '1.4s' }} />
          </>
        )}

        {/* Idle ring */}
        {!isSpeaking && (
          <div
            className="absolute w-40 h-40 rounded-full border transition-opacity duration-500"
            style={{ borderColor: 'rgba(99,102,241,0.15)', opacity: isConnected ? 1 : 0.3 }}
          />
        )}

        {/* Core orb */}
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 relative z-10"
          style={{
            background: isSpeaking
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)'
              : isConnected
              ? 'linear-gradient(135deg, rgba(79,70,229,0.7) 0%, rgba(109,40,217,0.5) 100%)'
              : 'linear-gradient(135deg, rgba(55,55,75,0.6) 0%, rgba(30,30,50,0.6) 100%)',
            animation: isSpeaking ? 'orbPulse 1.4s ease-in-out infinite' : 'none',
          }}
        >
          {/* Sparkles / AI icon */}
          <svg className="w-14 h-14 text-white/85" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        </div>
      </div>

      {/* Label */}
      <p className="text-base font-semibold tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
        AI Interviewer
      </p>
      <p className="text-xs font-medium mb-4 transition-colors duration-300" style={{
        color: isSpeaking ? '#818cf8' : isConnected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
      }}>
        {isSpeaking ? '⬤ Speaking' : isConnected ? 'Listening' : 'Connecting…'}
      </p>

      {/* Audio waveform bars */}
      <div className="flex items-center gap-0.5" style={{ height: 32 }}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            className="w-1 rounded-full origin-bottom"
            style={{
              height: isSpeaking ? `${barHeights[i] * 28}px` : '3px',
              background: isSpeaking
                ? `rgba(${99 + i * 4}, ${102 + i * 3}, 241, 0.9)`
                : 'rgba(255,255,255,0.08)',
              animation: isSpeaking ? `barWave 0.9s ease-in-out infinite alternate` : 'none',
              animationDelay: isSpeaking ? `${i * 0.07}s` : '0s',
              transition: 'height 0.2s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local participant tile (candidate video or avatar)
// ---------------------------------------------------------------------------
function CandidateTile({ participantName }: { participantName: string }) {
  const { localParticipant } = useLocalParticipant();
  const camTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const camTrack = camTracks.find(
    (t) => t.participant.identity === localParticipant.identity,
  );

  const hasVideo = camTrack && isTrackReference(camTrack) && !camTrack.publication.isMuted;

  // Ensure camera starts on when joining
  useEffect(() => {
    if (!localParticipant.isCameraEnabled) {
      localParticipant.enableCameraAndMicrophone().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = participantName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'ME';

  return (
    <div className="relative w-full h-full bg-[#13131f] rounded-2xl overflow-hidden border border-white/5">
      {hasVideo && camTrack ? (
        <VideoTrack
          trackRef={camTrack}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600/30 to-violet-700/20 border-2 border-indigo-500/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-300">{initials}</span>
          </div>
          <p className="text-xs text-white/30">Camera off</p>
        </div>
      )}
      {/* Name badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="text-xs text-white/90 font-medium">{participantName || 'You'}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom room view — renders inside LiveKitRoom context
// ---------------------------------------------------------------------------
function CustomRoomView({ candidateName }: { candidateName: string }) {
  const remoteParticipants = useRemoteParticipants();
  const agent = remoteParticipants[0] ?? null;
  const [agentSpeaking, setAgentSpeaking] = useState(false);

  useEffect(() => {
    if (!agent) { setAgentSpeaking(false); return; }
    const update = () => setAgentSpeaking(agent.isSpeaking);
    agent.on(ParticipantEvent.IsSpeakingChanged, update);
    return () => { agent.off(ParticipantEvent.IsSpeakingChanged, update); };
  }, [agent]);

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #09090f 0%, #0d0d1a 100%)' }}
    >
      {/* Main area */}
      <div className="flex-1 grid grid-cols-2 gap-3 p-4 min-h-0">
        {/* Candidate */}
        <CandidateTile participantName={candidateName} />

        {/* AI Agent */}
        <div
          className="rounded-2xl overflow-hidden border relative"
          style={{
            background: 'linear-gradient(135deg, #0c0c18 0%, #10101e 50%, #0a0a14 100%)',
            borderColor: 'rgba(99,102,241,0.12)',
          }}
        >
          <AIAgentVisualizer isSpeaking={agentSpeaking} isConnected={!!agent} />
        </div>
      </div>

      {/* Control bar */}
      <div className="shrink-0 pb-2">
        <ControlBar />
      </div>
    </div>
  );
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
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const CheckIcon = ({ ok }: { ok: boolean | null }) =>
    ok === null ? (
      <span className="w-5 h-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin inline-block" />
    ) : ok ? (
      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`w-full max-w-2xl rounded-2xl border shadow-xl overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
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
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
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
                  <span className="mt-0.5 text-indigo-500">•</span>
                  An AI agent will conduct the interview — speak clearly and naturally.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-500">•</span>
                  Your session is recorded for recruiter review.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-500">•</span>
                  Stay in a quiet, well-lit environment.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-500">•</span>
                  Close other tabs and apps to avoid audio interference.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <Link to="/candidate/applications" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
            ← Back to Applications
          </Link>
          <button
            onClick={onJoin}
            disabled={isPending}
            className="px-7 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors flex items-center gap-2"
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
// Recording indicator pill
// ---------------------------------------------------------------------------
function RecordingIndicator() {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-black/70 text-white border border-white/10 backdrop-blur-sm">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      Recording
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
    candidate_name?: string;
  } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'failed'>('idle');

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
      .catch(() => {});
    return () => {
      mediaRecorderRef.current?.stop();
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [tokenData]);

  const handleInterviewComplete = useCallback(async () => {
    setTokenData(null);
    setCompleted(true);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
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
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`max-w-md w-full rounded-2xl border-2 p-10 text-center shadow-xl ${isDark ? 'border-emerald-700 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-3 text-emerald-800 dark:text-emerald-300">Interview Complete</h1>
          <p className="text-gray-600 dark:text-slate-300 mb-2">
            Thank you for completing your AI interview. Your responses have been recorded and are being analysed.
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            You will be notified by email once the recruiter reviews your results.
          </p>
          {uploadStatus === 'uploading' && (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-4">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving recording…
            </div>
          )}
          {uploadStatus === 'done' && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">Recording saved successfully.</p>
          )}
          <Link to="/candidate/applications"
            className="inline-flex items-center justify-center w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-3 font-semibold transition-colors mb-3">
            View My Applications
          </Link>
          <p className="text-xs text-gray-400 dark:text-slate-500">Redirecting automatically in {countdown}s…</p>
        </div>
      </div>
    );
  }

  if (!interviewId) {
    return (
      <div className={`px-4 py-12 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <p className="text-red-500">Invalid interview link.</p>
        <button onClick={() => navigate('/candidate/applications')} className="mt-4 text-indigo-600 underline">
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
      <RecordingIndicator />
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
        <CustomRoomView candidateName={tokenData.candidate_name || 'You'} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
