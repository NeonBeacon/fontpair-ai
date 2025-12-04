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

export const generateFontImage = (fontName: string, text: string = 'Abc'): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fill background
  ctx.fillStyle = '#ffffff'; // White background for better AI vision
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text
  ctx.font = `60px "${fontName}", sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL('image/png');
};

export const stripBase64Prefix = (base64String: string): string => {
  if (base64String.includes(',')) {
    return base64String.split(',')[1];
  }
  return base64String;
};
