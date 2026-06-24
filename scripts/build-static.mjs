import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';
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

async function copyTree(source, destination, include) {
  await mkdir(destination, { recursive: true });
  const children = await readdir(source, { withFileTypes: true });
  for (const child of children) {
    const sourcePath = join(source, child.name);
    const destinationPath = join(destination, child.name);
    if (child.isDirectory()) {
      await copyTree(sourcePath, destinationPath, include);
    } else if (include(sourcePath)) {
      await copyFileWithRetry(sourcePath, destinationPath);
    }
  }
}

await copyTree(
  fileURLToPath(new URL('../assets/', import.meta.url)),
  fileURLToPath(new URL('../public/assets/', import.meta.url)),
  (file) => {
    const extension = extname(file).toLowerCase();
    return extension === '.js' ||
      extension === '.csv' ||
      allowedImageExtensions.has(extension) ||
      file.endsWith('promosapien-logo-transparent.png');
  }
);

console.log(`Static site ready: ${htmlFiles.length} pages copied to public/`);
