import React, { useState, useEffect } from 'react';
import type { OnboardingStep } from '../types';

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    targetSelector: 'body',
    title: 'Welcome to FontPair AI!',
    message: 'Your AI-powered typography companion. Let\'s take a quick tour to get you started on your font pairing journey.',
    placement: 'center',
    actionText: 'Let\'s Go!'
  },
  {
    id: 'analyze',
    targetSelector: '[data-tour="analysis-column"]',
    title: 'Analyze Any Font',
    message: 'Upload font files or images to get AI-powered typography analysis, accessibility insights, and pairing recommendations.',
    placement: 'right',
    actionText: 'Next'
  },
  {
    id: 'find-fonts',
    targetSelector: '[data-tour="find-fonts-button"]',
    title: 'Discover New Fonts',
    message: 'Need font recommendations? Use Find Fonts to get AI suggestions based on your project description and requirements.',
    placement: 'bottom',
    actionText: 'Next'
  },
  {
    id: 'comparison',
    targetSelector: '[data-tour="comparison-area"]',
    title: 'Compare & Critique',
    message: 'Analyze fonts side-by-side and get AI pairing critiques to find the perfect combination for your project.',
    placement: 'center',
    actionText: 'Next'
  },
  {
    id: 'data-warning',
    targetSelector: '[data-tour="settings-button"]',
    title: 'Important: Backup Your Data',
    message: 'Your projects and history are stored in your browser. Clearing browser data will delete them! Use Settings > Export Data to backup your work regularly.',
    placement: 'bottom',
    actionText: 'Start Exploring!'
  }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const step = ONBOARDING_STEPS[currentStep];
      const target = document.querySelector(step.targetSelector);

      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, currentStep]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    if (confirm('Are you sure you want to skip the tour? You can always access it later from Settings.')) {
      onSkip();
    }
  };

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Clickable backdrop for dismissal */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={handleSkip}
        style={{ background: 'transparent' }}
      />

      {/* Dark overlay with cutout using box-shadow - this creates the spotlight effect */}
      <div
        className="absolute transition-all duration-300 pointer-events-none"
        style={{
          top: targetPosition.top - 8,
          left: targetPosition.left - 8,
          width: targetPosition.width + 16,
          height: targetPosition.height + 16,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85)',
          borderRadius: '8px',
        }}
      />

      {/* Spotlight border with pulse animation and glow */}
      <div
        className="absolute border-4 border-white pointer-events-none transition-all duration-300"
        style={{
          top: targetPosition.top - 8,
          left: targetPosition.left - 8,
          width: targetPosition.width + 16,
          height: targetPosition.height + 16,
          borderRadius: '8px',
          boxShadow: '0 0 30px 8px rgba(255, 255, 255, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.1)',
          animation: 'pulse-spotlight 2s ease-in-out infinite',
        }}
      />

      {/* Tooltip Card */}
      <div
        className="absolute bg-surface rounded-xl shadow-2xl p-6 max-w-md pointer-events-auto"
        style={{
          ...getTooltipPosition(targetPosition, step.placement),
          minWidth: '350px',
          animation: 'fade-in-up 0.3s ease-out',
          zIndex: 10000
        }}
      >
        {/* Progress Indicator - Clickable */}
        <div className="flex gap-2 mb-4">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 flex-1 rounded-full transition-colors duration-300 cursor-pointer hover:opacity-80 ${
                index === currentStep ? 'bg-accent' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-primary mb-3">{step.title}</h3>
        <p className="text-secondary text-base leading-relaxed mb-6">{step.message}</p>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
          <button
            onClick={handleSkip}
            className="w-full sm:w-auto text-secondary hover:text-primary text-sm font-medium transition-colors py-2"
          >
            Skip Tour
          </button>

          <button
            onClick={handleNext}
            className="w-full sm:w-auto px-6 py-2.5 bg-accent text-surface rounded-lg font-semibold hover:bg-accent/90 transition-colors"
          >
            {step.actionText}
          </button>
        </div>

        {/* Step Counter */}
        <p className="text-center text-xs text-secondary/60 mt-4">
          Step {currentStep + 1} of {ONBOARDING_STEPS.length}
        </p>
      </div>
    </div>
  );
};

// Helper function to calculate tooltip position with edge safety
const getTooltipPosition = (
  targetPos: { top: number; left: number; width: number; height: number },
  placement?: string
): React.CSSProperties => {
  const offset = 20; // Gap between target and tooltip
  const tooltipWidth = 380; // Approximate tooltip width (minWidth: 350px + padding)
  const margin = 20; // Screen edge margin

  // For center placement, no edge checking needed
  if (placement === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    };
  }

  // Calculate the target's right edge
  const targetRight = targetPos.left + targetPos.width;

  // Check if target is near right edge of screen
  const isNearRightEdge = targetRight > window.innerWidth - 50;
  // Check if target is near left edge of screen
  const isNearLeftEdge = targetPos.left < 50;

  switch (placement) {
    case 'bottom': {
      let left = targetPos.left + targetPos.width / 2;

      // Right edge safety: force tooltip to align to right edge
      if (isNearRightEdge) {
        return {
          top: targetPos.top + targetPos.height + offset,
          right: margin,
          transform: 'none'
        };
      }

      // Left edge safety
      if (left < tooltipWidth / 2 + margin) {
        left = margin;
        return {
          top: targetPos.top + targetPos.height + offset,
          left: left,
          transform: 'none'
        };
      }

      return {
        top: targetPos.top + targetPos.height + offset,
        left: left,
        transform: 'translateX(-50%)'
      };
    }
    case 'top': {
      let left = targetPos.left + targetPos.width / 2;

      // Right edge safety
      if (isNearRightEdge) {
        return {
          bottom: window.innerHeight - targetPos.top + offset,
          right: margin,
          transform: 'none'
        };
      }

      // Left edge safety
      if (left < tooltipWidth / 2 + margin) {
        left = margin;
        return {
          bottom: window.innerHeight - targetPos.top + offset,
          left: left,
          transform: 'none'
        };
      }

      return {
        bottom: window.innerHeight - targetPos.top + offset,
        left: left,
        transform: 'translateX(-50%)'
      };
    }
    case 'right':
      return {
        top: targetPos.top + targetPos.height / 2,
        left: Math.min(targetPos.left + targetPos.width + offset, window.innerWidth - tooltipWidth - margin),
        transform: 'translateY(-50%)'
      };
    case 'left':
      return {
        top: targetPos.top + targetPos.height / 2,
        right: Math.min(window.innerWidth - targetPos.left + offset, window.innerWidth - margin),
        transform: 'translateY(-50%)'
      };
    default:
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
  }
};

export default OnboardingTour;
