import { useState, useEffect, useCallback } from 'react';
import axios from '../../config/axios';

export default function EmulatorViewer({ applicationId }) {
  const [noVncUrl, setNoVncUrl] = useState(null);
  const [status, setStatus] = useState('booting'); // 'booting' | 'ready' | 'error'
  const [error, setError] = useState(null);

  const startEmulator = useCallback(async () => {
    setStatus('booting');
    setError(null);
    setNoVncUrl(null);
    try {
      const res = await axios.post(`/api/emulator/start/${applicationId}`);
      setNoVncUrl(res.data.noVncUrl);
      setStatus('ready');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to start emulator');
      setStatus('error');
    }
  }, [applicationId]);

  useEffect(() => {
    startEmulator();
    // Optionally, cleanup logic if needed
    // return () => { ... }
  }, [startEmulator]);

  if (status === 'booting') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <span className="loading loading-spinner loading-lg mb-2"></span>
        Booting emulator...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <div className="mb-2">Failed to start emulator: {error}</div>
        <button className="btn btn-sm btn-ghost" onClick={startEmulator}>
          Retry
        </button>
      </div>
    );
  }

  // status === 'ready'
  return (
    <iframe
      src={noVncUrl}
      title="Android Emulator"
      className="w-full h-full border overflow-clip"
      allowFullScreen
    />
  );
}