import React from 'react';

/**
 * PaperTexture component - Creates an SVG filter for realistic paper texture effect
 * Used to give the header a letterpress/embossed appearance
 */
export const PaperTexture: React.FC = () => {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        {/* Paper texture filter */}
        <filter id="paper-texture" x="0%" y="0%" width="100%" height="100%">
          {/* Create noise pattern for paper grain */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            seed="2"
            result="noise"
          />

          {/* Diffuse lighting for 3D paper effect */}
          <feDiffuseLighting
            in="noise"
            lightingColor="#FFFFFF"
            surfaceScale="1.5"
            result="light"
          >
            <feDistantLight azimuth="45" elevation="60" />
          </feDiffuseLighting>

          {/* Blend the lighting with the noise */}
          <feComposite
            in="SourceGraphic"
            in2="light"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="0.15"
            k4="0"
            result="composite"
          />

          {/* Subtle color shift for paper warmth */}
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0
                    0 0.98 0 0 0
                    0 0 0.92 0 0
                    0 0 0 1 0"
            result="paper"
          />
        </filter>

        {/* Embossed/debossed effect for text and icons */}
        <filter id="embossed-element">
          {/* Create depth with offset shadows */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
          <feOffset in="blur" dx="1" dy="1" result="offsetBlur" />

          {/* Light highlight */}
          <feFlood floodColor="#FFFFFF" floodOpacity="0.6" result="light" />
          <feComposite in="light" in2="offsetBlur" operator="in" result="lightShadow" />

          {/* Dark shadow for depth */}
          <feOffset in="blur" dx="-1" dy="-1" result="offsetDark" />
          <feFlood floodColor="#000000" floodOpacity="0.25" result="dark" />
          <feComposite in="dark" in2="offsetDark" operator="in" result="darkShadow" />

          {/* Combine shadows */}
          <feMerge>
            <feMergeNode in="darkShadow" />
            <feMergeNode in="lightShadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
};

export default PaperTexture;
