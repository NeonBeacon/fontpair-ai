import React from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
    { keys: ['Ctrl', ','], description: 'Open Settings' },
    { keys: ['Ctrl', 'P'], description: 'Toggle Projects Panel' },
    { keys: ['Ctrl', 'F'], description: 'Find Fonts / Compare View' },
    { keys: ['Ctrl', 'O'], description: 'Restart Onboarding Tour' },
    { keys: ['Esc'], description: 'Close Modal / Blur Input' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md p-6 bg-surface border-2 border-accent/30 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors"
          aria-label="Close shortcuts"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Keyboard Shortcuts
        </h2>

        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between pb-2 border-b border-border last:border-0">
              <span className="text-sm text-secondary font-medium">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, kIndex) => (
                  <span 
                    key={kIndex} 
                    className="px-2 py-1 min-w-[1.5rem] text-center text-xs font-bold text-surface bg-secondary/80 rounded border-b-2 border-secondary/50 shadow-sm"
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center text-xs text-secondary/60">
          <p>Press <kbd className="font-mono bg-border/30 px-1 rounded">?</kbd> at any time to open this menu</p>
        </div>
      </div>
      
      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
};

export default KeyboardShortcutsModal;
