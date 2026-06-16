import zipfile
import io
import re
from datetime import datetime

def clean_text(text):
    text = re.sub(r'[ \t]+', ' ', text)
    lines = [l.strip() for l in text.splitlines()]
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.endswith('-') and i+1 < len(lines):
            line = line[:-1] + lines[i+1]
            i += 2
        else:
            result.append(line)
            i += 1
    return chr(10).join(result)

def is_heading(text):
    words = text.split()
    if not words: return False
    if len(words) > 12 or len(text) > 100: return False
    if text.rstrip().endswith(('.', ',', ';', ':')): return False
    if text.isupper() and len(words) >= 1: return True
    caps = sum(1 for w in words if w and w[0].isupper())
    if caps/len(words) >= 0.65 and len(words) <= 8: return True
    return False

def text_to_epub(raw_text, title, author='Convertido de PDF'):
    raw_text = clean_text(raw_text)
    paras = [p.strip() for p in re.split(r'\n{2,}', raw_text) if p.strip()] 
    chapters = []
    ch_title = title
    ch_paras = []
    for p in paras:
        if is_heading(p) and ch_paras:
            chapters.append((ch_title, ch_paras))
            ch_title = p
            ch_paras = []
        else:
            ch_paras.append(p)
    if ch_paras:
        chapters.append((ch_title, ch_paras))
    if not chapters:
        chapters = [(title, paras)]

    uid = 'pdf2epub-' + datetime.now().strftime('%Y%m%d%H%M%S')
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip')
        zf.writestr('META-INF/container.xml', '<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
        css = 'body{font-family:Georgia,serif;font-size:1em;line-height:1.65;margin:1em 2em;color:#111}h1{font-size:1.3em;margin:2em 0 .6em;color:#000;border-bottom:1px solid #ccc;padding-bottom:.3em}p{margin:.5em 0;text-align:justify}'
        zf.writestr('OEBPS/style.css', css)
        manifest_items = []
        spine_items    = []
        toc_entries    = []
        nav_points     = []
        for i, (ch_t, ch_ps) in enumerate(chapters):
            cid   = 'chap' + str(i+1).zfill(3)
            safe_title = ch_t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
            body  = chr(10).join('<p>' + p.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;') + '</p>' for p in ch_ps)
            xhtml = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>' + safe_title + '</title><link rel="stylesheet" href="style.css" type="text/css"/></head><body><h1>' + safe_title + '</h1>' + chr(10) + body + '</body></html>'
            zf.writestr('OEBPS/' + cid + '.xhtml', xhtml)
            manifest_items.append('<item id="' + cid + '" href="' + cid + '.xhtml" media-type="application/xhtml+xml"/>')
            spine_items.append('<itemref idref="' + cid + '"/>')
            toc_entries.append('<li><a href="' + cid + '.xhtml">' + safe_title + '</a></li>')
            nav_points.append('<navPoint id="n' + str(i+1) + '" playOrder="' + str(i+1) + '"><navLabel><text>' + safe_title + '</text></navLabel><content src="' + cid + '.xhtml"/></navPoint>')
        safe_t = title.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
        nav = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>' + safe_t + '</title></head><body><nav epub:type="toc"><h1>Índice</h1><ol>' + ''.join(toc_entries) + '</ol></nav></body></html>'
        zf.writestr('OEBPS/nav.xhtml', nav)
        manifest_items.append('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>')
        ncx = '<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="' + uid + '"/></head><docTitle><text>' + safe_t + '</text></docTitle><navMap>' + ''.join(nav_points) + '</navMap></ncx>'
        zf.writestr('OEBPS/toc.ncx', ncx)
        manifest_items.append('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>')
        manifest_items.append('<item id="css" href="style.css" media-type="text/css"/>')
        modified = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        manifest_str = chr(10).join(manifest_items)
        spine_str    = chr(10).join(spine_items)
        opf = '<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">' + uid + '</dc:identifier><dc:title>' + safe_t + '</dc:title><dc:creator>' + author + '</dc:creator><dc:language>pt</dc:language><meta property="dcterms:modified">' + modified + '</meta></metadata><manifest>' + chr(10) + manifest_str + chr(10) + '</manifest><spine toc="ncx">' + chr(10) + spine_str + chr(10) + '</spine></package>'
        zf.writestr('OEBPS/content.opf', opf)
    return buf.getvalue()