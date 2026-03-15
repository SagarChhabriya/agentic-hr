import { useState } from 'react';
import type { AxiosError } from 'axios';
import '@livekit/components-styles';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { useTheme } from '../../contexts/ThemeContext';
import { interviewsApi } from '../../services/api';

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

  const tokenMutation = useMutation({
    mutationFn: () => interviewsApi.getToken(interviewId!),
    onSuccess: (data) => setTokenData(data),
  });

  const handleFetchToken = () => {
    tokenMutation.mutate();
  };

  if (!interviewId) {
    return (
      <div className={`px-4 py-12 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <p className="text-red-500">Invalid interview link.</p>
        <button onClick={() => navigate('/candidate/applications')} className="mt-4 text-blue-600 underline">
          Back to Applications
        </button>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
        <h1 className="text-2xl font-bold mb-4">AI Interview</h1>
        <p className="text-center mb-4 max-w-md">
          Click below to join your scheduled interview. Ensure your camera and microphone are ready.
          An AI interviewer will conduct the session based on the job description.
        </p>
        <p className="text-center text-sm opacity-80 mb-6 max-w-md">
          If you see a camera error, allow camera/microphone in your browser and close other apps using them.
          If the AI interviewer never appears, the interview agent service may not be running—contact support.
        </p>
        {tokenMutation.isError && (
          <p className="text-red-500 mb-4 text-sm">
            {(() => {
              const err = tokenMutation.error as AxiosError<any>;
              const detail = err.response?.data?.detail;
              if (typeof detail === 'string') {
                // Backend may say: "Interview will be available at 2026-03-15T18:30:00+05:00 (Asia/Karachi)."
                return detail;
              }
              return err.message || 'Failed to get interview access';
            })()}
          </p>
        )}
        <button
          onClick={handleFetchToken}
          disabled={tokenMutation.isPending}
          className="px-6 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          {tokenMutation.isPending ? 'Connecting...' : 'Join Interview'}
        </button>
        <button onClick={() => navigate('/candidate/applications')} className="mt-6 text-sm text-slate-500 hover:underline">
          ← Back to Applications
        </button>
      </div>
    );
  }

  const serverUrl = tokenData.livekit_url.startsWith('wss') || tokenData.livekit_url.startsWith('ws')
    ? tokenData.livekit_url
    : `wss://${tokenData.livekit_url.replace(/^https?:\/\//, '')}`;

  return (
    <div className="h-screen">
      <LiveKitRoom
        serverUrl={serverUrl}
        token={tokenData.token}
        audio={true}
        video={true}
        connect={true}
        onDisconnected={() => {
          setTokenData(null);
          navigate('/candidate/applications');
        }}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
