import { chromium } from 'playwright';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const storefront = 'https://wearepromosapien.espwebsites.com';
const catalog = 'https://products.promosapiensolutions.com';
const imageDirectory = join(root, 'assets/images/trending-products');
const csvPath = join(root, 'assets/data/trending-products.csv');
const fallbackPath = join(root, 'assets/js/trending-products-data.js');

const plans = [
  {
    pageKey: 'corporate-stores',
    searches: [
      ['corporate apparel', 'Apparel'],
      ['business backpacks', 'Bags'],
      ['premium drinkware', 'Drinkware'],
      ['company store apparel', 'Apparel'],
      ['premium polos', 'Apparel']
    ]
  },
  {
    pageKey: 'employee-programs',
    searches: [
      ['welcome gift set', 'Welcome Kits'],
      ['employee award', 'Recognition'],
      ['premium tumblers', 'Drinkware'],
      ['new hire kit', 'Onboarding Kits']
    ]
  },
  {
    pageKey: 'client-gifts',
    searches: [
      ['Sheaffer gift set', 'Executive Gifts'],
      ['premium journal set', 'Gift Sets'],
      ['mophie power bank', 'Tech Gifts'],
      ['leather portfolio', 'Executive Gifts']
    ]
  },
  {
    pageKey: 'resort-merchandise',
    searches: [
      ['TravisMathew polo', 'Resort Apparel'],
      ['Tommy Bahama polo', 'Resort Apparel'],
      ['beach tote', 'Bags'],
      ['premium caps', 'Headwear'],
      ['resort towel', 'Resort Essentials']
    ]
  },
  {
    pageKey: 'golf-tournaments',
    searches: [
      ['golf apparel', 'Golf Apparel'],
      ['golf accessories', 'Golf Accessories'],
      ['golf bags', 'Golf Bags']
    ]
  },
  {
    pageKey: 'events-trade-shows',
    searches: [
      ['conference bags', 'Conference Gear'],
      ['event staff apparel', 'Event Apparel'],
      ['wireless chargers', 'Tech Giveaways']
    ]
  },
  {
    pageKey: 'trades',
    searches: [
      ['Carhartt workwear', 'Workwear'],
      ['Red Kap workwear', 'Workwear'],
      ['high visibility workwear', 'High Visibility'],
      ['work jackets', 'Workwear'],
      ['hard hats', 'Safety Gear']
    ]
  }
];

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows) {
  const headers = ['PageKey', 'Active', 'SortOrder', 'ProductLink', 'DisplayName', 'StyleImageUrl', 'Badge', 'CategoryLabel', 'Notes'];
  return `${headers.join(',')}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')).join('\n')}\n`;
}

async function downloadImage(url, productId) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'PromosapienMerchSite/1.0' }
  });
  if (!response.ok) throw new Error(`Image download failed (${response.status}): ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const filename = `${productId}.webp`;
  await writeFile(join(imageDirectory, filename), bytes);
  return `assets/images/trending-products/${filename}`;
}

async function acceptCookies(page) {
  const button = page.getByRole('button', { name: 'Accept All Cookies' });
  if (await button.count()) await button.click().catch(() => {});
}

async function searchProducts(page, query, categoryLabel, usedIds) {
  const url = `${storefront}/products?q=${encodeURIComponent(query)}&searchType=products&sort=PVRN`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await acceptCookies(page);
  await page.locator('a[href^="/products/"] img').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.evaluate(() => window.scrollTo(0, Math.min(document.body.scrollHeight, 2600)));
  await page.waitForTimeout(1200);

  const candidates = await page.locator('a[href^="/products/"]').evaluateAll((links) => links.map((link) => {
    const image = link.querySelector('img');
    const href = link.getAttribute('href') || '';
    const productId = href.match(/\/products\/(\d+)/)?.[1] || '';
    return {
      productId,
      name: image?.getAttribute('alt')?.trim() || '',
      imageUrl: image?.currentSrc || image?.getAttribute('src') || '',
      isNew: /\bNew\b/i.test(link.textContent || '')
    };
  }));

  const selected = [];
  for (const product of candidates) {
    const normalizedName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!product.productId || !product.name || !product.imageUrl || usedIds.has(product.productId) || usedIds.has(normalizedName)) continue;
    usedIds.add(product.productId);
    usedIds.add(normalizedName);
    const localImage = await downloadImage(product.imageUrl, product.productId);
    selected.push({
      ProductLink: `${catalog}/products/${product.productId}`,
      DisplayName: product.name,
      StyleImageUrl: localImage,
      Badge: product.isNew ? 'New' : 'Trending',
      CategoryLabel: categoryLabel,
      Notes: `Weekly ESP search: ${query}`
    });
    if (selected.length === 5) break;
  }
  return selected;
}

await mkdir(imageDirectory, { recursive: true });
const previousCsv = await readFile(csvPath, 'utf8');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const rows = [];

try {
  for (const plan of plans) {
    const usedIds = new Set();
    const productGroups = [];
    for (const [query, categoryLabel] of plan.searches) {
      productGroups.push(await searchProducts(page, query, categoryLabel, usedIds));
    }
    const products = [];
    for (let index = 0; products.length < 15; index += 1) {
      let added = false;
      for (const group of productGroups) {
        if (group[index]) {
          products.push(group[index]);
          added = true;
        }
      }
      if (!added) break;
    }
    if (products.length < 12) {
      throw new Error(`${plan.pageKey} produced only ${products.length} valid products; keeping the existing feed.`);
    }
    products.slice(0, 15).forEach((product, index) => rows.push({
      PageKey: plan.pageKey,
      Active: 'TRUE',
      SortOrder: index + 1,
      ...product
    }));
    console.log(`${plan.pageKey}: ${Math.min(products.length, 15)} products`);
  }

  const csv = toCsv(rows);
  await writeFile(csvPath, csv);
  await writeFile(fallbackPath, `window.PROMOSAPIEN_TRENDING_PRODUCTS_DATA = ${JSON.stringify(csv)};\n`);

  const currentImages = new Set(rows.map((row) => row.StyleImageUrl.split('/').pop()));
  const directoryEntries = await import('node:fs/promises').then(({ readdir }) => readdir(imageDirectory));
  await Promise.all(directoryEntries
    .filter((filename) => filename.endsWith('.webp') && !currentImages.has(filename))
    .map((filename) => rm(join(imageDirectory, filename))));
} catch (error) {
  await writeFile(csvPath, previousCsv);
  throw error;
} finally {
  await browser.close();
}
