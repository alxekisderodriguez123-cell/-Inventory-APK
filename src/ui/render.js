
const ICONS = {
  home: '⌂',
  inventory: '▤',
  sales: '↗',
  search: '⌕',
  settings: '⚙',
  plus: '+',
  back: '←',
  box: '▤',
  image: '▧',
  alert: '!',
  edit: '✎',
  close: '×',
  arrow: '›',
  check: '✓',
  package: '▣',
  chart: '▥',
  camera: '◎'
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
    return `${amount.toFixed(2)} ${escapeHTML(currency)}`;
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
        ${description ? `<p>${escapeHTML(description)}</p>` : ''}
      </div>

      ${
        action
          ? `
            <button
              type="button"
              class="button button--primary button--icon"
              data-action="${escapeHTML(action)}"
              aria-label="Añadir"
            >
              ${icon('plus')}
            </button>
          `
          : ''
      }
    </header>
  `;
}

export function emptyState(title, description = '', action = '') {
  return `
    <section class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">
        <span>${icon('box')}</span>
      </div>

      <h3>${escapeHTML(title)}</h3>

      ${description ? `<p>${escapeHTML(description)}</p>` : ''}

      ${
        action
          ? `
            <button
              type="button"
              class="button button--primary"
              data-action="${escapeHTML(action)}"
            >
              ${icon('plus')}
              Crear ahora
            </button>
          `
          : ''
      }
    </section>
  `;
}

export function statCard(label, value, tone = 'neutral') {
  const allowed = [
    'neutral',
    'blue',
    'green',
    'orange',
    'red',
    'gold',
    'warning'
  ];

  const safeTone = allowed.includes(tone) ? tone : 'neutral';

  return `
    <article class="stat-card stat-card--${safeTone}">
      <span class="stat-card__label">
        ${escapeHTML(label)}
      </span>

      <strong class="stat-card__value">
        ${escapeHTML(value)}
      </strong>
    </article>
  `;
}

export function inventoryCard(inventory, productCount = 0, units = 0) {
  const id = Number(inventory.id);

  return `
    <article class="inventory-card">
      <div class="inventory-card__icon" aria-hidden="true">
        ${icon('inventory')}
      </div>

      <div class="inventory-card__content">
        <h3 class="inventory-card__name">
          ${escapeHTML(inventory.name)}
        </h3>

        <p class="inventory-card__description">
          ${escapeHTML(
            inventory.description || 'Inventario de productos'
          )}
        </p>

        <div class="inventory-card__meta">
          <span class="badge badge--gold">
            ${Number(productCount) || 0} productos
          </span>

          <span class="badge">
            ${Number(units) || 0} unidades
          </span>
        </div>
      </div>

      <button
        type="button"
        class="button button--secondary"
        data-action="open-inventory"
        data-id="${id}"
        aria-label="Abrir inventario ${escapeHTML(inventory.name)}"
      >
        Abrir
        <span aria-hidden="true">${icon('arrow')}</span>
      </button>
    </article>
  `;
}

export function productCard(product) {
  const id = Number(product.id);

  const quantity = Math.max(
    0,
    Number(product.quantity) || 0
  );

  const normalPrice = Number(product.price) || 0;
  const offerPrice = Number(product.offerPrice) || 0;

  const hasOffer =
    offerPrice > 0 &&
    offerPrice < normalPrice;

  const price = hasOffer ? offerPrice : normalPrice;

  const threshold = Math.max(
    0,
    Number(product.lowStockThreshold ?? 3)
  );

  const isEmpty = quantity <= 0;
  const isLow = !isEmpty && quantity <= threshold;

  const stockClass = isEmpty
    ? 'stock-badge--empty'
    : isLow
      ? 'stock-badge--low'
      : 'stock-badge--normal';

  const stockLabel = isEmpty
    ? 'Agotado'
    : isLow
      ? `${quantity} disponibles · Stock bajo`
      : `${quantity} unidades`;

  const photo =
    typeof product.photo === 'string'
      ? product.photo
      : '';

  const safeName = escapeHTML(product.name || 'Producto');

  return `
    <article
      class="product-card"
      data-product-photo="${id}"
    >
      <button
        type="button"
        class="product-card__image"
        data-action="product-photo"
        data-id="${id}"
        aria-label="Ver fotografía de ${safeName}"
      >
        ${
          photo
            ? `
              <img
                src="${escapeHTML(photo)}"
                alt="${safeName}"
                loading="lazy"
              >
            `
            : `
              <span class="product-card__placeholder" aria-hidden="true">
                ${icon('image')}
              </span>
            `
        }
      </button>

      <div class="product-card__body">
        <div class="product-card__top">
          <div>
            <h3 class="product-card__title">
              ${safeName}
            </h3>

            <p class="product-card__category">
              ${escapeHTML(product.category || 'Sin categoría')}
            </p>
          </div>

          ${
            hasOffer
              ? `<span class="badge badge--warning">Oferta</span>`
              : ''
          }
        </div>

        ${
          product.code
            ? `
              <small class="product-card__code">
                Ref. ${escapeHTML(product.code)}
              </small>
            `
            : ''
        }

        <div class="product-card__price">
          <strong>${escapeHTML(formatMoney(price, product.currency))}</strong>

          ${
            hasOffer
              ? `
                <span class="product-card__old-price">
                  ${escapeHTML(formatMoney(normalPrice, product.currency))}
                </span>
              `
              : ''
          }
        </div>

        ${
          product.description
            ? `
              <p class="product-card__description">
                ${escapeHTML(product.description)}
              </p>
            `
            : ''
        }

        <span class="stock-badge ${stockClass}">
          ${escapeHTML(stockLabel)}
        </span>

        <div class="product-card__actions">
          <button
            type="button"
            class="button button--secondary"
            data-action="edit-product"
            data-id="${id}"
          >
            ${icon('edit')}
            Editar
          </button>

          <button
            type="button"
            class="button button--primary"
            data-action="sell-product"
            data-id="${id}"
            ${isEmpty ? 'disabled' : ''}
          >
            ${icon('sales')}
            Vender
          </button>
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
    throw new Error(
      'No se encontró el contenedor de la interfaz.'
    );
  }

  element.innerHTML = content;

  return element;
}
