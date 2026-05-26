import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCanvasStore } from '../store/canvasStore';
import { useAuthStore } from '../store/authStore';
import { useCollabStore } from '../store/collabStore';
import { supabase } from '../lib/supabase';
import { Trash2 } from 'lucide-react';
import { DeleteProjectModal } from '../components/DeleteProjectModal/DeleteProjectModal';
import './Welcome.css';

type WelcomeBoard = {
  id: string;
  name: string;
  created_at: string;
  role: 'owner' | 'editor' | 'viewer';
};

export function Welcome() {
  const { isDarkMode } = useCanvasStore();
  const { user, signOut } = useAuthStore();
  const { createBoard, deleteBoard } = useCollabStore();
  const navigate = useNavigate();

  const [boards, setBoards] = useState<WelcomeBoard[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<WelcomeBoard | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserBoards();
    }
  }, [user]);

  const fetchUserBoards = async () => {
    setBoardsLoading(true);
    try {
      const { data } = await supabase
        .from('board_members')
        .select('board_id, role, boards(id, name, created_at)')
        .eq('email', user!.email!)
        .order('created_at', { ascending: false });

      if (data) {
        const boardsList = data
          .map((item: any) => item.boards ? { ...item.boards, role: item.role } : null)
          .filter(Boolean)
          .slice(0, 10);
        setBoards(boardsList);
      }
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    } finally {
      setBoardsLoading(false);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setCreatingBoard(true);
    try {
      const boardId = await createBoard(newBoardName.trim());
      navigate(`/board?boardId=${boardId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create board.');
    } finally {
      setCreatingBoard(false);
    }
  };

  const openDeleteModal = (board: WelcomeBoard) => {
    setBoardToDelete(board);
  };

  const closeDeleteModal = () => {
    if (deletingBoardId) return;
    setBoardToDelete(null);
  };

  const handleConfirmDeleteBoard = async () => {
    if (!boardToDelete) return;

    setDeletingBoardId(boardToDelete.id);
    try {
      await deleteBoard(boardToDelete.id);
      setBoards((currentBoards) => currentBoards.filter((item) => item.id !== boardToDelete.id));
      setBoardToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete board.');
    } finally {
      setDeletingBoardId(null);
    }
  };

  return (
    <div className={`welcome-page ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="welcome-bg-shape shape-1"></div>
      <div className="welcome-bg-shape shape-2"></div>

      <div className="welcome-content" style={{ maxWidth: user ? '720px' : '600px' }}>
        <div className="welcome-logo-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="welcome-logo-icon">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            <path d="M2 2l7.586 7.586"/>
            <circle cx="11" cy="11" r="2"/>
          </svg>
        </div>
        
        <h1 className="welcome-headline">RenaDraw</h1>
        <p className="welcome-subheadline">a fun collaborative whiteboard for your ideas</p>

        {/* Logged In State: Show Boards */}
        {user ? (
          <div className="welcome-dashboard">
            <div className="welcome-user-row">
              <div className="welcome-user-info">
                <div className="welcome-user-avatar">
                  {user.email!.charAt(0).toUpperCase()}
                </div>
                <span className="welcome-user-email">{user.email}</span>
              </div>
              <button className="welcome-sign-out-btn" onClick={signOut}>Sign Out</button>
            </div>

            <div className="welcome-board-actions">
              <Link to="/board" className="welcome-action-btn local-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <span>Start Local Whiteboard</span>
              </Link>
              <button 
                className="welcome-action-btn collab-btn"
                onClick={() => setShowCreateForm(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>New Collaborative Board</span>
              </button>
            </div>

            {/* Create Board Form */}
            {showCreateForm && (
              <form onSubmit={handleCreateBoard} className="welcome-create-form">
                <input
                  type="text"
                  placeholder="Board name (e.g. Project Brainstorm)"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  autoFocus
                  required
                  className="welcome-create-input"
                />
                <div className="welcome-create-form-actions">
                  <button type="submit" className="welcome-create-submit" disabled={creatingBoard}>
                    {creatingBoard ? 'Creating...' : 'Create Board'}
                  </button>
                  <button type="button" className="welcome-create-cancel" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* User's Boards */}
            <div className="welcome-boards-section">
              <h3 className="welcome-boards-title">Your Collaborative Boards</h3>
              {boardsLoading ? (
                <p className="welcome-boards-empty">Loading your boards...</p>
              ) : boards.length === 0 ? (
                <p className="welcome-boards-empty">No boards yet. Create your first collaborative board above!</p>
              ) : (
                <div className="welcome-boards-list">
                  {boards.map((board) => (
                    <div
                      key={board.id}
                      className="welcome-board-item"
                    >
                      <button
                        type="button"
                        className="welcome-board-open-btn"
                        onClick={() => navigate(`/board?boardId=${board.id}`)}
                      >
                        <div className="welcome-board-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <path d="M7 12l3 3 7-7"/>
                          </svg>
                        </div>
                        <div className="welcome-board-info">
                          <span className="welcome-board-name">{board.name}</span>
                          <span className="welcome-board-date">
                            {new Date(board.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <svg className="welcome-board-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </button>
                      {board.role === 'owner' && (
                        <button
                          type="button"
                          className="welcome-board-delete-btn"
                          onClick={() => openDeleteModal(board)}
                          disabled={deletingBoardId === board.id}
                          title="Delete board"
                          aria-label={`Delete ${board.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Logged Out State: Show CTA */
          <div className="welcome-actions">
            <Link to="/board" className="btn-start">
              Start Whiteboard
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
            <Link to="/login" className="btn-signup">
              Sign in to collaborate & save your work →
            </Link>
          </div>
        )}
      </div>

      {boardToDelete && (
        <DeleteProjectModal
          projectName={boardToDelete.name}
          isDeleting={deletingBoardId === boardToDelete.id}
          onCancel={closeDeleteModal}
          onConfirm={handleConfirmDeleteBoard}
        />
      )}
    </div>
  );
}
