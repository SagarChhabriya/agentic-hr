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
  useRoomContext,
  useTracks,
  VideoTrack,
  ControlBar,
  isTrackReference,
} from '@livekit/components-react';
import { Track, ParticipantEvent } from 'livekit-client';
import { useTheme } from '../../contexts/ThemeContext';
import { interviewsApi } from '../../services/api';
import { uploadInterviewRecordingBestEffort } from '../../lib/recordingUpload';
import { showToast } from '../../components/Toast';

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
function CustomRoomView({
  candidateName,
  audioCtxRef,
  destRef,
}: {
  candidateName: string;
  audioCtxRef: React.MutableRefObject<AudioContext | null>;
  destRef: React.MutableRefObject<MediaStreamAudioDestinationNode | null>;
}) {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const agent = remoteParticipants[0] ?? null;
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [agentLeft, setAgentLeft] = useState(false);
  const [leaveIn, setLeaveIn] = useState(6);
  const hadAgentRef = useRef(false);
  const agentMixedRef = useRef(false);

  /** Hard cap aligned with agent MAX_INTERVIEW_SECONDS (10 min default) — disconnect if agent fails to. */
  const MAX_INTERVIEW_MS = 10 * 60 * 1000;
  useEffect(() => {
    const id = window.setTimeout(() => {
      room.disconnect().catch(() => {});
    }, MAX_INTERVIEW_MS);
    return () => window.clearTimeout(id);
  }, [room]);

  // Track that agent was connected at least once
  useEffect(() => {
    if (agent) hadAgentRef.current = true;
  }, [agent]);

  // Detect agent departing after joining
  useEffect(() => {
    if (hadAgentRef.current && !agent) {
      setAgentLeft(true);
    }
  }, [agent]);

  // Countdown then force-disconnect so onDisconnected fires → recording upload
  useEffect(() => {
    if (!agentLeft) return;
    if (leaveIn <= 0) {
      room.disconnect();
      return;
    }
    const id = setTimeout(() => setLeaveIn((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [agentLeft, leaveIn, room]);

  useEffect(() => {
    if (!agent) { setAgentSpeaking(false); return; }
    const update = () => setAgentSpeaking(agent.isSpeaking);
    agent.on(ParticipantEvent.IsSpeakingChanged, update);
    return () => { agent.off(ParticipantEvent.IsSpeakingChanged, update); };
  }, [agent]);

  // Mix agent audio into the recording when the agent connects
  useEffect(() => {
    if (!agent || agentMixedRef.current) return;
    const audioCtx = audioCtxRef.current;
    const dest = destRef.current;
    if (!audioCtx || !dest) return;

    const tryMix = () => {
      for (const [, pub] of agent.audioTrackPublications) {
        const mediaStream = pub.track?.mediaStream;
        if (mediaStream) {
          try {
            const source = audioCtx.createMediaStreamSource(mediaStream);
            source.connect(dest);
            agentMixedRef.current = true;
            console.log('[Recording] Agent audio mixed in');
            return true;
          } catch {
            // ignore — may be suspended or already connected
          }
        }
      }
      return false;
    };

    if (!tryMix()) {
      // Retry after tracks settle
      const t = setTimeout(tryMix, 1500);
      return () => clearTimeout(t);
    }
  }, [agent, audioCtxRef, destRef]);

  return (
    <div
      className="h-screen flex flex-col relative"
      style={{ background: 'linear-gradient(180deg, #09090f 0%, #0d0d1a 100%)' }}
    >
      {/* Agent-left overlay */}
      {agentLeft && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="text-center px-8 py-10 rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl max-w-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Interview Complete</h2>
            <p className="text-sm text-white/60 mb-6">
              The AI interviewer has finished. Your responses have been recorded.
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-indigo-300 font-medium">
                Ending session in <span className="tabular-nums font-bold text-white">{leaveIn}s</span>…
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 grid grid-cols-2 gap-3 p-4 min-h-0">
        <CandidateTile participantName={candidateName} />
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
// Browser detection helper for permission fix instructions
// ---------------------------------------------------------------------------
function detectBrowser(): 'chrome' | 'firefox' | 'safari' | 'edge' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Chrome/')) return 'chrome';
  if (ua.includes('Firefox/')) return 'firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'safari';
  return 'other';
}

const BROWSER_STEPS: Record<string, { name: string; steps: string[] }> = {
  chrome: {
    name: 'Chrome',
    steps: [
      'Click the 🔒 lock icon or camera icon in the address bar (top-left of the URL).',
      'Find "Camera" and "Microphone" and change both to "Allow".',
      'Click "Reload" or press Ctrl + R (Cmd + R on Mac) to refresh.',
    ],
  },
  edge: {
    name: 'Edge',
    steps: [
      'Click the 🔒 lock icon in the address bar.',
      'Select "Permissions for this site".',
      'Set Camera and Microphone to "Allow".',
      'Refresh the page with Ctrl + R.',
    ],
  },
  firefox: {
    name: 'Firefox',
    steps: [
      'Click the camera/microphone icon that appeared in the address bar when permission was requested.',
      'Or click the 🔒 lock icon → "Connection Secure" → "More Information" → "Permissions" tab.',
      'Allow Camera and Microphone access.',
      'Refresh the page with Ctrl + R.',
    ],
  },
  safari: {
    name: 'Safari',
    steps: [
      'Open Safari → Settings (or Preferences) → Websites.',
      'Select "Camera" from the left sidebar — find this site and set to "Allow".',
      'Do the same for "Microphone".',
      'Reload this page.',
    ],
  },
  other: {
    name: 'your browser',
    steps: [
      'Look for a camera or lock icon in the address bar.',
      'Click it and set Camera and Microphone to "Allow".',
      'Refresh this page.',
    ],
  },
};

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
  const streamRef = useRef<MediaStream | null>(null);
  const [camOk, setCamOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const browser = detectBrowser();
  const guide = BROWSER_STEPS[browser];

  const checkDevices = useCallback(async () => {
    setCamOk(null);
    setMicOk(null);

    // Camera
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCamOk(true);
      if (videoRef.current) {
        videoRef.current.srcObject = camStream;
        videoRef.current.muted = true;
      }
      streamRef.current = camStream;
    } catch {
      setCamOk(false);
      setShowGuide(true);
    }

    // Microphone (separate check for granular feedback)
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      setMicOk(true);
      micStream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicOk(false);
      setShowGuide(true);
    }
  }, []);

  useEffect(() => {
    checkDevices();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permissionsReady = camOk === true && micOk === true;
  const stillChecking = camOk === null || micOk === null;
  const anyBlocked = camOk === false || micOk === false;
  const canJoin = permissionsReady && !isPending;

  const DeviceRow = ({ ok, label, icon }: { ok: boolean | null; label: string; icon: React.ReactNode }) => (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      ok === true
        ? isDark ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-emerald-50 border-emerald-200'
        : ok === false
        ? isDark ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200'
        : isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        ok === true ? isDark ? 'bg-emerald-800/40' : 'bg-emerald-100'
        : ok === false ? isDark ? 'bg-red-800/40' : 'bg-red-100'
        : isDark ? 'bg-slate-600' : 'bg-gray-200'
      }`}>
        <span className={ok === true ? 'text-emerald-500' : ok === false ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-gray-500'}>
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${
          ok === true ? 'text-emerald-700 dark:text-emerald-300'
          : ok === false ? 'text-red-700 dark:text-red-300'
          : isDark ? 'text-slate-300' : 'text-gray-700'
        }`}>{label}</p>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {ok === null ? 'Requesting access…' : ok ? 'Access granted' : 'Access blocked — see fix below'}
        </p>
      </div>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
        ok === true ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
        : ok === false ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
        : isDark ? 'bg-slate-600 text-slate-400' : 'bg-gray-200 text-gray-500'
      }`}>
        {ok === null ? '…' : ok ? '✓ Ready' : '✗ Blocked'}
      </span>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
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
              <p className="text-sm opacity-80">Camera &amp; microphone required before you can join</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          {/* Camera preview */}
          <div className="space-y-3">
            <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Camera Preview</p>
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video ring-1 ring-white/5">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
              {camOk === null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3">
                  <span className="w-8 h-8 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  <p className="text-sm opacity-60">Requesting camera…</p>
                </div>
              )}
              {camOk === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white text-center px-5 gap-3">
                  <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                    <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Camera Blocked</p>
                    <p className="text-xs opacity-60 mt-1 leading-tight">Follow the fix guide and click "Retry"</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Device check */}
          <div className="space-y-4">
            <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Device Check</p>
            <div className="space-y-2">
              <DeviceRow ok={camOk} label="Camera" icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              } />
              <DeviceRow ok={micOk} label="Microphone" icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              } />
            </div>

            {/* Fix guide — shown when blocked */}
            {anyBlocked && (
              <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-amber-700/50' : 'border-amber-200'}`}>
                <button
                  type="button"
                  onClick={() => { showToast('Toggled help guide', 'info'); setShowGuide((v) => !v); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors ${isDark ? 'bg-amber-900/30 text-amber-300 hover:bg-amber-900/40' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    How to allow camera &amp; mic in {guide.name}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${showGuide ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showGuide && (
                  <div className={`px-4 py-3 text-xs leading-relaxed space-y-2 ${isDark ? 'bg-amber-900/10 text-amber-200' : 'bg-amber-50/60 text-amber-900'}`}>
                    <ol className="space-y-2">
                      {guide.steps.map((step, i) => (
                        <li key={i} className="flex gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${isDark ? 'bg-amber-700/60 text-amber-200' : 'bg-amber-200 text-amber-800'}`}>
                            {i + 1}
                          </span>
                          <span dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </li>
                      ))}
                    </ol>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => { showToast('Retrying device check…', 'info'); setShowGuide(false); checkDevices(); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-amber-700/40 hover:bg-amber-700/60 text-amber-200' : 'bg-amber-200 hover:bg-amber-300 text-amber-900'}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry device check
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tips — only shown when all good */}
            {permissionsReady && (
              <div className={`rounded-xl border p-3 space-y-1.5 ${isDark ? 'border-slate-700 bg-slate-700/30' : 'border-gray-100 bg-gray-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Before you start</p>
                {[
                  'Speak clearly — an AI agent conducts the interview.',
                  'Session is recorded and reviewed by the recruiter.',
                  'Stay in a quiet, well-lit space.',
                  'Close other tabs to avoid audio interference.',
                ].map((tip) => (
                  <p key={tip} className={`flex items-start gap-1.5 text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    <svg className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    {tip}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 px-4 py-3 rounded-xl border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <Link to="/candidate/applications" onClick={() => showToast('Back to applications', 'info')} className={`text-sm ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
            ← Back
          </Link>

          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={() => {
                if (canJoin) showToast('Connecting to interview room…', 'info');
                onJoin();
              }}
              disabled={!canJoin}
              title={stillChecking ? 'Checking devices…' : !permissionsReady ? 'Allow camera and microphone to join' : ''}
              className={`px-7 py-2.5 rounded-xl font-semibold text-white transition-all flex items-center gap-2 text-sm ${
                canJoin
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg hover:shadow-indigo-500/25'
                  : 'bg-gray-300 dark:bg-slate-600 cursor-not-allowed'
              }`}
            >
              {isPending ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Connecting…</>
              ) : stillChecking ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Checking…</>
              ) : !permissionsReady ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Locked
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Join Interview
                </>
              )}
            </button>
            {anyBlocked && (
              <p className="text-xs text-red-500 dark:text-red-400 font-medium">
                Allow {camOk === false && micOk === false ? 'camera & mic' : camOk === false ? 'camera' : 'microphone'} to continue
              </p>
            )}
          </div>
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
  /** When true, recording stop + upload finished (or attempted); allows redirect countdown. */
  const [finalizeDone, setFinalizeDone] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Stable refs for recording — avoids stale-closure issues in callbacks
  const candidateNameRef = useRef<string>('candidate');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  /** Prevents double onDisconnected; avoids recording effect cleanup racing upload */
  const interviewFinalizeStartedRef = useRef(false);
  // Web Audio refs for mixing both candidate mic + agent audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  useEffect(() => {
    interviewFinalizeStartedRef.current = false;
    setFinalizeDone(false);
  }, [interviewId]);

  const tokenMutation = useMutation({
    mutationFn: () => interviewsApi.getToken(interviewId!),
    onSuccess: (data) => {
      candidateNameRef.current = data.candidate_name || 'candidate';
      setTokenData(data);
    },
  });

  // Start recording when interview begins — mix candidate mic + video into an AudioContext
  // so the agent audio track can be added dynamically once the agent joins
  useEffect(() => {
    if (!tokenData) return;
    let active = true;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        recordingStreamRef.current = stream;

        // Set up Web Audio mixing node
        const audioCtx = new AudioContext();
        void audioCtx.resume().catch(() => {});
        const dest = audioCtx.createMediaStreamDestination();
        audioCtxRef.current = audioCtx;
        destRef.current = dest;

        const micSource = audioCtx.createMediaStreamSource(stream);
        micSource.connect(dest);

        // Combined stream: candidate video + mixed audio (agent audio is added by CustomRoomView)
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
            ? 'video/webm;codecs=vp8,opus'
            : 'video/webm';
        const recordingStream = new MediaStream([
          ...stream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
        const recorder = new MediaRecorder(recordingStream, { mimeType });
        mediaRecorderRef.current = recorder;
        recordedChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.start(1000);
      })
      .catch((err) => {
        console.warn('[InterviewRoom] Recording getUserMedia / MediaRecorder setup failed:', err);
      });

    return () => {
      active = false;
      // If we're in handleInterviewComplete, it stops the recorder and uploads — don't race it.
      if (interviewFinalizeStartedRef.current) {
        return;
      }
      mediaRecorderRef.current?.stop();
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      destRef.current = null;
    };
  }, [tokenData]);

  const handleInterviewComplete = useCallback(async () => {
    if (interviewFinalizeStartedRef.current) return;
    interviewFinalizeStartedRef.current = true;

    // Show completion UI first, but keep tokenData until upload finishes so the recording
    // effect does not run cleanup and destroy the MediaRecorder before we flush chunks.
    setCompleted(true);

    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          const failSafe = window.setTimeout(() => resolve(), 5000);
          const done = () => {
            window.clearTimeout(failSafe);
            resolve();
          };
          recorder.addEventListener('error', done, { once: true });
          recorder.addEventListener('stop', done, { once: true });
          try {
            if (typeof recorder.requestData === 'function') recorder.requestData();
          } catch {
            /* ignore */
          }
          try {
            recorder.stop();
          } catch {
            done();
          }
        });
        recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        destRef.current = null;
        await new Promise((r) => setTimeout(r, 400));
        const chunks = recordedChunksRef.current;
        if (chunks.length > 0 && interviewId) {
          const blob = new Blob(chunks, { type: 'video/webm' });
          await uploadInterviewRecordingBestEffort(blob, interviewId, candidateNameRef.current);
        } else if (interviewId) {
          console.warn('[InterviewRoom] No recording chunks to upload');
        }
      } else {
        recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        destRef.current = null;
      }
    } catch (e) {
      console.warn('[InterviewRoom] Interview finalize error:', e);
    } finally {
      setFinalizeDone(true);
      setTokenData(null);
    }
  }, [interviewId]);

  useEffect(() => {
    if (completed) setCountdown(10);
  }, [completed]);

  // Auto-navigate only after finalize (upload) so we do not unmount mid-request
  useEffect(() => {
    if (!completed || !finalizeDone) return;
    if (countdown <= 0) {
      navigate('/candidate/applications');
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [completed, finalizeDone, countdown, navigate]);

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
          <Link to="/candidate/applications"
            onClick={() => showToast('Opening My Applications', 'info')}
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
        <button onClick={() => { showToast('Back to applications', 'info'); navigate('/candidate/applications'); }} className="mt-4 text-indigo-600 underline">
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
        <CustomRoomView
          candidateName={tokenData.candidate_name || 'You'}
          audioCtxRef={audioCtxRef}
          destRef={destRef}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
