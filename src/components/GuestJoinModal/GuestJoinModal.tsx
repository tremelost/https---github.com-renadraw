import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollabStore } from '../../store/collabStore';
import { supabase } from '../../lib/supabase';
import './GuestJoinModal.css';

const GUEST_ANIMALS = [
  '🦊 Fox', '🐻 Bear', '🐼 Panda', '🐨 Koala', '🐯 Tiger',
  '🦁 Lion', '🐸 Frog', '🐙 Octopus', '🦋 Butterfly', '🦄 Unicorn',
  '🐬 Dolphin', '🦅 Eagle', '🦉 Owl', '🐺 Wolf', '🦝 Raccoon',
  '🐮 Cow', '🐧 Penguin', '🦜 Parrot', '🦩 Flamingo', '🐊 Croc',
];

const randomAnimal = () => GUEST_ANIMALS[Math.floor(Math.random() * GUEST_ANIMALS.length)];

interface Props {
  boardId: string;
  onJoin: () => void;
}

export function GuestJoinModal({ boardId, onJoin }: Props) {
  const [guestName, setGuestName] = useState(() => `Guest ${randomAnimal()}`);
  const [boardName, setBoardName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedName, setFetchedName] = useState(false);
  const { joinBoardAsGuest } = useCollabStore();
  const navigate = useNavigate();

  // Fetch board name once for display (anon read — requires public RLS policy)
  if (!fetchedName) {
    setFetchedName(true);
    supabase
      .from('boards')
      .select('name')
      .eq('id', boardId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setBoardName(data.name);
      });
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setLoading(true);
    const ok = await joinBoardAsGuest(boardId, guestName.trim());
    if (ok) {
      onJoin();
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="guest-modal-overlay">
      <div className="guest-modal">
        {/* Logo */}
        <div className="guest-modal-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            <path d="M2 2l7.586 7.586"/>
            <circle cx="11" cy="11" r="2"/>
          </svg>
        </div>

        <h2 className="guest-modal-title">
          {boardName ? `Join "${boardName}"` : 'Join Collaborative Board'}
        </h2>
        <p className="guest-modal-subtitle">
          Choose a display name to view this board as a guest. The project owner controls who can edit.
        </p>

        <form onSubmit={handleJoin} className="guest-modal-form">
          <label className="guest-modal-label">Your display name</label>
          <div className="guest-modal-input-row">
            <input
              type="text"
              className="guest-modal-input"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              maxLength={32}
              required
              autoFocus
              placeholder="e.g. Guest 🦊 Fox"
            />
            <button
              type="button"
              className="guest-modal-shuffle"
              onClick={() => setGuestName(`Guest ${randomAnimal()}`)}
              title="Shuffle name"
            >
              🔀
            </button>
          </div>

          <button
            type="submit"
            className="guest-modal-join-btn"
            disabled={loading || !guestName.trim()}
          >
            {loading ? (
              <span className="guest-modal-spinner" />
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                View as Guest
              </>
            )}
          </button>
        </form>

        <div className="guest-modal-divider">
          <span>or</span>
        </div>

        <button
          className="guest-modal-signin-btn"
          onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/board?boardId=${boardId}`)}`)}
        >
          Sign In for full access →
        </button>

        <p className="guest-modal-note">
          Guest sessions are view-only. Sign in if the owner needs to add you as an editor.
        </p>
      </div>
    </div>
  );
}
