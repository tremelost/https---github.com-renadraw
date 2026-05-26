import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import './DeleteProjectModal.css';

interface DeleteProjectModalProps {
  projectName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteProjectModal({
  projectName,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteProjectModalProps) {
  return createPortal(
    <div className="delete-project-overlay" onClick={isDeleting ? undefined : onCancel}>
      <div
        className="delete-project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="delete-project-header">
          <div className="delete-project-icon">
            <AlertTriangle size={22} />
          </div>
          <button
            type="button"
            className="delete-project-close"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Close delete confirmation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="delete-project-body">
          <h2 id="delete-project-title">Delete project?</h2>
          <p>
            You are about to permanently delete <strong>{projectName}</strong>. This action will remove the project
            for everyone and cannot be undone.
          </p>
          <div className="delete-project-warning">
            Make sure this project is no longer needed before continuing.
          </div>
        </div>

        <div className="delete-project-actions">
          <button
            type="button"
            className="delete-project-cancel-btn"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-project-confirm-btn"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? 'Deleting...' : 'Delete Project'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
