const STORE = import.meta.env.PUBLIC_SHOPIFY_STORE_URL;
const TOKEN = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const ENDPOINT = `https://${STORE}/api/2024-01/graphql.json`;

export async function shopifyFetch<T = any>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors[0].message);
  return data;
}

const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  productType
  tags
  priceRange { minVariantPrice { amount currencyCode } }
  images(first: 5) { edges { node { url altText } } }
  variants(first: 10) {
    edges {
      node {
        id
        title
        availableForSale
        price { amount currencyCode }
      }
    }
  }
`;

export async function getAllProducts() {
  const data = await shopifyFetch<any>(
    `{ products(first: 50) { edges { node { ${PRODUCT_FIELDS} } } } }`
  );
  return data.products.edges.map((e: any) => e.node);
}

export async function getProductByHandle(handle: string) {
  const data = await shopifyFetch<any>(
    `query($handle: String!) { productByHandle(handle: $handle) { ${PRODUCT_FIELDS} } }`,
    { handle }
  );
  return data.productByHandle;
}

// Local metadata Shopify doesn't store — model shots + filter tags.
// Keys must match the Shopify product handle exactly.
export const productMeta: Record<string, { models: string[]; color: string; category: string }> = {
  '16k-blue-jorts':         { models: ['/16kP1.png', '/16kP4.png'], color: 'dark-blue',  category: 'jorts' },
  '16k-black-jorts':        { models: ['/16kP3.png', '/16kP6.png'], color: 'black',       category: 'jorts' },
  '16k-light-denim-jorts':  { models: ['/16kP2.png', '/16kP5.png'], color: 'light-blue', category: 'jorts' },
};

export function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(Number(amount));
}
