import { mkdir, writeFile } from 'node:fs/promises';

export const PDF_URL =
  'https://rivieratrasporti.it/images/_ORARI/2025-2026_Orario_Invernale_Generale_7%C2%AAVer_dal_01-04-2026.pdf';

const outputDir = new URL('../build/source/', import.meta.url);
const outputFile = new URL('../build/source/riviera.pdf', import.meta.url);

await mkdir(outputDir, { recursive: true });

const response = await fetch(PDF_URL);

if (!response.ok) {
  throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
}

const bytes = Buffer.from(await response.arrayBuffer());
await writeFile(outputFile, bytes);

console.log('Fetched Riviera Trasporti PDF');
