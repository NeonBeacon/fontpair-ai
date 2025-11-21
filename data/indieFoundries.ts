export interface IndieFoundry {
    name: string;
    url: string;
    description: string;
    moodTriggers: string[]; // Keywords that trigger this foundry to appear
    bestFor: string[];      // UI badges
}

export const INDIE_FOUNDRIES: IndieFoundry[] = [
    {
        name: "Brandon Nickerson (BNicks)",
        url: "https://www.bnicks.com/shop",
        description: "The master of 'Wavy' and 'Psychedelic' display type. Essential for retro-modern brands.",
        moodTriggers: ["playful", "retro", "creative", "bold", "display", "psychedelic", "trendy"],
        bestFor: ["Logos", "Posters", "Social Media"]
    },
    {
        name: "Pangram Pangram",
        url: "https://pangrampangram.com",
        description: "High-fashion industrialism. The bridge between 'Swiss Style' and modern hypebeast aesthetics.",
        moodTriggers: ["modern", "tech", "fashion", "editorial", "industrial", "cool", "futuristic"],
        bestFor: ["Headers", "Fashion", "Tech"]
    },
    {
        name: "OH no Type Co",
        url: "https://ohnotype.co",
        description: "Typography with a sense of humor. High-contrast, chunky, and unapologetically fun.",
        moodTriggers: ["playful", "fun", "bold", "quirky", "warm", "friendly"],
        bestFor: ["Packaging", "Stickers", "Branding"]
    },
    {
        name: "Klim Type Foundry",
        url: "https://klim.co.nz",
        description: "The gold standard of contemporary serif design. Authoritative, sharp, and incredibly refined.",
        moodTriggers: ["elegant", "luxury", "classic", "serif", "serious", "high-end", "editorial"],
        bestFor: ["Editorial", "Books", "Luxury"]
    },
    {
        name: "Velvetyne Type Foundry",
        url: "https://velvetyne.fr",
        description: "Open-source experimental typography. Perfect for avant-garde and artistic projects.",
        moodTriggers: ["creative", "experimental", "artistic", "avant-garde", "free", "unique"],
        bestFor: ["Art", "Experimental", "Posters"]
    },
    {
        name: "Atipo Foundry",
        url: "https://www.atipofoundry.com",
        description: "Spanish craftsmanship meets modern minimalism. Clean, versatile, and beautifully balanced.",
        moodTriggers: ["minimal", "clean", "modern", "corporate", "professional"],
        bestFor: ["Corporate", "UI", "Branding"]
    },
    {
        name: "Colophon Foundry",
        url: "https://www.colophon-foundry.org",
        description: "British precision with global appeal. Known for sharp, editorial-ready typefaces.",
        moodTriggers: ["editorial", "elegant", "sophisticated", "publishing", "magazine"],
        bestFor: ["Publishing", "Editorial", "Magazines"]
    },
    {
        name: "Sharp Type",
        url: "https://sharptype.co",
        description: "NYC-based foundry creating bold, distinctive display faces for brand identities.",
        moodTriggers: ["bold", "display", "branding", "startup", "tech", "modern"],
        bestFor: ["Branding", "Startups", "Tech"]
    }
];
