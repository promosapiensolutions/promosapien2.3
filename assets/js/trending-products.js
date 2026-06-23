(function () {
  const DEFAULT_CSV = 'assets/data/trending-products.csv';
  const CSV_URL = window.PROMOSAPIEN_TRENDING_PRODUCTS_CSV || DEFAULT_CSV;
  let productDataPromise;

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"') {
        if (quoted && next === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(cell);
        if (row.some(Boolean)) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
    }
    const headers = rows.shift() || [];
    return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
  }

  function loadProducts() {
    if (!productDataPromise) {
      productDataPromise = fetch(CSV_URL, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error('Product feed unavailable');
          return response.text();
        })
        .then(parseCsv)
        .catch(() => {
          const fallback = window.PROMOSAPIEN_TRENDING_PRODUCTS_DATA;
          return typeof fallback === 'string' && fallback.trim() ? parseCsv(fallback) : [];
        });
    }
    return productDataPromise;
  }

  function productIdFromUrl(url) {
    const match = String(url || '').match(/\/products\/(\d+)/);
    return match ? match[1] : '';
  }

  function normalizeProduct(product) {
    const url = product.ProductLink || product.ProductUrl || '';
    const id = product.ProductID || productIdFromUrl(url);
    const name = product.DisplayName || product.ProductName || (id ? `Featured Product ${id}` : 'Featured Product');
    return {
      ...product,
      ProductUrl: url,
      ProductID: id,
      ProductName: name,
      CategoryLabel: product.CategoryLabel || product.SearchTerm || 'Featured',
      Badge: product.Badge || 'Trending'
    };
  }

  function productCard(product) {
    product = normalizeProduct(product);
    const article = document.createElement('article');
    article.className = 'trending-product-card';

    const link = document.createElement('a');
    link.href = window.location.protocol === 'file:'
      ? product.ProductUrl.replace('https://products.promosapiensolutions.com', 'https://wearepromosapien.espwebsites.com')
      : product.ProductUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', `${product.ProductName} in the ASI catalog`);

    const media = document.createElement('span');
    media.className = 'trending-product-media';
    if (product.StyleImageUrl) {
      const image = document.createElement('img');
      image.src = product.StyleImageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      media.appendChild(image);
    } else {
      media.classList.add('trending-product-media-empty');
      media.textContent = product.CategoryLabel || 'Product';
    }

    const badge = document.createElement('span');
    badge.className = 'trending-product-badge';
    badge.textContent = product.Badge || 'Trending';

    const category = document.createElement('span');
    category.className = 'trending-product-category';
    category.textContent = product.CategoryLabel || product.SearchTerm || 'Featured';

    const name = document.createElement('strong');
    name.textContent = product.ProductName;

    link.append(media, badge, category, name);
    article.appendChild(link);
    return article;
  }

  function setupControls(section, track) {
    const previous = section.querySelector('[data-trending-prev]');
    const next = section.querySelector('[data-trending-next]');
    const distance = () => Math.max(280, Math.floor(track.clientWidth * 0.78));
    previous?.addEventListener('click', () => track.scrollBy({ left: -distance(), behavior: 'smooth' }));
    next?.addEventListener('click', () => track.scrollBy({ left: distance(), behavior: 'smooth' }));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = window.setInterval(() => {
      if (document.hidden || section.matches(':hover') || section.contains(document.activeElement)) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + distance(), behavior: 'smooth' });
    }, 4800);
    section.addEventListener('remove', () => window.clearInterval(timer));
  }

  async function hydrate(section) {
    if (section.dataset.trendingLoaded === 'true') return;
    section.dataset.trendingLoaded = 'true';
    const pageKey = section.dataset.trendingProducts;
    const track = section.querySelector('[data-trending-track]');
    if (!track || !pageKey) return;
    try {
      const rows = await loadProducts();
      const products = rows
        .filter((row) => row.PageKey === pageKey && String(row.Active).toUpperCase() !== 'FALSE')
        .sort((a, b) => Number(a.SortOrder || 0) - Number(b.SortOrder || 0))
        .slice(0, 15);
      track.textContent = '';
      if (!products.length) {
        track.innerHTML = '<p class="trending-products-empty">Trending products are being updated.</p>';
        return;
      }
      products.forEach((product) => track.appendChild(productCard(product)));
      setupControls(section, track);
    } catch (error) {
      track.innerHTML = '<p class="trending-products-empty">Trending products are being updated.</p>';
    }
  }

  function init() {
    const sections = Array.from(document.querySelectorAll('[data-trending-products]'));
    if (!sections.length) return;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            hydrate(entry.target);
          }
        });
      }, { rootMargin: '500px 0px' });
      sections.forEach((section) => observer.observe(section));
    } else {
      sections.forEach(hydrate);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
