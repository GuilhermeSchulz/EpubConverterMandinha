# PDF → EPUB Converter

Conversor de PDF para EPUB que roda inteiramente no navegador. Nenhum arquivo é enviado para servidores — tudo é processado localmente via WebAssembly.

**[→ Acessar conversor](https://guilhermeschulz.github.io/EpubConverterMandinha/)**

---

## Funcionalidades

- **Pré-visualização** da primeira página do PDF ao selecionar o arquivo
- **Extração de texto** com `pdfminer.six` rodando via Pyodide (Python no browser)
- **OCR automático** com Tesseract.js quando o PDF é escaneado ou não contém texto selecionável — suporta português e inglês
- **Barra de progresso** detalhada com log em tempo real de cada etapa
- **EPUB3** gerado com índice (TOC), capítulos detectados automaticamente e CSS embutido
- **100% offline** após o primeiro carregamento — funciona sem internet

## Como usar

1. Acesse a página
2. Aguarde o ambiente Python carregar (~10–15s na primeira vez)
3. Arraste um PDF ou clique para selecionar
4. Clique em **Converter para EPUB**
5. Clique em **Baixar EPUB** quando concluído

## Tecnologias

| Biblioteca | Função |
|---|---|
| [Pyodide](https://pyodide.org) | Runtime Python (WebAssembly) no navegador |
| [pdfminer.six](https://pdfminersix.readthedocs.io) | Extração de texto de PDFs digitais |
| [PDF.js](https://mozilla.github.io/pdf.js/) | Renderização de páginas para preview e OCR |
| [Tesseract.js](https://tesseract.projectnaptha.com) | OCR para PDFs escaneados |

## Limitações

- PDFs protegidos por senha não são suportados
- A qualidade do OCR depende da resolução e nitidez do scan
- O carregamento inicial pode levar 10–20s dependendo da conexão (Pyodide pesa ~10MB)
- PDFs muito grandes (100+ páginas) podem ser lentos no OCR


## Estrutura do repositório

```
.
├── index.html   # Aplicação completa (HTML + CSS + JS + Python embutidos)
└── README.md
```

## Licença

MIT
