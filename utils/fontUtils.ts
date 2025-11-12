export const getAxisDescription = (tag: string): string => {
    switch (tag.toLowerCase()) {
        case 'wght':
            return "Controls the stroke thickness of the characters, ranging from thin and delicate to heavy and bold. Essential for establishing visual hierarchy.";
        case 'wdth':
            return "Adjusts the horizontal space characters occupy. Lower values create a condensed, narrow look, while higher values produce an expanded, wide style.";
        case 'slnt':
            return "Tilts the characters to an oblique angle, creating a slanted or italic effect. Unlike a true italic, this is typically a uniform shear transformation.";
        case 'ital':
            return "A binary switch (0 for Roman, 1 for Italic) that toggles between the upright and the true italic letterforms, which often have different constructions.";
        case 'opsz':
            return "Optimizes the font's details for its intended display size. At smaller sizes, strokes might be thicker and contrast lower for better legibility. At larger sizes, the font can have finer details and more contrast.";
        default:
            return `This is a custom font axis defined by the font creator with the technical tag '${tag}'.`;
    }
};
