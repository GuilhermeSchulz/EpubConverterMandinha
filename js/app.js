import { PyService } from './services/pyService.js';
import { OcrService } from './services/ocrService.js';

// Instanciação dos Serviços
const pyService = new PyService();
const ocrService = new OcrService();

// Estado Global
let queue = [];
let running = false;
let idSeq = 0;

// Seletores do DOM (DropZone, toolbar, etc - os mesmos que você já possui)
const dropZone = document.getElementById('drop-zone');
// ... [Mantenha suas declarações do DOM e funções utilitárias como fmt() aqui]

// Inicialização coordenada
async function init() {
  const initBar = document.getElementById('init-bar');
  const initText = document.getElementById('init-text');
  const initPct = document.getElementById('init-pct');

  try {
    await pyService.initialize((text, pct) => {
      initText.textContent = text;
      initPct.textContent = pct;
    });
    setTimeout(() => initBar.classList.add('hidden'), 1200);
    updateToolbar();
  } catch (e) {
    initText.textContent = 'Erro ao carregar Python: ' + e.message;
    initPct.textContent = '✕';
  }
}

// Atualização da UI da Fila
function updateToolbar() {
  const n = queue.length;
  if (n === 0) { toolbar.classList.remove('visible'); return; }
  toolbar.classList.add('visible');
  const done = queue.filter(q => q.status === 'done').length;
  const err = queue.filter(q => q.status === 'error').length;
  const wait = queue.filter(q => q.status === 'waiting').length;
  
  document.getElementById('queue-summary').innerHTML = `<span>${n}</span> arquivo${n>1?'s':''} · <span>${done}</span> concluído${done>1?'s':''}`
    + (err ? ` · <span style="color:var(--error)">${err} erro${err>1?'s':''}</span>` : '')
    + (wait ? ` · ${wait} aguardando` : '');
    
  document.getElementById('btn-convert-all').disabled = !pyService.isReady || running || wait === 0;
  document.getElementById('btn-dl-all').style.display = done > 0 ? 'inline-flex' : 'none';
}

// ... [Funções de criação de elementos HTML da fila (createItemEl, renderThumb) permanecem aqui]

async function convertItem(item) {
  iSetStatus(item, 'running');
  iSetPct(item, 0, 'Iniciando…');
  const title = item.file.name.replace(/\.pdf$/i,'').replace(/[-_]/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  let usedOCR = false;

  try {
    iSetPct(item, 5, 'Lendo arquivo…');
    const arrayBuf = await item.file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuf);

    iSetPct(item, 15, 'Extraindo texto…');
    iLog(item, 'Extraindo texto via pdfminer.six…');
    
    // Consome o serviço do Pyodide
    let finalText = await pyService.extractText(pdfBytes);
    const wordCount = finalText.trim().split(/\s+/).filter(Boolean).length;
    iLog(item, 'Texto extraído: ' + wordCount + ' palavras');

    if (wordCount < 50) {
      usedOCR = true;
      iLog(item, 'Texto insuficiente — ativando OCR…', 'lwarn');
      
      const pdf = item.pdfDoc || await window._pdfjs.getDocument({ data: pdfBytes }).promise;
      const numPages = pdf.numPages;

      // Consome o serviço do Tesseract encapsulado
      finalText = await ocrService.runOcr(pdf, numPages, (pagesDone, pageProgress) => {
        iSetPct(item, 20 + (pagesDone / numPages) * 55 + pageProgress * (55 / numPages), `OCR ${pagesDone + 1}/${numPages}…`);
      });
      
      iLog(item, 'OCR concluído com sucesso', 'lok');
    }

    if (!finalText.trim()) throw new Error('Não foi possível extrair texto do PDF.');

    iSetPct(item, 82, 'Construindo EPUB…');
    
    // Consome a compilação do EPUB vinda do serviço Pyodide
    const epubBytes = await pyService.convertTextToEpub(finalText, title);

    iSetPct(item, 100, 'Concluído!');
    const blob = new Blob([epubBytes], { type: 'application/epub+zip' });
    const url = URL.createObjectURL(blob);
    const dlName = title.replace(/[^a-zA-Z0-9_\- ]/g,'') + '.epub';
    iSetDone(item, url, dlName, usedOCR);

  } catch (err) {
    iSetError(item, err.message);
  }
}

// ... [Mantenha os event listeners do botão Converter Tudo, Clear, Drag and Drop]

// Inicia o app
init();