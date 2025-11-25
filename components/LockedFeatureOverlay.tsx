import React from 'react';

interface LockedFeatureOverlayProps {
  featureName: string;
  upgradeMessage: string;
  onUpgradeClick: () => void;
}

const LockedFeatureOverlay: React.FC<LockedFeatureOverlayProps> = ({
  featureName,
  upgradeMessage,
  onUpgradeClick
}) => {
  return (
    <div className="absolute inset-0 z-30 bg-teal-dark/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 text-center rounded-xl border border-white/10">
      <div className="mb-6 relative">
        <svg className="w-24 h-24 text-teal-medium opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-[#F2EFE8] mb-2 uppercase tracking-wide">{featureName}</h3>
      <p className="text-teal-light mb-8 max-w-md text-lg font-medium">{upgradeMessage}</p>
      
      <button
        onClick={onUpgradeClick}
        className="group relative px-8 py-4 bg-accent text-surface text-lg font-bold rounded-lg hover:bg-accent/90 transition-all duration-300 transform hover:scale-105 shadow-lg overflow-hidden"
      >
        <span className="relative z-10 flex items-center gap-2">
          Unlock Now <span className="group-hover:translate-x-1 transition-transform">→</span>
        </span>
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
      </button>
      
      <p className="mt-4 text-xs text-teal-light/50">
        One-time payment • Lifetime access
      </p>
    </div>
  );
};

export default LockedFeatureOverlay;
