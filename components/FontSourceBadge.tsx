import React from 'react';
import type { FontSource } from '../types';

interface FontSourceBadgeProps {
  fontSource: FontSource | undefined;
  fontFoundry?: string;
  size?: 'sm' | 'md' | 'lg';
}

const FontSourceBadge: React.FC<FontSourceBadgeProps> = ({
  fontSource,
  fontFoundry,
  size = 'md'
}) => {
  const getSourceConfig = () => {
    switch (fontSource) {
      case 'google-fonts':
        return {
          label: 'Google Fonts',
          bgColor: 'bg-blue-500/20',
          textColor: 'text-blue-300',
          borderColor: 'border-blue-500/40',
          icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.01 12.01c0-3.31 2.69-6 6-6V3.01c-5.52 0-10 4.48-10 10s4.48 10 10 10v-3c-3.31 0-6-2.69-6-6z"/>
              <path d="M21.01 3v3c0 3.31-2.69 6-6 6h-3v2h3c2.76 0 5-2.24 5-5V3h-3z"/>
              <circle cx="12.01" cy="12.01" r="2"/>
            </svg>
          )
        };
      case 'adobe-fonts':
        return {
          label: 'Adobe Fonts',
          bgColor: 'bg-red-500/20',
          textColor: 'text-red-300',
          borderColor: 'border-red-500/40',
          icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425zM8.884 1.376H0v21.248zm15.116 0h-8.884L24 22.624Z"/>
            </svg>
          )
        };
      case 'myfonts':
        return {
          label: 'MyFonts',
          bgColor: 'bg-orange-500/20',
          textColor: 'text-orange-300',
          borderColor: 'border-orange-500/40',
          icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          )
        };
      case 'fontshare':
        return {
          label: 'Fontshare',
          bgColor: 'bg-indigo-500/20',
          textColor: 'text-indigo-300',
          borderColor: 'border-indigo-500/40',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          )
        };
      case 'font-squirrel':
        return {
          label: 'Font Squirrel',
          bgColor: 'bg-amber-500/20',
          textColor: 'text-amber-300',
          borderColor: 'border-amber-500/40',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm3-11h-2V7h-2v2H9v2h2v2h2v-2h2z"/>
            </svg>
          )
        };
      case 'dafont':
        return {
          label: 'DaFont',
          bgColor: 'bg-yellow-500/20',
          textColor: 'text-yellow-300',
          borderColor: 'border-yellow-500/40',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
            </svg>
          )
        };
      case 'fontesk':
        return {
          label: 'Fontesk',
          bgColor: 'bg-cyan-500/20',
          textColor: 'text-cyan-300',
          borderColor: 'border-cyan-500/40',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
          )
        };
      case 'velvetyne':
        return {
          label: 'Velvetyne',
          bgColor: 'bg-pink-500/20',
          textColor: 'text-pink-300',
          borderColor: 'border-pink-500/40',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          )
        };
      case 'league-of-moveable-type':
        return {
          label: 'League of Moveable Type',
          bgColor: 'bg-emerald-500/20',
          textColor: 'text-emerald-300',
          borderColor: 'border-emerald-500/40',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
            </svg>
          )
        };
      case 'the-northern-block':
        return {
          label: 'The Northern Block',
          bgColor: 'bg-slate-500/20',
          textColor: 'text-slate-300',
          borderColor: 'border-slate-500/40',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          )
        };
      case 'atipo':
        return {
          label: 'Atipo',
          bgColor: 'bg-violet-500/20',
          textColor: 'text-violet-300',
          borderColor: 'border-violet-500/40',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>
            </svg>
          )
        };
      case 'uploaded-file':
        return {
          label: 'Uploaded Font',
          bgColor: 'bg-green-500/20',
          textColor: 'text-green-300',
          borderColor: 'border-green-500/40',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          )
        };
      case 'image':
        return {
          label: 'Image Analysis',
          bgColor: 'bg-purple-500/20',
          textColor: 'text-purple-300',
          borderColor: 'border-purple-500/40',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          )
        };
      default:
        return {
          label: 'Other Source',
          bgColor: 'bg-gray-500/20',
          textColor: 'text-gray-300',
          borderColor: 'border-gray-500/40',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          )
        };
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const config = getSourceConfig();

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span
        className={`inline-flex items-center gap-1.5 ${config.bgColor} ${config.textColor} ${sizeClasses[size]} rounded-full border ${config.borderColor} font-semibold`}
      >
        {config.icon}
        {config.label}
      </span>
      {fontFoundry && fontFoundry.toLowerCase() !== 'unknown foundry' && (
        <span
          className="inline-flex items-center gap-1.5 bg-teal-500/20 text-teal-300 text-sm px-3 py-1.5 rounded-full border border-teal-500/40 font-semibold"
          title="Font Foundry"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          {fontFoundry}
        </span>
      )}
    </div>
  );
};

export default FontSourceBadge;
