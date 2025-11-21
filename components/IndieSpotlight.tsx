import React from 'react';
import { INDIE_FOUNDRIES } from '../data/indieFoundries';

interface IndieSpotlightProps {
    activeMoods: string[];
}

export const IndieSpotlight: React.FC<IndieSpotlightProps> = ({ activeMoods }) => {
    // Find the first foundry that matches any of the active moods
    const match = INDIE_FOUNDRIES.find(f =>
        f.moodTriggers.some(trigger =>
            activeMoods.map(m => m.toLowerCase()).includes(trigger)
        )
    );

    if (!match) return null;

    return (
        <div className="mt-8 p-6 rounded-xl bg-[#1A3431] border-2 border-[#FF8E24]/30 relative overflow-hidden shadow-lg">
            {/* Editor's Choice Badge */}
            <div className="absolute top-0 right-0 bg-[#FF8E24] text-[#1A3431] text-xs font-bold px-3 py-1 rounded-bl-lg">
                EDITOR'S CHOICE
            </div>

            {/* Content */}
            <h3 className="text-[#F5F2EB] text-lg font-bold mb-2 pr-24">
                Looking for that "{activeMoods[0]}" vibe?
            </h3>
            <p className="text-[#F5F2EB]/80 text-sm mb-4 leading-relaxed">
                For this specific aesthetic, we recommend checking out the independent catalog of{' '}
                <strong className="text-[#FF8E24]">{match.name}</strong>.{' '}
                {match.description}
            </p>

            {/* Best For Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
                {match.bestFor.map(tag => (
                    <span
                        key={tag}
                        className="text-xs bg-[#2D4E4A] text-[#F5F2EB] px-2 py-1 rounded border border-white/5"
                    >
                        {tag}
                    </span>
                ))}
            </div>

            {/* CTA Button */}
            <a
                href={match.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center bg-[#FF8E24] text-[#1A3431] font-bold py-3 rounded hover:bg-white transition-colors"
            >
                Explore {match.name} Collection &rarr;
            </a>
        </div>
    );
};

export default IndieSpotlight;
