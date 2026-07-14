(function () {
  const previewHost = 'https://wearepromosapien.espwebsites.com';
  const catalogHost = window.location.protocol === 'file:' ? previewHost : '';
  const categories = [
    ['Apparel', 'Tees, polos, fleece, jackets', 'apparel'],
    ['Headwear', 'Caps, beanies, visors', 'headwear'],
    ['Drinkware', 'Tumblers, bottles, mugs', 'drinkware'],
    ['Bags', 'Totes, backpacks, coolers', 'bags'],
    ['Technology', 'Chargers, speakers, accessories', 'technology'],
    ['Office', 'Notebooks, pens, desk items', 'office'],
    ['Awards', 'Recognition and milestones', 'awards'],
    ['Outdoor', 'Blankets, chairs, recreation', 'outdoor'],
    ['Wellness', 'Fitness, health, self-care', 'wellness'],
    ['Trade Shows', 'Booth and giveaway gear', 'trade show'],
    ['Food Gifts', 'Edible gifts and kits', 'food gifts'],
    ['Tools & Auto', 'Work, car, and utility items', 'tools']
  ];

  function catalogUrl(query) {
    return `${catalogHost}/products?q=${encodeURIComponent(query)}&searchType=products&sort=DFLT`;
  }

  document.querySelectorAll('.header-product-search').forEach((search) => {
    const input = search.querySelector('input[type="search"]');
    const help = search.querySelector('.header-search-help');
    if (!input || !help) return;

    help.innerHTML = `
      <div class="header-search-intro">
        <div>
          <strong>What are you looking for?</strong>
          <span>Search by product, brand, color, event, or use.</span>
        </div>
        <a href="product-search.html">Search tips</a>
      </div>
      <div class="header-category-heading">
        <span>Browse Main Categories</span>
        <a href="${catalogHost}/products?sort=PVRN" target="_blank" rel="noopener">All Products</a>
      </div>
      <div class="header-category-grid" aria-label="Browse product categories">
        ${categories.map(([name, description, query]) => `
          <a href="${catalogUrl(query)}" target="_blank" rel="noopener">
            <strong>${name}</strong>
            <span>${description}</span>
          </a>
        `).join('')}
      </div>
    `;

    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-haspopup', 'true');

    const open = () => {
      search.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      search.classList.remove('is-open');
      input.setAttribute('aria-expanded', 'false');
    };

    input.addEventListener('focus', open);
    input.addEventListener('click', open);
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        close();
        input.blur();
      }
    });
    document.addEventListener('click', (event) => {
      if (!search.contains(event.target)) close();
    });
  });

  const mobileNavQuery = window.matchMedia('(max-width: 760px)');
  document.querySelectorAll('.nav-dropdown').forEach((dropdown) => {
    const trigger = dropdown.querySelector('.nav-dropdown-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', (event) => {
      if (!mobileNavQuery.matches) return;
      const wasOpen = dropdown.classList.contains('is-open');
      document.querySelectorAll('.nav-dropdown.is-open').forEach((openDropdown) => {
        if (openDropdown !== dropdown) openDropdown.classList.remove('is-open');
      });
      if (!wasOpen) {
        event.preventDefault();
        dropdown.classList.add('is-open');
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (!mobileNavQuery.matches) return;
    if (event.target.closest('.nav-dropdown')) return;
    document.querySelectorAll('.nav-dropdown.is-open').forEach((dropdown) => dropdown.classList.remove('is-open'));
  });

  if (window.location.protocol === 'file:') {
    document.querySelectorAll('a[href^="/products"]').forEach((link) => {
      link.href = `${previewHost}${link.getAttribute('href')}`;
    });
    document.querySelectorAll('form[action^="/products"]').forEach((form) => {
      form.action = `${previewHost}${form.getAttribute('action')}`;
    });
  }
}());
