export class OcrService {
  async runOcr(pdfDoc, numPages, onPageProgress) {
    const ocrParts = [];
    
    const worker = await Tesseract.createWorker('por+eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          onPageProgress(ocrParts.length, m.progress);
        }
      }
    });

    const ocrCanvas = document.createElement('canvas');
    const ocrCtx = ocrCanvas.getContext('2d');

    for (let p = 1; p <= numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const vp = page.getViewport({ scale: 2.0 });
      ocrCanvas.width = vp.width; 
      ocrCanvas.height = vp.height;
      
      await page.render({ canvasContext: ocrCtx, viewport: vp }).promise;
      const { data: { text } } = await worker.recognize(ocrCanvas);
      
      if (text.trim()) ocrParts.push(text.trim());
    }

    await worker.terminate();
    return ocrParts.join('\n\n');
  }
}