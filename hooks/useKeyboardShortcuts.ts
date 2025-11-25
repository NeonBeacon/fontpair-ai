import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onToggleHelp: () => void;
  onOpenSettings: () => void;
  onToggleProjects: () => void;
  onFindFonts: () => void;
  onRestartTour: () => void;
  onCloseModal: () => void;
}

export const useKeyboardShortcuts = ({
  onToggleHelp,
  onOpenSettings,
  onToggleProjects,
  onFindFonts,
  onRestartTour,
  onCloseModal,
}: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if an input or textarea is focused
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        // Allow Escape to blur inputs
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
          return;
        }
        return;
      }

      // Helper to check for Command (Mac) or Control (Windows/Linux)
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Toggle Help: ? or Cmd/Ctrl + /
      if ((e.key === '?' && !isCmdOrCtrl) || (e.key === '/' && isCmdOrCtrl)) {
        e.preventDefault();
        onToggleHelp();
      }

      // Open Settings: Cmd/Ctrl + ,
      if (e.key === ',' && isCmdOrCtrl) {
        e.preventDefault();
        onOpenSettings();
      }

      // Toggle Projects: Cmd/Ctrl + p
      if (e.key === 'p' && isCmdOrCtrl) {
        e.preventDefault();
        onToggleProjects();
      }

      // Find Fonts: Cmd/Ctrl + f
      if (e.key === 'f' && isCmdOrCtrl) {
        e.preventDefault();
        onFindFonts();
      }

      // Restart Tour: Cmd/Ctrl + o
      if (e.key === 'o' && isCmdOrCtrl) {
        e.preventDefault();
        onRestartTour();
      }

      // Close Modal: Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onToggleHelp,
    onOpenSettings,
    onToggleProjects,
    onFindFonts,
    onRestartTour,
    onCloseModal,
  ]);
};
