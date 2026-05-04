import { mkdir, writeFile } from 'node:fs/promises';
import { PDF_SOURCE_METADATA } from './lib/pdfSource.mjs';

const outputDir = new URL('../build/source/', import.meta.url);
const outputFile = new URL('../build/source/riviera.pdf', import.meta.url);

await mkdir(outputDir, { recursive: true });

const response = await fetch(PDF_SOURCE_METADATA.url);

if (!response.ok) {
  throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
}

const bytes = Buffer.from(await response.arrayBuffer());
await writeFile(outputFile, bytes);

console.log('Fetched Riviera Trasporti PDF');
