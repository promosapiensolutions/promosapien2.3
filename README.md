# Promosapien Merch Solutions

Static website ready for GitHub and Vercel deployment.

## Preview

Open `index.html` in a browser, or run a simple static server from this folder.

## Deploying

Push this folder to GitHub, then import the repository in Vercel. The project does not require a framework preset or build command.

For launch, the existing paid catalog route is preserved by redirecting `/products` and `/products/*` to the branded ASI/ESP catalog subdomain at `https://products.promosapiensolutions.com/products`. The new site also includes a branded `product-search.html` entry page that sends searches into the ASI catalog.

The deployment excludes large source images and ships the optimized assets referenced by the pages.
