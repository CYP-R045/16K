# 16K Storefront — Full Build Crash Course

This document explains every decision, pattern, and line of logic used to build this site. It is written assuming you want to understand it deeply enough to rebuild it yourself or extend it confidently.

---

## 1. Why Astro

Astro is a web framework built around one idea: **ship as little JavaScript as possible**. Most frameworks (React, Vue, Next.js) send a full JavaScript bundle to the browser even for content that never changes. Astro flips this — it renders everything to plain HTML at build time, and only sends JavaScript for the parts that actually need it (like the cart or filters).

This makes the site:
- **Fast** — the browser gets static HTML, no JS framework loading
- **Simple to deploy** — the build output (`dist/`) is just HTML, CSS, and JS files that can go anywhere
- **Easy to reason about** — each page and component is its own self-contained file

Astro uses a file format called `.astro`. Every `.astro` file has three sections:

```
---
// 1. FRONTMATTER — runs at build time on the server (Node.js)
//    Imports, data fetching, variables go here
---

<!-- 2. TEMPLATE — HTML with JSX-style expressions -->
<h1>{variable}</h1>

<style>
  /* 3. SCOPED CSS — automatically scoped to this component only */
</style>

<script>
  // 4. CLIENT SCRIPT — runs in the browser after the page loads
</script>
```

The frontmatter (between the `---` dashes) runs once at build time. It never runs in the browser. The `<script>` tag is the opposite — it only runs in the browser, never at build time.

---

## 2. Project Structure

```
16K/
├── public/              # Static files served as-is (images, video)
├── src/
│   ├── components/      # Reusable UI pieces (Nav, Footer, etc.)
│   ├── data/            # TypeScript data files (products list)
│   ├── layouts/         # Page shells (the wrapper every page uses)
│   ├── pages/           # Every file here becomes a URL route
│   │   ├── index.astro      → /
│   │   ├── shop.astro       → /shop
│   │   ├── checkout.astro   → /checkout
│   │   └── product/
│   │       └── [id].astro   → /product/1, /product/2, etc.
│   └── scripts/         # Shared JavaScript utilities (cart logic)
├── astro.config.mjs     # Astro configuration
└── package.json         # Dependencies and build scripts
```

**The `pages/` folder is the router.** Whatever you name the file, that becomes the URL. `shop.astro` → `/shop`. No configuration needed.

The `[id]` in square brackets means it's a **dynamic route** — explained in detail in section 7.

---

## 3. Layout.astro — The Page Shell

**File:** `src/layouts/Layout.astro`

Every page on the site uses this layout as its wrapper. It handles:
- The HTML document structure (`<html>`, `<head>`, `<body>`)
- The Google Fonts import
- Global CSS reset
- The intro animation overlay

### How layouts work

A layout is just a component that uses `<slot />`. The `<slot />` is a placeholder — wherever you put it, that's where the page's content gets injected.

```astro
---
const { title = '16K' } = Astro.props;
---
<html>
  <head>
    <title>{title}</title>
  </head>
  <body>
    <slot />   <!-- page content goes here -->
  </body>
</html>
```

When a page uses the layout:
```astro
<Layout title="16K — Shop">
  <Nav />
  <main>...</main>
</Layout>
```

Astro replaces `<slot />` with everything between the `<Layout>` tags.

### The intro animation

The intro is a full-screen overlay (`position: fixed; inset: 0`) that sits above everything at `z-index: 999`. It shows the logo video, waits for a click, then animates the video flying into the nav logo position.

The animation uses a technique called **FLIP** (First, Last, Invert, Play):

```javascript
// 1. Get where the video currently is (First)
const videoRect = introVideo.getBoundingClientRect();

// 2. Get where we want it to go (Last) — the nav logo
const navRect = navLogo.getBoundingClientRect();

// 3. Calculate the transform needed to move it there (Invert)
const tx = (navRect.left + navRect.width / 2) - (videoRect.left + videoRect.width / 2);
const ty = (navRect.top + navRect.height / 2) - (videoRect.top + videoRect.height / 2);
const scale = navRect.width / videoRect.width;

// 4. Apply the transform — CSS transition animates it (Play)
introVideo.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
```

`getBoundingClientRect()` returns an element's position relative to the viewport. We use it to calculate exactly how far the video needs to travel and how much it needs to shrink to land precisely in the nav.

### sessionStorage — skip the intro after first visit

`sessionStorage` works like `localStorage` but resets when the browser tab closes. We use it so the intro only plays once per session:

```javascript
if (sessionStorage.getItem('16k-intro-seen')) {
  skipIntro(); // already seen, skip immediately
} else {
  intro.addEventListener('click', () => {
    sessionStorage.setItem('16k-intro-seen', '1'); // mark as seen
    // ... play animation
  });
}
```

---

## 4. Nav.astro — Navigation, Drawer, Cart Badge

**File:** `src/components/Nav.astro`

The nav has three main parts:
1. **Hamburger button** — opens the mobile drawer
2. **Logo** — centered absolutely, plays a looping video
3. **Right side** — SHOP link + cart icon

### Why the logo is `position: absolute`

The nav uses `display: flex; justify-content: space-between` which puts items on the left and right. To center the logo regardless of what's on either side, we take it out of the flex flow entirely with `position: absolute; left: 50%; transform: translateX(-50%)`. This centers it relative to the nav container, not between its siblings.

### The mobile drawer

The drawer is a panel that slides in from the left. Off-screen by default:

```css
.drawer {
  position: fixed;
  left: -100%;        /* hidden off-screen left */
  transition: left 0.3s ease;
}
.drawer.open {
  left: 0;            /* slides in */
}
```

Adding/removing the `open` class triggers the CSS transition. A dark overlay (`position: fixed; inset: 0; background: rgba(0,0,0,0.4)`) appears behind the drawer and closes it when clicked.

### The cart badge

The badge is a small circle that shows the item count. It starts hidden:

```css
.nav__cart-count {
  display: none;
}
```

The script reads the cart from `localStorage` and shows or hides it:

```javascript
import { getCartCount } from '../scripts/cart';

function syncCartBadge() {
  const count = getCartCount();
  cartCountEl.textContent = String(count);
  cartCountEl.style.display = count > 0 ? 'flex' : 'none';
}

syncCartBadge(); // run on page load
window.addEventListener('cart-updated', syncCartBadge); // run when cart changes
```

The `cart-updated` event is a **custom event** — explained in the cart section. The key point is that when anything adds to the cart on any page, it fires this event, and the nav automatically updates without needing a page reload.

---

## 5. src/data/products.ts — The Data Layer

**File:** `src/data/products.ts`

This is a plain TypeScript file that exports the product data as an array. It's not a component — just data.

```typescript
export interface Product {
  id: number;
  name: string;
  size: string;
  price: string;
  img: string;       // flat product shot
  model: string;     // model shot
  gallery: string[]; // all images for the product page
  category: string;
  color: string;
  waist: string;
  description: string;
}

export const products: Product[] = [
  { id: 1, name: 'Dark Blue Jorts', ... },
  ...
];
```

We define a TypeScript `interface` first — this is a type contract. It tells TypeScript exactly what shape every product object must have. If you typo a field name or forget one, TypeScript catches it before the code runs.

We import this in three places:
- `shop.astro` — to render the product grid
- `product/[id].astro` — to find the right product for each page
- The data never changes at runtime so it only needs to live in one place

Why separate it into its own file instead of defining it inside `shop.astro`? Because both `shop.astro` and `product/[id].astro` need it. Putting it in a shared file means one source of truth — change a product in one place, it updates everywhere.

---

## 6. src/scripts/cart.ts — Cart State Management

**File:** `src/scripts/cart.ts`

This file is the entire cart system. It uses `localStorage` — a browser API that stores data as key-value strings, persisting across page navigations and browser restarts (unlike variables which reset on every page load).

```typescript
const KEY = '16k-cart';

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return []; // if JSON is corrupted, return empty
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart-updated')); // notify listeners
}
```

`localStorage` only stores strings, so we use `JSON.stringify` to convert the cart array to a string when saving, and `JSON.parse` to convert it back to an array when reading.

### The custom event pattern

`window.dispatchEvent(new CustomEvent('cart-updated'))` fires an event on the `window` object — the global event bus of the browser. Any script on any part of the page can listen for it:

```javascript
window.addEventListener('cart-updated', () => {
  // update the badge, re-render the cart, etc.
});
```

This is how two completely separate components (the product page and the nav) stay in sync without knowing about each other. The product page calls `addToCart()` which calls `saveCart()` which fires `cart-updated`. The nav listens for `cart-updated` and updates its badge. Neither component imports the other.

### addToCart logic

```typescript
export function addToCart(item: Omit<CartItem, 'qty'>) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.qty += 1;    // already in cart, increment
  } else {
    cart.push({ ...item, qty: 1 }); // new item, add with qty 1
  }
  saveCart(cart);
}
```

`Omit<CartItem, 'qty'>` is a TypeScript utility type — it means "CartItem but without the qty field". The function adds `qty: 1` itself, so callers don't need to think about it.

`...item` is the spread operator — it copies all properties of `item` into the new object.

---

## 7. index.astro — The Homepage

**File:** `src/pages/index.astro`

### The hero section

The hero is two images side by side, with text overlaid on top:

```css
.hero {
  position: relative; /* establishes positioning context for the overlay */
  display: flex;
  height: 100vh;
}
.hero__half {
  flex: 1;  /* each half takes equal space */
  overflow: hidden;
}
.hero__overlay {
  position: absolute;
  inset: 0; /* shorthand for top:0; right:0; bottom:0; left:0 */
  background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%);
}
```

`position: relative` on the hero container makes it a **positioning context**. When the overlay uses `position: absolute; inset: 0`, it fills its nearest `position: relative` ancestor — the hero container. Without `relative` on the parent, the overlay would fill the entire page.

The gradient goes from semi-transparent black at the bottom (makes text readable) to fully transparent at the top (shows the images clearly).

### The featured product grid

```astro
{[...featured, ...featured, ...featured].map((p) => (
  <a href="/shop" class="product-card">...</a>
))}
```

The spread `[...featured, ...featured, ...featured]` creates a new array containing the 3 products repeated 3 times = 9 cards total. This fills the 3×3 grid.

### The looks carousel (auto-scrolling)

```css
.looks__track {
  display: flex;
  width: max-content;           /* don't wrap, let it be as wide as needed */
  animation: looksScroll 24s linear infinite;
}

@keyframes looksScroll {
  from { transform: translateX(0); }
  to   { transform: translateX(calc(-100% / 3)); }
}
```

The track contains 3 copies of the 6 images = 18 images. The animation slides the track left by exactly one-third of its total width (which equals the width of one full set of 6 images). When it reaches that point, it loops — but because the next copy is identical, the loop is seamless.

`width: max-content` tells the container to be exactly as wide as all its children combined — it won't wrap to a new line.

### IntersectionObserver — fade-up on scroll

```javascript
const observer = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('in-view');
  }),
  { threshold: 0.1 }
);
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
```

`IntersectionObserver` watches elements and fires a callback when they enter or leave the viewport. `threshold: 0.1` means "fire when 10% of the element is visible".

Elements start invisible via CSS:
```css
.fade-up {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.fade-up.in-view {
  opacity: 1;
  transform: translateY(0);
}
```

When the observer fires and adds `in-view`, the CSS transition smoothly animates the element into view. This is better than scroll event listeners because `IntersectionObserver` runs off the main thread — it doesn't block rendering.

---

## 8. shop.astro — The Shop Page

**File:** `src/pages/shop.astro`

### The filter system — data attributes

Every product card has HTML data attributes burned in at build time:

```astro
<a
  href={`/product/${p.id}`}
  class="product-card"
  data-category={p.category}   // e.g. "jorts"
  data-color={p.color}         // e.g. "dark-blue"
  data-waist={p.waist}         // e.g. "34"
>
```

`data-*` attributes are custom HTML attributes. They're invisible to the user but accessible to JavaScript via `element.dataset.category`, `element.dataset.color`, etc.

Every filter button also has data attributes:
```html
<button class="filter-btn" data-filter="color" data-value="dark-blue">Dark Blue</button>
```

`data-filter` tells us which filter group this button belongs to. `data-value` tells us what value to filter by.

### The filter logic

```javascript
let activeFilters = { category: 'all', waist: 'all', color: 'all' };

function applyFilters() {
  cards.forEach(card => {
    const match =
      (activeFilters.category === 'all' || card.dataset.category === activeFilters.category) &&
      (activeFilters.waist    === 'all' || card.dataset.waist    === activeFilters.waist) &&
      (activeFilters.color    === 'all' || card.dataset.color    === activeFilters.color);

    card.classList.toggle('hidden-card', !match);
  });
}
```

`activeFilters` stores the current state of all three filters. When a button is clicked, it updates the relevant filter and calls `applyFilters()`.

`classList.toggle('hidden-card', !match)` — when `match` is false, it adds the class. When true, it removes it. `hidden-card` sets `display: none` in CSS. This is more performant than removing/adding elements from the DOM because the elements stay in memory — only their visibility changes.

The count updates simultaneously:
```javascript
let visible = 0;
cards.forEach(card => {
  if (!card.classList.contains('hidden-card')) visible++;
});
countEl.textContent = String(visible);
```

### Staggered fade-in animation

```astro
<a style={`--d:${i * 0.07}s`} class="product-card fade-up">
```

Each card gets a CSS custom property `--d` set to its index times 0.07 seconds. Card 0 has `--d: 0s`, card 1 has `--d: 0.07s`, card 2 has `--d: 0.14s`, etc.

The CSS uses this as a transition delay:
```css
.fade-up {
  transition: opacity 0.5s ease var(--d, 0s), transform 0.5s ease var(--d, 0s);
}
```

Each card starts its animation slightly after the previous one, creating the cascading stagger effect.

---

## 9. product/[id].astro — Individual Product Pages

**File:** `src/pages/product/[id].astro`

### getStaticPaths — how dynamic routes work

In Astro, files named `[something].astro` are dynamic routes. At build time, Astro calls `getStaticPaths()` to find out what pages to generate:

```javascript
export function getStaticPaths() {
  return products.map(p => ({ params: { id: String(p.id) } }));
}
```

This returns an array of objects, each with a `params` object. For 6 products, it returns:
```javascript
[
  { params: { id: '1' } },
  { params: { id: '2' } },
  { params: { id: '3' } },
  { params: { id: '4' } },
  { params: { id: '5' } },
  { params: { id: '6' } },
]
```

Astro generates one HTML file per entry — `/product/1/index.html`, `/product/2/index.html`, etc. This is **Static Site Generation (SSG)** — all pages are pre-built, no server needed.

### Finding the right product

```javascript
const { id } = Astro.params;
const product = products.find(p => p.id === Number(id))!;
```

`Astro.params` gives us the current URL parameter. We convert it to a number (URL params are always strings) and find the matching product. The `!` tells TypeScript "trust me, this will not be undefined" — we know it exists because `getStaticPaths` only generates pages for real product IDs.

### The gallery image swap

When a thumbnail is clicked, the main image fades out, swaps src, then fades back in:

```javascript
mainImg.classList.add('swapping');       // opacity: 0 via CSS transition
setTimeout(() => {
  mainImg.src = src;                     // change the image source mid-fade
  mainImg.classList.remove('swapping'); // opacity: 1 — fade back in
}, 250);                                // wait for fade-out to complete
```

```css
.pdp__main-img {
  transition: opacity 0.25s ease;
}
.pdp__main-img.swapping {
  opacity: 0;
}
```

Changing `src` while the image is invisible means the user never sees a half-loaded swap — the new image loads while faded out.

### Passing data from HTML to JavaScript

The product data lives in Astro's frontmatter (build time) but the ADD TO CART button needs it at runtime in the browser. We bridge this by embedding the data as HTML data attributes:

```astro
<button
  id="addToCart"
  data-id={product.id}
  data-name={product.name}
  data-size={product.size}
  data-price={product.price}
  data-img={product.img}
>ADD TO CART</button>
```

Astro renders these as literal HTML attributes:
```html
<button data-id="1" data-name="Dark Blue Jorts" data-price="$150" ...>
```

The browser-side script reads them back:
```javascript
const { id, name, size, price, img } = btn.dataset;
addToCart({ id: Number(id), name, size, price, img });
```

This is the standard pattern for getting server-side data into client-side scripts in static sites.

---

## 10. TrustBadges.astro

**File:** `src/components/TrustBadges.astro`

A simple presentational component — no JavaScript, no interactivity. Just three items displayed in a flex row with SVG icons.

Each icon is an inline SVG (not an image file). Inline SVG is preferred here because:
- No extra network request
- Can be styled with CSS (`stroke`, `fill`, `color`)
- Scales perfectly at any size

The icons use `stroke="currentColor"` which means the SVG line color inherits from the parent element's `color` CSS property — making them easy to theme.

---

## 11. Footer.astro — The Policy Modal System

**File:** `src/components/Footer.astro`

### Why buttons instead of links

The policy links don't navigate to a new page — they open a modal. Using `<a href="#">` would be wrong semantically and would cause the page to scroll to the top. `<button>` is the correct element for something that triggers an action without navigation.

### One modal, four content sets

Instead of building four separate modals, there's one modal that updates its content based on which button was clicked:

```javascript
const policies = {
  shipping:      { title: 'Shipping Policy',      body: `...` },
  'custom-order': { title: 'Custom Order Policy', body: `...` },
  refund:        { title: 'Refund Policy',         body: `...` },
  care:          { title: 'Garment Care',          body: `...` },
};

document.querySelectorAll('.policy-link').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.modal;        // reads data-modal attribute
    const policy = policies[key];
    modalTitle.textContent = policy.title;
    modalBody.innerHTML = policy.body;   // injects HTML
    overlay.classList.add('open');
  });
});
```

`data-modal="shipping"` on each button is the key that maps to the right policy content.

### Modal accessibility

- `role="dialog"` and `aria-modal="true"` on the modal div tell screen readers it's a dialog
- `document.body.style.overflow = 'hidden'` prevents the page behind from scrolling while the modal is open
- Pressing `Escape` closes it: `document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); })`
- Clicking the overlay (outside the modal) also closes it by checking `e.target === overlay`

---

## 12. checkout.astro — The Cart Page

**File:** `src/pages/checkout.astro`

### Why this page is mostly JavaScript

The cart lives in `localStorage` — a browser API that doesn't exist at build time. Astro's frontmatter runs at build time (Node.js), not in the browser. So you cannot read the cart in the frontmatter and render it in HTML.

Instead, the page ships with empty containers:
```html
<div id="cartItems"><!-- populated by script --></div>
<div id="cartSummary"><!-- populated by script --></div>
```

The JavaScript runs in the browser, reads `localStorage`, and fills these in.

### The render function pattern

All cart rendering is wrapped in a single `render()` function that's called whenever the cart changes:

```javascript
function render() {
  const cart = getCart();

  if (cart.length === 0) {
    // show empty state, hide everything else
    return;
  }

  // build HTML string from cart data
  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-row" data-id="${item.id}">
      ...
    </div>
  `).join('');

  // re-attach event listeners after innerHTML wipes them
  document.querySelectorAll('.qty-dec').forEach(btn => {
    btn.addEventListener('click', () => { ... render(); });
  });
}

render(); // initial render on page load
window.addEventListener('cart-updated', render); // re-render when cart changes
```

Every time `render()` runs, it wipes `innerHTML` and rebuilds from scratch. This is simple but requires re-attaching event listeners every time because setting `innerHTML` destroys all existing DOM nodes and their listeners.

### priceNum — parsing price strings

```javascript
function priceNum(str) {
  return Number(str.replace(/[^0-9.]/g, ''));
}
```

Product prices are stored as strings like `"$150"`. This function strips everything that isn't a digit or decimal point using a regex, then converts to a number. `/[^0-9.]/g` means "match any character that is NOT a digit or period, globally".

### The three UI states

The checkout page has three states, controlled by `display` toggling:

1. **Has items** — `.checkout__layout` visible, others hidden
2. **Empty** — `#cartEmpty` visible, others hidden  
3. **Order placed** — `#orderConfirm` visible, others hidden

```javascript
form.addEventListener('submit', e => {
  e.preventDefault();           // stop default form submission (would refresh page)
  layoutEl.style.display = 'none';
  confirmEl.style.display = 'flex';
  clearCart();                  // wipe localStorage, fires 'cart-updated'
});
```

`e.preventDefault()` is critical — without it, submitting a form causes a page reload, losing the cart state and the confirmation message.

---

## 13. CSS Patterns Used Throughout

### BEM naming

All class names follow BEM: Block, Element, Modifier.

- `.product-card` — the block
- `.product-card__img` — an element inside the block (double underscore)
- `.product-card__img--active` — a modifier on an element (double dash)

This prevents CSS from leaking between components. `.product-card__name` only means the name inside a product card — it can't accidentally affect something else.

### CSS custom properties for dynamic values

```css
.fade-up {
  transition: opacity 0.5s ease var(--d, 0s);
}
```

`var(--d, 0s)` reads the custom property `--d`, falling back to `0s` if it's not set. Setting `--d` per element in HTML lets each element have a different delay without separate CSS classes for each one.

### clamp() for responsive typography

```css
font-size: clamp(1.4rem, 3vw, 2rem);
```

`clamp(min, preferred, max)` — the font size is `3vw` (3% of viewport width) but never smaller than `1.4rem` or larger than `2rem`. This gives fluid scaling between screen sizes without media queries.

### aspect-ratio

```css
.product-card__img-wrap {
  aspect-ratio: 3/4;
}
```

Sets width-to-height ratio directly. The element will always be taller than it is wide (portrait) regardless of its actual width. Before this CSS property existed, this required a hack with padding-top percentages.

---

## 14. Key Browser APIs Used

| API | Where | What it does |
|-----|-------|--------------|
| `localStorage` | cart.ts | Persists cart across page loads |
| `sessionStorage` | Layout.astro | Remembers if intro was seen this session |
| `IntersectionObserver` | index.astro, shop.astro | Triggers animations when elements scroll into view |
| `CustomEvent` | cart.ts, Nav.astro | Lets components communicate without importing each other |
| `getBoundingClientRect()` | Layout.astro | Gets element position for the intro animation |
| `dataset` | product pages, shop, checkout | Reads `data-*` HTML attributes in JavaScript |

---

## 15. The Build Process

Running `npm run build` triggers Astro's build:

1. Astro finds every file in `src/pages/`
2. For dynamic routes (`[id].astro`), it calls `getStaticPaths()` to get the list of pages
3. For each page, it runs the frontmatter (imports, data fetching)
4. It renders the template to HTML
5. It bundles all `<script>` tags with Vite (tree-shaking, TypeScript → JavaScript)
6. Output lands in `dist/` — plain HTML, CSS, and JS files

The `dist/` folder is what gets deployed to Netlify. Netlify serves these static files from a CDN — no server, no database, no runtime. Just files.

---

## What You'd Build Next

To take this site further, the natural next steps are:

- **Real payments** — integrate Stripe Checkout. You'd replace the fake form submit with a call to a Stripe Payment Link or Stripe's API
- **Email on order** — use a service like Resend or Formspree to receive the order form data and send a confirmation email
- **CMS for products** — instead of editing `products.ts` manually, connect a headless CMS (Sanity, Contentful) so you can add products without touching code
- **Auth** — if you want order history or customer accounts, you'd need a backend (Supabase is a good starting point)
- **Real routing on product click from home** — currently the homepage featured grid links to `/shop`, not individual product pages
