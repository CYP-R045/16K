export interface CartItem {
  id: number;
  name: string;
  size: string;
  price: string;
  img: string;
  qty: number;
}

const KEY = '16k-cart';

export function getCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart-updated'));
}

export function addToCart(item: Omit<CartItem, 'qty'>) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) { existing.qty += 1; }
  else { cart.push({ ...item, qty: 1 }); }
  saveCart(cart);
}

export function getCartCount(): number {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

export function clearCart() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('cart-updated'));
}
