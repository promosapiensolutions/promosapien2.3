import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('../public/', import.meta.url);
const rootFiles = ['styles.css', 'robots.txt', 'sitemap.xml'];
const allowedImageExtensions = new Set(['.webp', '.svg']);

async function copyFileWithRetry(source, destination) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await copyFile(source, destination);
      return;
    } catch (error) {
      if (error.code !== 'ENOENT' || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
const htmlFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name);

await Promise.all([...htmlFiles, ...rootFiles].map((file) =>
  copyFileWithRetry(new URL(file, root), new URL(file, output))
));

const assetsSource = fileURLToPath(new URL('../assets/', import.meta.url));
const assetsDestination = fileURLToPath(new URL('assets/', output));

async function collectAssets(directory) {
  const children = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(children.map(async (child) => {
    const childPath = join(directory, child.name);
    if (child.isDirectory()) return collectAssets(childPath);

    const extension = extname(childPath).toLowerCase();
    const shouldCopy = extension === '.js' ||
      extension === '.csv' ||
      allowedImageExtensions.has(extension) ||
      childPath.endsWith('promosapien-logo-transparent.png');

    return shouldCopy ? [childPath] : [];
  }));

  return files.flat();
}

const assetFiles = await collectAssets(assetsSource);
await Promise.all(assetFiles.map(async (file) => {
  const destination = join(assetsDestination, relative(assetsSource, file));
  await mkdir(dirname(destination), { recursive: true });
  await copyFileWithRetry(file, destination);
}));

console.log(`Static site ready: ${htmlFiles.length} pages copied to public/`);
