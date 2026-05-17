import { Link } from 'react-router-dom';
import { useCanvasStore } from '../store/canvasStore';
import './Welcome.css';

export function Welcome() {
  const { isDarkMode } = useCanvasStore();

  return (
    <div className={`welcome-page ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="welcome-bg-shape shape-1"></div>
      <div className="welcome-bg-shape shape-2"></div>

      <div className="welcome-content">
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

        <div className="welcome-actions">
          <Link to="/board" className="btn-start">
            Start Whiteboard
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </Link>
          <Link to="/login" className="btn-signup">
            Want to save your work? Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
