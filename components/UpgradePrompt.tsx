import React from 'react';
import { CadmusLogoIcon } from './Icons';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ isOpen, onClose, feature }) => {
  if (!isOpen) return null;

  const features = [
    { name: "Unlimited Analysis", free: false, pro: true },
    { name: "Pairing Critique (AI Scored)", free: false, pro: true },
    { name: "Batch Font Analysis", free: false, pro: true },
    { name: "Accessibility Reports", free: false, pro: true },
    { name: "No Watermark PDF Export", free: false, pro: true },
    { name: "Project Organization", free: false, pro: true },
    { name: "Type Scale Builder", free: false, pro: true },
    { name: "CSS / Tailwind Export", free: false, pro: true },
    { name: "Shareable Links", free: false, pro: true },
    { name: "Priority Support", free: false, pro: true },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-4xl bg-[#1A3431] border-2 border-[#FF8E24] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-teal-light hover:text-white transition-colors p-2 bg-black/20 rounded-full"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Left Column: Value Prop */}
        <div className="w-full md:w-1/3 bg-teal-dark p-8 flex flex-col justify-between relative overflow-hidden">
           <div className="absolute inset-0 opacity-10 pointer-events-none">
               <svg width="100%" height="100%">
                   <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                       <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                   </pattern>
                   <rect width="100%" height="100%" fill="url(#grid)" />
               </svg>
           </div>

           <div className="relative z-10">
              <CadmusLogoIcon className="w-16 h-16 text-[#FF8E24] mb-6 icon-embossed" />
              <h2 className="text-3xl font-bold text-[#F2EFE8] mb-2">Unlock Professional Power</h2>
              <p className="text-teal-light mb-6">
                You discovered a Pro feature: <span className="text-[#FF8E24] font-bold">{feature}</span>. 
                Upgrade now to access this and much more.
              </p>
           </div>

           <div className="relative z-10 mt-auto">
              <div className="text-4xl font-bold text-[#F2EFE8] mb-1">£48.99</div>
              <p className="text-sm text-teal-light mb-6">One-time payment. Lifetime access.</p>
                            <a
                              href="https://www.fontpairai.com/pricing.html"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full py-3 bg-[#FF8E24] text-[#1A3431] text-center font-bold rounded-lg hover:bg-white transition-colors shadow-lg"
                            >
                              Buy Professional
                            </a>           </div>
        </div>

        {/* Right Column: Feature Comparison */}
        <div className="w-full md:w-2/3 bg-[#F5F2EB] p-8 overflow-y-auto">
           <h3 className="text-xl font-bold text-[#1A3431] mb-6 text-center">Compare Plans</h3>
           
           <div className="grid grid-cols-3 gap-4 mb-2 border-b border-[#1A3431]/10 pb-2 text-sm font-semibold text-[#1A3431]/60">
               <div className="col-span-1">Feature</div>
               <div className="text-center">Free</div>
               <div className="text-center text-[#FF8E24]">Professional</div>
           </div>

           <div className="space-y-3">
               {features.map((f, i) => (
                   <div key={i} className="grid grid-cols-3 gap-4 items-center py-2 border-b border-[#1A3431]/5 last:border-0">
                       <div className="col-span-1 text-sm font-medium text-[#1A3431]">{f.name}</div>
                       <div className="flex justify-center">
                           {f.free ? (
                               <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                           ) : (
                               <span className="text-[#1A3431]/30 text-lg leading-none">−</span>
                           )}
                       </div>
                       <div className="flex justify-center">
                           {f.pro ? (
                               <svg className="w-5 h-5 text-[#FF8E24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                           ) : (
                               <span className="text-[#1A3431]/30 text-lg leading-none">−</span>
                           )}
                       </div>
                   </div>
               ))}
           </div>

           <div className="mt-8 text-center">
               <button 
                  onClick={onClose}
                  className="text-sm text-[#1A3431]/60 hover:text-[#1A3431] underline"
               >
                   No thanks, I'll stick with the Free tier for now
               </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
