/**
 * LUMA AI — PDF Document Generator
 * Generates true binary PDF documents using jsPDF.
 * Converts markdown/plain text content into a cleanly formatted, multi-page PDF document
 * with LUMA branding, pagination, styled headers, and proper MIME types.
 */

import { jsPDF } from 'jspdf';

export interface GeneratePdfOptions {
  title?: string;
  author?: string;
}

export function generatePdfBlob(title: string, content: string, options: GeneratePdfOptions = {}): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2;
  const bottomMargin = 25;
  let yCursor = 25;

  const resolvedTitle = options.title || title || 'LUMA Document';
  const author = options.author || 'LUMA AI 1.0 · Annabil Aska';
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Set document metadata
  doc.setProperties({
    title: resolvedTitle,
    author: author,
    creator: 'LUMA AI 1.0'
  });

  // Header banner bar on Page 1
  doc.setFillColor(218, 75, 42); // #DA4B2A (LUMA Brand Orange)
  doc.rect(marginX, yCursor, 4, 14, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(32, 32, 32);
  doc.text(resolvedTitle, marginX + 8, yCursor + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(119, 115, 111);
  doc.text(`${author}  ·  ${dateStr}`, marginX + 8, yCursor + 12);

  yCursor += 22;

  // Thin separator rule
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(marginX, yCursor, marginX + contentWidth, yCursor);
  yCursor += 10;

  // Split content into lines and render paragraphs
  const rawLines = content.split('\n');

  const checkPageBreak = (neededHeight: number) => {
    if (yCursor + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      yCursor = 25;

      // Small top rule on subsequent pages
      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.2);
      doc.line(marginX, 15, marginX + contentWidth, 15);
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trimEnd();
    const trimmed = rawLine.trim();

    if (!trimmed) {
      yCursor += 4;
      continue;
    }

    // Major heading (# Title)
    if (trimmed.startsWith('# ')) {
      const headingText = trimmed.replace(/^#\s+/, '');
      checkPageBreak(14);
      yCursor += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(218, 75, 42); // Accent
      doc.text(headingText, marginX, yCursor);
      yCursor += 8;
      continue;
    }

    // Sub-heading (## Title)
    if (trimmed.startsWith('## ')) {
      const headingText = trimmed.replace(/^##\s+/, '');
      checkPageBreak(12);
      yCursor += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(headingText, marginX, yCursor);
      yCursor += 6.5;
      continue;
    }

    // Sub-sub-heading (### Title)
    if (trimmed.startsWith('### ')) {
      const headingText = trimmed.replace(/^###\s+/, '');
      checkPageBreak(10);
      yCursor += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(70, 70, 70);
      doc.text(headingText, marginX, yCursor);
      yCursor += 5.5;
      continue;
    }

    // Bullet points (- or * )
    if (/^[-*]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 50);

      const wrapped = doc.splitTextToSize(bulletText, contentWidth - 8);
      checkPageBreak(wrapped.length * 4.5 + 2);

      // Bullet dot
      doc.setFillColor(218, 75, 42);
      doc.circle(marginX + 2, yCursor - 1.2, 0.8, 'F');

      doc.text(wrapped, marginX + 6, yCursor);
      yCursor += wrapped.length * 4.5 + 1.5;
      continue;
    }

    // Numbered list (1. item)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const numPrefix = numMatch[1] + '.';
      const itemText = numMatch[2].replace(/\*\*(.*?)\*\*/g, '$1');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 50);

      const wrapped = doc.splitTextToSize(itemText, contentWidth - 8);
      checkPageBreak(wrapped.length * 4.5 + 2);

      doc.setFont('helvetica', 'bold');
      doc.text(numPrefix, marginX, yCursor);
      doc.setFont('helvetica', 'normal');
      doc.text(wrapped, marginX + 6, yCursor);
      yCursor += wrapped.length * 4.5 + 1.5;
      continue;
    }

    // Code block lines or plain text
    const cleanText = trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);

    const wrapped = doc.splitTextToSize(cleanText, contentWidth);
    checkPageBreak(wrapped.length * 4.5 + 2);

    doc.text(wrapped, marginX, yCursor);
    yCursor += wrapped.length * 4.5 + 1;
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);

    // Left footer: LUMA AI signature
    doc.text('Generated with LUMA AI 1.0', marginX, pageHeight - 12);

    // Right footer: Page X of Y
    const pageStr = `Page ${pageNum} of ${totalPages}`;
    doc.text(pageStr, pageWidth - marginX - doc.getTextWidth(pageStr), pageHeight - 12);
  }

  return doc.output('blob');
}

export function downloadPdf(title: string, content: string): void {
  const blob = generatePdfBlob(title, content);
  const cleanTitle = (title || 'document').toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
  const filename = `${cleanTitle}.pdf`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
