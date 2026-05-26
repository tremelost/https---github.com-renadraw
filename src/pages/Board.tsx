import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Canvas } from '../components/Canvas/Canvas';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { PropertiesPanel } from '../components/PropertiesPanel/PropertiesPanel';
import { TopBar } from '../components/TopBar/TopBar';
import { StatusBar } from '../components/StatusBar/StatusBar';
import { GuestJoinModal } from '../components/GuestJoinModal/GuestJoinModal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useCanvasStore } from '../store/canvasStore';
import { useAuthStore } from '../store/authStore';
import { useCollabStore } from '../store/collabStore';
import '../App.css';

export function Board() {
  useKeyboardShortcuts();
  const { isDarkMode } = useCanvasStore();
  const { user } = useAuthStore();
  const { isLoading, error } = useCollabStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const boardIdParam = searchParams.get('boardId');
  const userId = user?.id;

  // Track whether guest has confirmed their name and joined
  const [guestJoined, setGuestJoined] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    // Load board only for logged-in users (guests handled by GuestJoinModal)
    if (boardIdParam && userId) {
      const { boardId, channel, loadBoard } = useCollabStore.getState();
      if (boardId !== boardIdParam || !channel) {
        loadBoard(boardIdParam);
      }
    }
    return () => {
      useCollabStore.getState().leaveBoard();
    };
  }, [boardIdParam, userId]);

  // Guest flow: show the join modal when there's a boardId but no account
  if (boardIdParam && !user && !guestJoined) {
    return (
      <GuestJoinModal
        boardId={boardIdParam}
        onJoin={() => setGuestJoined(true)}
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--canvas-bg)',
        color: 'var(--text-primary)',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--panel-border)',
          borderTop: '4px solid var(--accent)',
          borderRadius: '50%',
          animation: 'pulse-ring 1.5s infinite linear'
        }} />
        <p style={{ fontWeight: 600, fontSize: '15px' }}>Connecting to collaborative whiteboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--canvas-bg)',
        color: 'var(--text-primary)',
        gap: '16px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#EF4444' }}>Collaboration Error</h2>
        <p style={{ maxWidth: '400px', fontSize: '14px', color: 'var(--text-secondary)' }}>{error}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar />
      <Toolbar />
      <Canvas />
      <PropertiesPanel />
      <StatusBar />
    </div>
  );
}
