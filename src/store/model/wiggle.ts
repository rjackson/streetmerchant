import {Page} from 'puppeteer';
import {AggregateOffer, Product, Offer} from 'schema-dts';
import {Item, Link, Store} from './store';

export const Wiggle: Store = {
  name: 'wiggle',
  currency: '£',
  labels: {},
  links: [
    {
      brand: 'test:brand',
      series: 'test:series',
      model: 'test:model',
      url: 'https://www.wiggle.co.uk/shimano-sora-hg50-9-speed-road-cassette',
    },
  ],
  //  linksBuilder: {}
  resolveItems: async (store: Store, page: Page, link: Link) => {
    const element = await page.$('script[type="application/ld+json"]');
    const text = (await page.evaluate(element => element.innerText, element))
      .trim()
      .replace(/;$/, '');
    const product: Product = JSON.parse(text);

    // Page doesn't have any structured product data. Exit with an 'undefined'
    // item (fall back to old parsing bejaviour)
    if (product['@type'] !== 'Product') {
      return [undefined];
    }
    if (
      product.offers === undefined ||
      !('@type' in product.offers) ||
      product.offers['@type'] !== 'AggregateOffer'
    ) {
      return [undefined];
    }

    const offers: Offer[] = (product.offers as AggregateOffer)
      .offers as Offer[];

    const items: Item[] = await Promise.all(
      offers.map(async offer => {
        const {price, sku, availability} = offer;

        const listItem = await page.$(`li[for='${sku}']`);
        const title = await (await listItem?.getProperty('title'))?.jsonValue();

        return {
          price: (price as string) || 'arse',
          sku: (sku as string) || 'arse',
          inStock: (availability as string).includes('schema.org/InStock'),
          title: `${product.name} ${title as string}`,
          brand: 'test:brand',
          series: 'test:series',
          model: 'test:model',
        };
      })
    );

    if (items.length === 0) {
      return [undefined];
    }

    return items;
  },
};
