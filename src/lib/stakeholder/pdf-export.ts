/**
 * PDF Export Utility
 * Client-side PDF generation and download
 */

/**
 * Export stakeholder query response to PDF
 */
export async function exportToPDF(
  queryText: string,
  userRole: string,
  components: any[],
  projectId: string
): Promise<void> {
  try {
    // Call API to get formatted HTML
    const response = await fetch('/api/stakeholder/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queryText,
        userRole,
        components,
        projectId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF data');
    }

    const { html } = await response.json();

    // Create a blob from the HTML
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `stakeholder-report-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

    // Note: For true PDF generation, you would need to:
    // 1. Install jspdf and html2canvas: npm install jspdf html2canvas
    // 2. Use them to convert the HTML to PDF
    // This implementation exports as HTML for simplicity

  } catch (error) {
    console.error('[PDF Export] Error:', error);
    throw error;
  }
}

/**
 * Export with full PDF generation using jsPDF and html2canvas
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportToPDFWithCanvas(
  queryText: string,
  userRole: string,
  components: any[],
  projectId: string
): Promise<void> {
  try {
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '800px';
    container.style.backgroundColor = '#ffffff';
    container.style.padding = '40px';
    document.body.appendChild(container);

    // Call API to get HTML
    const response = await fetch('/api/stakeholder/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queryText,
        userRole,
        components,
        projectId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF data');
    }

    const { html } = await response.json();
    container.innerHTML = html;

    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate canvas from HTML
    const canvas = await html2canvas(container, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    // Remove temporary container
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`stakeholder-report-${Date.now()}.pdf`);
  } catch (error) {
    console.error('[PDF Export with Canvas] Error:', error);
    throw error;
  }
}

/**
 * Email export functionality
 */
export async function emailReport(
  queryText: string,
  userRole: string,
  components: any[],
  projectId: string,
  recipientEmail: string
): Promise<void> {
  try {
    const response = await fetch('/api/stakeholder/email-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queryText,
        userRole,
        components,
        projectId,
        recipientEmail
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[Email Report] Error:', error);
    throw error;
  }
}
