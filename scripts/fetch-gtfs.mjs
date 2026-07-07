import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { get } from 'node:https';
import { spawn } from 'node:child_process';

const DEFAULT_GTFS_URL = 'https://srvcarto.regione.liguria.it/dtuff/download_statico/opendata/trasporti/GTFS/GTFS-IT-ITC3-RT-20260601-20260913-ter-fares.zip';

function download(url, outputUrl) {
  return new Promise((resolve, reject) => {
    get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        download(new URL(response.headers.location, url), outputUrl).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`GTFS download failed: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      const file = createWriteStream(outputUrl);
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

function unzip(zipUrl, outputDirectoryUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn('unzip', ['-q', '-o', zipUrl.pathname, '-d', outputDirectoryUrl.pathname], {
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`unzip exited with code ${code}`));
    });
  });
}

async function main() {
  const feedUrl = process.env.GTFS_FEED_URL ?? DEFAULT_GTFS_URL;
  const zipUrl = new URL('../build/gtfs-riviera-trasporti.zip', import.meta.url);
  const outputDirectoryUrl = new URL('../build/gtfs/', import.meta.url);

  await mkdir(new URL('../build/', import.meta.url), { recursive: true });
  await rm(outputDirectoryUrl, { recursive: true, force: true });
  await download(feedUrl, zipUrl);
  await unzip(zipUrl, outputDirectoryUrl);

  console.log(`Fetched GTFS feed from ${feedUrl}`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
