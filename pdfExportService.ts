import type { FontAnalysis } from './types';
import { jsPDF } from 'jspdf';

// Print-friendly color scheme with paper background
const COLORS = {
  background: '#F2EFE8',   // Light paper color (no pure white)
  primary: '#1A3431',      // Dark green for main text
  secondary: '#2D4E4A',    // Medium dark green for supporting text
  accent: '#FF8E24'        // Orange for highlights
};

export async function exportAnalysisToPDF(analysis: FontAnalysis, previewImageBase64?: string): Promise<void> {
  // Use jsPDF from npm package
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkAndAddPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to wrap text
  const splitText = (text: string, maxWidth: number, fontSize: number) => {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxWidth);
  };

  // Header with accent bar
  doc.setFillColor(COLORS.accent);
  doc.rect(0, 0, pageWidth, 15, 'F');

  // Light paper text on orange background
  doc.setTextColor('#F2EFE8');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FontPair AI', margin, 10);

  yPosition = 25;

  // Font Name and Type
  doc.setTextColor(COLORS.primary);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  const fontNameLines = splitText(analysis.fontName, contentWidth, 24);
  doc.text(fontNameLines, margin, yPosition);
  yPosition += fontNameLines.length * 10;

  doc.setTextColor(COLORS.accent);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(analysis.fontType, margin, yPosition);
  yPosition += 8;

  if (analysis.designer && analysis.designer.toLowerCase() !== 'unknown designer') {
    doc.setTextColor(COLORS.secondary);
    doc.setFontSize(11);
    doc.text(`by ${analysis.designer}`, margin, yPosition);
    yPosition += 8;
  }

  if (analysis.isVariable) {
    doc.setTextColor(COLORS.accent);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('[VARIABLE FONT]', margin, yPosition);
    yPosition += 8;
  }

  yPosition += 5;

  // Preview Image (if provided)
  if (previewImageBase64) {
    checkAndAddPage(90);
    doc.setTextColor(COLORS.accent);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Preview', margin, yPosition);
    yPosition += 7;

    try {
      // Load image to get actual dimensions
      const img = new Image();
      img.src = previewImageBase64;

      // Calculate proper aspect ratio to prevent squashing
      await new Promise((resolve) => {
        img.onload = resolve;
        // Set a timeout in case image doesn't load
        setTimeout(resolve, 1000);
      });

      const actualWidth = img.width || 800;
      const actualHeight = img.height || 200;
      const aspectRatio = actualHeight / actualWidth;

      // Calculate dimensions maintaining aspect ratio
      const maxWidth = contentWidth;
      const maxHeight = 80; // Max height in mm

      let imgWidth = maxWidth;
      let imgHeight = imgWidth * aspectRatio;

      // If calculated height exceeds max, scale down
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight / aspectRatio;
      }

      doc.addImage(previewImageBase64, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (e) {
      console.error('Failed to add preview image', e);
    }
  }

  // Section helper function
  const addSection = (title: string, content: string | string[], isList: boolean = false) => {
    checkAndAddPage(20);

    doc.setTextColor(COLORS.accent);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPosition);
    yPosition += 7;

    doc.setTextColor(COLORS.primary);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (isList && Array.isArray(content)) {
      content.forEach(item => {
        checkAndAddPage(10);
        const bulletX = margin + 2;
        doc.circle(bulletX, yPosition - 1.5, 0.8, 'F');
        const lines = splitText(item, contentWidth - 8, 10);
        doc.text(lines, margin + 6, yPosition);
        yPosition += lines.length * 5 + 2;
      });
    } else {
      const text = Array.isArray(content) ? content.join(', ') : content;
      const lines = splitText(text, contentWidth, 10);
      lines.forEach((line: string) => {
        checkAndAddPage(7);
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
    }

    yPosition += 5;
  };

  // Analysis
  addSection('Analysis', analysis.analysis);

  // Historical Context
  if (analysis.historicalContext) {
    addSection('Historical Context', analysis.historicalContext);
  }

  // Accessibility & Legibility
  if (analysis.accessibility) {
    checkAndAddPage(20);
    doc.setTextColor(COLORS.accent);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Accessibility & Legibility', margin, yPosition);
    yPosition += 7;

    doc.setTextColor(COLORS.primary);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const accessLines = splitText(analysis.accessibility.analysis, contentWidth, 10);
    accessLines.forEach((line: string) => {
      checkAndAddPage(7);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 3;

    if (analysis.accessibility.notes && analysis.accessibility.notes.length > 0) {
      analysis.accessibility.notes.forEach(note => {
        checkAndAddPage(10);
        const bulletX = margin + 2;
        doc.setFillColor(COLORS.accent);
        doc.circle(bulletX, yPosition - 1.5, 0.8, 'F');
        const lines = splitText(note, contentWidth - 8, 10);
        doc.text(lines, margin + 6, yPosition);
        yPosition += lines.length * 5 + 2;
      });
    }
    yPosition += 5;
  }

  // Font Pairing Suggestions
  if (analysis.fontPairings && analysis.fontPairings.length > 0) {
    checkAndAddPage(20);
    doc.setTextColor(COLORS.accent);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Font Pairing Suggestions', margin, yPosition);
    yPosition += 7;

    analysis.fontPairings.forEach((pairing, index) => {
      checkAndAddPage(15);
      doc.setTextColor(COLORS.primary);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${pairing.primary} + ${pairing.secondary}`, margin, yPosition);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      const rationaleLines = splitText(pairing.rationale, contentWidth, 10);
      rationaleLines.forEach((line: string) => {
        checkAndAddPage(7);
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 3;
    });
    yPosition += 5;
  }

  // Similar Font Alternatives
  if (analysis.similarFonts && analysis.similarFonts.length > 0) {
    checkAndAddPage(20);
    doc.setTextColor(COLORS.accent);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Similar Font Alternatives', margin, yPosition);
    yPosition += 7;

    analysis.similarFonts.forEach((font, index) => {
      checkAndAddPage(12);
      doc.setTextColor(COLORS.primary);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${font.name}`, margin, yPosition);

      doc.setTextColor(COLORS.secondary);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(`(${font.source})`, margin + doc.getTextWidth(`${index + 1}. ${font.name}`) + 2, yPosition);
      yPosition += 5;

      doc.setTextColor(COLORS.primary);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const rationaleLines = splitText(font.rationale, contentWidth, 10);
      rationaleLines.forEach((line: string) => {
        checkAndAddPage(7);
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 3;
    });
    yPosition += 5;
  }

  // Recommended Usage
  if (analysis.usageRecommendations && analysis.usageRecommendations.length > 0) {
    addSection('Recommended Usage', analysis.usageRecommendations, true);
  }

  // Weight Recommendations
  if (analysis.weightRecommendations && analysis.weightRecommendations.length > 0) {
    addSection('Weight Recommendations', analysis.weightRecommendations, true);
  }

  // Business Suitability
  if (analysis.businessSuitability && analysis.businessSuitability.length > 0) {
    checkAndAddPage(15);
    doc.setTextColor(COLORS.accent);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Business Suitability', margin, yPosition);
    yPosition += 7;

    doc.setTextColor(COLORS.primary);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(analysis.businessSuitability.join(', '), margin, yPosition, { maxWidth: contentWidth });
    const businessLines = splitText(analysis.businessSuitability.join(', '), contentWidth, 10);
    yPosition += businessLines.length * 5 + 5;
  }

  // License & Usage Information
  if (analysis.licenseInfo) {
    addSection('License & Usage Information', analysis.licenseInfo);
  }

  // Footer on last page
  doc.setTextColor(COLORS.secondary);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const footerText = 'Generated by FontPair AI - Powered by Google Gemini';
  const footerWidth = doc.getTextWidth(footerText);
  doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);

  // Save the PDF
  const fileName = `${analysis.fontName.replace(/\s+/g, '_')}_Analysis.pdf`;
  doc.save(fileName);
}
