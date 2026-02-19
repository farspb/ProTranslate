import { FileData } from "../types";
import * as pdfjsLib from 'pdfjs-dist';

// Initialize the PDF worker via CDN
// Ensure the worker version matches the library version in index.html
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

const readPdfAsText = async (file: File, onProgress?: (percent: number) => void): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const totalPages = pdf.numPages;
    
    // Iterate over all pages to ensure no content is missing
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Improve text extraction to preserve some basic layout/spacing
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' '); // Using space to join items
      
      fullText += pageText + '\n\n';
      
      // Report progress
      if (onProgress) {
        onProgress(Math.round((i / totalPages) * 100));
      }
    }
    
    return fullText;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF file. It might be password protected or corrupted.");
  }
};

export const readFileAsText = async (file: File, onProgress?: (percent: number) => void): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    return readPdfAsText(file, onProgress);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    reader.onload = (event) => {
      if (event.target?.result) {
        if (onProgress) onProgress(100);
        resolve(event.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

export const parseFileName = (fileName: string): { name: string; extension: string } => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return { name: fileName, extension: '.txt' };
  return {
    name: fileName.substring(0, lastDotIndex),
    extension: fileName.substring(lastDotIndex),
  };
};

export const downloadFile = (content: string, filename: string, extension: string) => {
  const safeExtension = (extension.startsWith('.') ? extension : `.${extension}`).toLowerCase();
  
  // ---------------------------------------------------------
  // STRATEGY 1: PDF EXPORT (High Fidelity - Print Method)
  // ---------------------------------------------------------
  // Standard JS libraries fail to render Persian fonts correctly without huge font files.
  // The best way to ensure perfect fonts and layout is to use the Browser's Native Print engine.
  if (safeExtension === '.pdf') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to save as PDF.");
      return;
    }

    // Determine direction based on content (simple check for Persian chars)
    const isRtl = /[\u0600-\u06FF]/.test(content);
    const dir = isRtl ? 'rtl' : 'ltr';
    const align = isRtl ? 'right' : 'left';
    const font = isRtl ? "'Vazirmatn', sans-serif" : "'Inter', sans-serif";

    // Format content: Convert newlines to breaks for HTML display
    const formattedContent = content.split('\n').map(line => 
      line.trim() ? `<p>${line}</p>` : '<br>'
    ).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en" dir="${dir}">
      <head>
        <meta charset="UTF-8">
        <title>${filename}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: ${font};
            padding: 40px;
            line-height: 1.8;
            color: #1a1a1a;
            max-width: 800px;
            margin: 0 auto;
            text-align: ${align};
          }
          p { margin-bottom: 10px; text-align: justify; }
          @media print {
            body { padding: 0; margin: 2cm; }
            @page { margin: 2cm; }
          }
        </style>
      </head>
      <body>
        ${formattedContent}
        <script>
          // Automatically trigger print dialog when loaded
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // Optional: window.close(); // Don't close immediately so user can see it
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return;
  }

  // ---------------------------------------------------------
  // STRATEGY 2: WORD EXPORT (DOCX)
  // ---------------------------------------------------------
  if (safeExtension === '.docx' || safeExtension === '.doc') {
    const isRtl = /[\u0600-\u06FF]/.test(content);
    const dir = isRtl ? 'rtl' : 'ltr';
    const textAlign = isRtl ? 'right' : 'left';
    
    // We construct a specific HTML that Word recognizes, including Direction and Font settings
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { 
            font-family: 'Arial', sans-serif; 
          }
          /* Specific style for Persian text in Word */
          p.MsoNormal {
            mso-style-parent: "";
            margin-bottom: .0001pt;
            font-family: "Arial", "sans-serif";
            ${isRtl ? 'font-family: "Vazirmatn", "Arial", sans-serif; mso-bidi-font-family: "Arial";' : ''}
          }
        </style>
      </head>
      <body lang=EN-US style='tab-interval:.5in'>
    `;
    
    // Convert newlines to paragraphs with specific alignment and direction
    const paragraphs = content.split('\n').map(line => {
      if (!line.trim()) return '<p>&nbsp;</p>';
      return `<p align="${textAlign}" dir="${dir}" style="text-align:${textAlign}; direction:${dir}; unicode-bidi:embed">${line}</p>`;
    }).join('');

    const footer = "</body></html>";
    const sourceHTML = header + paragraphs + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}${safeExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }
  
  // ---------------------------------------------------------
  // STRATEGY 3: TEXT/OTHER EXPORT
  // ---------------------------------------------------------
  let mimeType = 'text/plain';
  if (safeExtension === '.json') mimeType = 'application/json';
  else if (safeExtension === '.html') mimeType = 'text/html';
  else if (safeExtension === '.csv') mimeType = 'text/csv';
  else if (safeExtension === '.xml') mimeType = 'text/xml';
  else if (safeExtension === '.md') mimeType = 'text/markdown';

  const blob = new Blob(['\uFEFF', content], { type: `${mimeType};charset=utf-8` });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  link.download = `${filename}${safeExtension}`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};