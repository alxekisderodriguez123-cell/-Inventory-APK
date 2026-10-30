const ICONS = {
  home: '⌂',
  inventory: '▤',
  sales: '↗',
  search: '⌕',
  settings: '⚙',
  plus: '+',
  back: '←',
  box: '□',
  image: '▧',
  alert: '!',
  edit: '✎',
  close: '×'
};

export function icon(name) {
  return ICONS[name] ?? '•';
}

export function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatMoney(value, currency = 'USD') {
  const amount = Number(value) || 0;

  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function pageHeader(title, description = '', action = '') {
  return `
    <header class="page-header">
      <div>
        <h1>${escapeHTML(title)}</h1>
        <p>${escapeHTML(description)}</p>
      </div>
      ${
        action
          ? `<button class="button button--primary" data-action="${escapeHTML(action)}">
              ${icon('plus')}
            </button>`
          : ''
      }
    </header>
  `;
}

export function emptyState(title, description = '', action = '') {
  return `
    <section class="empty-state">
      <div class="empty-state__icon">${icon('box')}</div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(description)}</p>
      ${
        action
          ? `<button class="button button--primary" data-action="${escapeHTML(action)}">
              Crear ahora
            </button>`
          : ''
      }
    </section>
  `;
}

export function statCard(label, value, tone = 'neutral') {
  const allowed = ['neutral', 'blue', 'green', 'orange', 'red', 'gold'];
  const safeTone = allowed.includes(tone) ? tone : 'neutral';

  return `
    <article class="stat-card stat-card--${safeTone}">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
    </article>
  `;
}

export function inventoryCard(inventory, productCount = 0, units = 0) {
  return `
    <article class="inventory-card">
      <div class="inventory-card__icon">${icon('inventory')}</div>
      <div class="inventory-card__content">
        <h3>${escapeHTML(inventory.name)}</h3>
        <p>${escapeHTML(inventory.description || 'Inventario de productos')}</p>
        <small>${productCount} productos · ${units} unidades</small>
      </div>
      <button
        class="button button--secondary"
        data-action="open-inventory"
        data-id="${Number(inventory.id)}"
      >Abrir</button>
    </article>
  `;
}

export function productCard(product) {
  const id = Number(product.id);
  const quantity = Math.max(0, Number(product.quantity) || 0);
  const price = Number(product.offerPrice) > 0 &&
    Number(product.offerPrice) < Number(product.price)
      ? product.offerPrice
      : product.price;

  const low = quantity <= Number(product.lowStockThreshold ?? 3);
  const photo = typeof product.photo === 'string' ? product.photo : '';

  return `
    <article class="product-card">
      <div class="product-card__image">
        ${
          photo
            ? `<img src="${escapeHTML(photo)}" alt="${escapeHTML(product.name)}">`
            : `<span>${icon('image')}</span>`
        }
      </div>
      <div class="product-card__content">
        <h3>${escapeHTML(product.name)}</h3>
        <p>${escapeHTML(product.category || 'Sin categoría')}</p>
        ${product.code ? `<small>${escapeHTML(product.code)}</small>` : ''}
        <strong>${escapeHTML(formatMoney(price, product.currency))}</strong>
        <span class="stock-badge ${low ? 'stock-badge--low' : 'stock-badge--ok'}">
          ${quantity} unidades
        </span>
        <div class="product-card__actions">
          <button class="button button--secondary" data-action="edit-product" data-id="${id}">Editar</button>
          <button class="button button--ghost" data-action="sell-product" data-id="${id}">Vender</button>
        </div>
      </div>
    </article>
  `;
}

export function renderInto(target, content) {
  const element = typeof target === 'string'
    ? document.querySelector(target)
    : target;

  if (!element) {
    throw new Error('No se encontró el contenedor de la interfaz.');
  }

  element.innerHTML = content;
  return element;
}
