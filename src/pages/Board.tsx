import { useEffect } from 'react';
import { Canvas } from '../components/Canvas/Canvas';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { PropertiesPanel } from '../components/PropertiesPanel/PropertiesPanel';
import { TopBar } from '../components/TopBar/TopBar';
import { StatusBar } from '../components/StatusBar/StatusBar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useCanvasStore } from '../store/canvasStore';
import { useAuthStore } from '../store/authStore';
import '../App.css';

export function Board() {
  useKeyboardShortcuts();
  const { isDarkMode } = useCanvasStore();
  const { user, signOut } = useAuthStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <div className="app">
      <TopBar />
      <Toolbar />
      <Canvas />
      <PropertiesPanel />
      <StatusBar />
      
      {/* Temporary Sign Out button for testing */}
      {user && (
        <button 
          onClick={signOut}
          style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Sign Out
        </button>
      )}
    </div>
  );
}
