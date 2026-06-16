export class PyService {
  constructor() {
    this.pyodide = null;
    this.isReady = false;
  }

  async initialize(onProgress) {
    onProgress('Carregando Pyodide…', '0%');
    
    // Injeta dinamicamente o script do Pyodide se não estiver presente
    if (!window.loadPyodide) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }

    onProgress('Iniciando runtime Python…', '15%');
    this.pyodide = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
      stdout: m => console.log('[py]', m),
      stderr: m => console.warn('[py]', m),
    });

    onProgress('Instalando pdfminer.six…', '40%');
    await this.pyodide.loadPackage('micropip');
    const micropip = this.pyodide.pyimport('micropip');
    await micropip.install('pdfminer.six');

    onProgress('Preparando conversor…', '80%');
    
    // Busca o arquivo .py puro usando fetch
    const response = await fetch('./python/converter.py');
    const pythonCode = await response.text();
    await this.pyodide.runPythonAsync(pythonCode);

    onProgress('Pronto!', '100%');
    this.isReady = true;
  }

  async extractText(pdfBytes) {
    this.pyodide.globals.set('pdf_bytes', pdfBytes);
    const extractedText = await this.pyodide.runPythonAsync(`
import io
from pdfminer.high_level import extract_text as _extract
pdf_io = io.BytesIO(bytes(pdf_bytes))
try:
    result = _extract(pdf_io)
except Exception as e:
    result = ''
result
    `);
    return extractedText || '';
  }

  async convertTextToEpub(finalText, title) {
    this.pyodide.globals.set('raw_text', finalText);
    this.pyodide.globals.set('epub_title', title);
    const epubBytes = await this.pyodide.runPythonAsync(`
result = text_to_epub(raw_text, epub_title)
import js
js.Uint8Array.new(list(result))
    `);
    return epubBytes;
  }
}