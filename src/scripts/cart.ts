const STORE = import.meta.env.PUBLIC_SHOPIFY_STORE_URL;
const TOKEN = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const ENDPOINT = `https://${STORE}/api/2024-01/graphql.json`;

const CART_ID_KEY    = '16k-cart-id';
const CART_COUNT_KEY = '16k-cart-count';

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost { totalAmount { amount currencyCode } }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            price { amount currencyCode }
            product {
              title
              handle
              images(first: 1) { edges { node { url } } }
            }
          }
        }
      }
    }
  }
`;

async function gql(query: string, variables: Record<string, unknown> = {}) {
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

function cacheCount(cart: any) {
  const count = cart?.totalQuantity ?? 0;
  localStorage.setItem(CART_COUNT_KEY, String(count));
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
}

export function getCartCount(): number {
  return Number(localStorage.getItem(CART_COUNT_KEY) || 0);
}

export async function getCart() {
  const cartId = localStorage.getItem(CART_ID_KEY);
  if (!cartId) return null;
  const data = await gql(
    `query($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`,
    { id: cartId }
  );
  return data.cart;
}

export async function addToCart(variantId: string, quantity = 1) {
  const cartId = localStorage.getItem(CART_ID_KEY);
  let cart: any;

  if (cartId) {
    const data = await gql(
      `mutation($cartId: ID!, $lines: [CartLineInput!]!) {
         cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } }
       }`,
      { cartId, lines: [{ merchandiseId: variantId, quantity }] }
    );
    cart = data.cartLinesAdd.cart;
  } else {
    const data = await gql(
      `mutation($lines: [CartLineInput!]!) {
         cartCreate(input: { lines: $lines }) { cart { ${CART_FIELDS} } }
       }`,
      { lines: [{ merchandiseId: variantId, quantity }] }
    );
    cart = data.cartCreate.cart;
    localStorage.setItem(CART_ID_KEY, cart.id);
  }

  cacheCount(cart);
  return cart;
}

export async function updateCartLine(lineId: string, quantity: number) {
  const cartId = localStorage.getItem(CART_ID_KEY)!;
  const data = await gql(
    `mutation($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
       cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } }
     }`,
    { cartId, lines: [{ id: lineId, quantity }] }
  );
  const cart = data.cartLinesUpdate.cart;
  cacheCount(cart);
  return cart;
}

export async function removeCartLine(lineId: string) {
  const cartId = localStorage.getItem(CART_ID_KEY)!;
  const data = await gql(
    `mutation($cartId: ID!, $lineIds: [ID!]!) {
       cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FIELDS} } }
     }`,
    { cartId, lineIds: [lineId] }
  );
  const cart = data.cartLinesRemove.cart;
  cacheCount(cart);
  return cart;
}

export function clearCart() {
  localStorage.removeItem(CART_ID_KEY);
  localStorage.removeItem(CART_COUNT_KEY);
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: null }));
}
