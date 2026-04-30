import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfBuffer = await readFile(new URL('../build/source/riviera.pdf', import.meta.url));
const pdfBytes = new Uint8Array(pdfBuffer);
const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise;
const pages = [];

for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items.map((item) => item.str).join(' ');
  const items = content.items.map((item) => ({
    str: item.str,
    x: Number(item.transform[4].toFixed(2)),
    y: Number(item.transform[5].toFixed(2)),
  }));
  pages.push({ pageNumber, text, items });
}

await mkdir(new URL('../build/raw/', import.meta.url), { recursive: true });
await writeFile(new URL('../build/raw/pages.json', import.meta.url), JSON.stringify(pages, null, 2));

console.log(`Extracted ${pages.length} pages`);
