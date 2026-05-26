import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCollabStore } from '../../store/collabStore';
import { useAuthStore } from '../../store/authStore';
import { X, Copy, Check, Trash2, Mail, Users, UserPlus } from 'lucide-react';
import './InviteModal.css';

interface InviteModalProps {
  onClose: () => void;
}

export function InviteModal({ onClose }: InviteModalProps) {
  const {
    boardId,
    boardName,
    userRole,
    isGuest,
    guestName,
    collaborators,
    members,
    inviteMember,
    updateMemberRole,
    updateActiveAccessorRole,
    removeMember,
    fetchMembers,
  } = useCollabStore();

  const currentUser = useAuthStore.getState().user;
  const isShareOnly = isGuest || !currentUser;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const activeAccessorKey = Object.keys(collaborators).sort().join('|');

  useEffect(() => {
    if (!isShareOnly) {
      fetchMembers();
    }
  }, [fetchMembers, isShareOnly, activeAccessorKey]);

  // Reset notifications on type
  useEffect(() => {
    setLocalError(null);
    setSuccessMessage(null);
  }, [email, role]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setInviteLoading(true);
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await inviteMember(email.trim().toLowerCase(), role);
      setSuccessMessage(`Successfully invited ${email} as ${role}.`);
      setEmail('');
    } catch (err: any) {
      setLocalError(err.message || 'An error occurred during invite.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (memberEmail: string, newRole: 'editor' | 'viewer') => {
    try {
      await updateMemberRole(memberEmail, newRole);
    } catch (err: any) {
      alert(err.message || 'Failed to update member role.');
    }
  };

  const handleActiveAccessorRoleChange = async (
    accessor: {
      email?: string;
      guestId?: string;
      role: 'owner' | 'editor' | 'viewer';
    },
    newRole: 'editor' | 'viewer'
  ) => {
    try {
      if (accessor.guestId) {
        await updateActiveAccessorRole({ guestId: accessor.guestId }, newRole);
      } else if (accessor.email) {
        await updateMemberRole(accessor.email, newRole);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update active user role.');
    }
  };

  const handleRemove = async (memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from this board?`)) return;
    try {
      await removeMember(memberEmail);
    } catch (err: any) {
      alert(err.message || 'Failed to remove member.');
    }
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/board?boardId=${boardId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isOwner = userRole === 'owner';
  const canManage = isOwner;
  const activeAccessors = [
    ...(currentUser ? [{
      id: currentUser.id,
      name: currentUser.email || 'You',
      email: currentUser.email || undefined,
      role: userRole,
      color: 'var(--accent)',
      isSelf: true,
      isGuestAccessor: false,
    }] : isGuest ? [{
      id: 'guest-self',
      name: guestName || 'Guest',
      guestId: 'guest-self',
      role: userRole,
      color: 'var(--accent)',
      isSelf: true,
      isGuestAccessor: true,
    }] : []),
    ...Object.entries(collaborators).map(([id, collaborator]) => ({
      id,
      name: collaborator.email,
      email: collaborator.isGuest ? undefined : collaborator.email,
      guestId: collaborator.isGuest ? id : undefined,
      role: collaborator.role,
      color: collaborator.color,
      isSelf: false,
      isGuestAccessor: Boolean(collaborator.isGuest),
    })),
  ];

  return createPortal(
    <div className="invite-modal-overlay" onClick={onClose}>
      <div className="invite-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="invite-modal-header">
          <div className="invite-modal-title-group">
            <Users size={20} className="invite-modal-title-icon" />
            <h2>Collaborate on "{boardName}"</h2>
          </div>
          <button className="invite-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="invite-modal-body">
          {/* Share Link Section */}
          <div className="invite-section">
            <label className="invite-section-label">Invite via link</label>
            <p className="invite-section-desc">Anyone with this link can view and join this whiteboard.</p>
            <div className="invite-link-group">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/board?boardId=${boardId}`}
                className="invite-link-input"
              />
              <button
                onClick={copyInviteLink}
                className={`invite-copy-btn ${copied ? 'copied' : ''}`}
                title="Copy Link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {isShareOnly ? (
            <div className="invite-alert invite-alert-info invite-share-only-note">
              You are sharing as a guest. Anyone who opens this link can join the project from their browser.
            </div>
          ) : (
            <>
              <div className="invite-divider" />

              {/* Direct Invite Section */}
              <div className="invite-section">
                <label className="invite-section-label">Invite directly</label>
                <p className="invite-section-desc">Add registered users by email and assign their workspace permissions.</p>

                <form onSubmit={handleInviteSubmit} className="invite-form">
                  <div className="invite-input-row">
                    <div className="invite-input-container">
                      <Mail size={16} className="invite-input-icon" />
                      <input
                        type="email"
                        placeholder="user@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="invite-email-input"
                      />
                    </div>

                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                      className="invite-role-select"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>

                    <button
                      type="submit"
                      disabled={inviteLoading || !isOwner}
                      className="invite-submit-btn"
                      title={!isOwner ? 'Only board owners can invite members directly' : ''}
                    >
                      <UserPlus size={16} />
                      <span>Invite</span>
                    </button>
                  </div>
                </form>

                {localError && <div className="invite-alert invite-alert-error">{localError}</div>}
                {successMessage && <div className="invite-alert invite-alert-success">{successMessage}</div>}
                {!isOwner && (
                  <div className="invite-alert invite-alert-info">
                    Only the board owner can invite users directly. Use the share link above to let collaborators join.
                  </div>
                )}
              </div>

              <div className="invite-divider" />

              {/* Members List Section */}
              <div className="invite-section">
                <label className="invite-section-label">Board Members ({members.length})</label>
                <div className="invite-members-list">
                  {members.map((member) => {
                    const isMemberSelf = currentUser && member.email === currentUser.email;
                    return (
                      <div key={member.id} className="invite-member-item">
                        <div className="invite-member-info">
                          <div className="invite-member-avatar">
                            {member.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="invite-member-details">
                            <span className="invite-member-email">
                              {member.email} {isMemberSelf && <span className="invite-badge-self">(You)</span>}
                            </span>
                          </div>
                        </div>

                        <div className="invite-member-actions">
                          {member.role === 'owner' ? (
                            <span className="invite-badge-owner">Owner</span>
                          ) : canManage && !isMemberSelf ? (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.email, e.target.value as 'editor' | 'viewer')}
                                className="invite-member-role-select"
                              >
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                onClick={() => handleRemove(member.email)}
                                className="invite-member-delete-btn"
                                title="Remove Member"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          ) : (
                            <span className="invite-badge-role">
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="invite-divider" />

              <div className="invite-section">
                <label className="invite-section-label">Currently Accessing ({activeAccessors.length})</label>
                <div className="invite-members-list">
                  {activeAccessors.length === 0 ? (
                    <div className="invite-member-empty">No one else is online right now.</div>
                  ) : (
                    activeAccessors.map((accessor) => (
                      <div key={accessor.id} className="invite-member-item">
                        <div className="invite-member-info">
                          <div className="invite-member-avatar" style={{ background: accessor.color }}>
                            {accessor.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="invite-member-details">
                            <span className="invite-member-email">
                              {accessor.name} {accessor.isSelf && <span className="invite-badge-self">(You)</span>}
                            </span>
                          </div>
                        </div>
                        <div className="invite-member-actions">
                          <span className="invite-badge-online">Online</span>
                          {canManage && !accessor.isSelf && accessor.role !== 'owner' ? (
                            <select
                              value={accessor.role}
                              onChange={(e) => handleActiveAccessorRoleChange(accessor, e.target.value as 'editor' | 'viewer')}
                              className="invite-member-role-select"
                              title={accessor.isGuestAccessor ? 'Guest role applies to this session only' : 'Update member role'}
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <span className="invite-badge-role">
                              {accessor.role.charAt(0).toUpperCase() + accessor.role.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
