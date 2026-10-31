import '../styles.css';

import {
  getSetting,
  setSetting,
  clearAllData
} from './core/database.js';

import {
  getInventories,
  getInventory,
  createInventory,
  updateInventory
} from './modules/inventories.js';

import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  getLowStockProducts,
  searchProducts
} from './modules/products.js';

import {
  createSale,
  getSalesHistory,
  getSaleDetails,
  getInventoryMovements
} from './modules/sales.js';

import {
  downloadBackup,
  importBackup
} from './core/backup.js';

import {
  escapeHTML,
  formatMoney,
  formatDate,
  pageHeader,
  emptyState,
  statCard,
  inventoryCard,
  productCard,
  renderInto
} from './ui/render.js';

const $ = (selector, root = document) => root.querySelector(selector);

const state = {
  screen: 'loading',
  profile: null,
  inventories: [],
  activeInventoryId: null,
  editingProductId: null,
  busy: false,
  tutorialStep: 0
};

function toast(message, error = false) {
  const root = $('#toast-root');
  if (!root) return;

  const node = document.createElement('div');
  node.className = `toast ${error ? 'toast--error' : 'toast--success'}`;
  node.textContent = message;
  root.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

function reportError(error) {
  console.error(error);
  toast(error?.message || 'Ocurrió un error inesperado.', true);
}

function actionButton(label, action, extra = '') {
  return `<button type="button" class="button button--secondary" data-action="${action}" ${extra}>${label}</button>`;
}

function shell(content, active = 'home', navigation = true) {
  const name = state.profile?.ownerName || 'Mi cuenta';

  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark"><img src="./assets/inventory-logo.png" alt="Inventory"></div>
          <div>
            <p class="brand-name">Inventory</p>
            <p class="brand-caption">Tu negocio, bajo control</p>
          </div>
        </div>

        <button class="avatar-button" data-action="settings" aria-label="Configuración" title="Configuración">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2.8v2M12 19.2v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2.8 12h2m14.4 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
            <circle cx="12" cy="12" r="7.2"/>
          </svg>
        </button>
      </header>

      <main class="page-content">${content}</main>

      ${navigation ? `
        <nav class="bottom-nav" aria-label="Navegación principal">
          <button type="button" class="bottom-nav__item ${active === 'home' ? 'is-active' : ''}" data-action="home" ${active === 'home' ? 'aria-current="page"' : ''}>
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m3 10 9-7 9 7"/>
              <path d="M5 9v12h14V9"/>
              <path d="M9 21v-7h6v7"/>
            </svg>
            <span>Inicio</span>
          </button>

          <button type="button" class="bottom-nav__item ${active === 'inventories' ? 'is-active' : ''}" data-action="inventories" ${active === 'inventories' ? 'aria-current="page"' : ''}>
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <path d="M9 4v16M13 8h4M13 12h4M13 16h4"/>
            </svg>
            <span>Inventario</span>
          </button>

          <button type="button" class="bottom-nav__item ${active === 'sales-history' ? 'is-active' : ''}" data-action="sales-history" ${active === 'sales-history' ? 'aria-current="page"' : ''}>
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 3v18h18"/>
              <path d="m7 14 4-4 3 3 6-7"/>
              <path d="M15 6h5v5"/>
            </svg>
            <span>Ventas</span>
          </button>

          <button type="button" class="bottom-nav__item ${active === 'settings' ? 'is-active' : ''}" data-action="settings" ${active === 'settings' ? 'aria-current="page"' : ''}>
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-2 .9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-2-.9l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2.2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 2-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 2 .9l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2.1Z" transform="translate(-1 -1) scale(1.08)"/>
            </svg>
            <span>Ajustes</span>
          </button>
        </nav>
      ` : ''}
    </div>
  `;
}

function openModal(title, description, content, footer = '') {
  renderInto('#modal-root', `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal" role="dialog" aria-modal="true">
        <header class="modal__header">
          <div>
            <h2>${escapeHTML(title)}</h2>
            <p>${escapeHTML(description)}</p>
          </div>
          <button class="modal__close" data-action="close-modal" aria-label="Cerrar">×</button>
        </header>

        <div class="modal__body">${content}</div>

        ${footer ? `<footer class="modal__footer">${footer}</footer>` : ''}
      </section>
    </div>
  `);
}

function closeModal() {
  renderInto('#modal-root', '');
}

function showWelcome() {
  state.screen = 'welcome';

  renderInto('#app', `
    <div class="app-shell">
      <section class="welcome-screen">
        <div class="welcome-visual">
          <div class="welcome-visual__orb"><img src="./assets/inventory-logo.png" alt="Inventory"></div>
        </div>

        <span class="eyebrow">ORGANIZA · CONTROLA · CRECE</span>

        <h1>Tu inventario,<br><em>sin complicaciones.</em></h1>

        <p>
          Controla tus productos, existencias y ventas desde un solo lugar.
          Tus datos permanecen en este dispositivo.
        </p>

        <button class="button button--primary button--full" data-action="setup">
          Comenzar →
        </button>

        <p class="small muted">Privado por diseño · Sin crear una cuenta</p>
      </section>
    </div>
  `);
}

function showSetup() {
  state.screen = 'setup';

  renderInto('#app', `
    <div class="app-shell">
      <section class="welcome-screen">
        <span class="eyebrow">PRIMEROS PASOS</span>

        <h1>Vamos a preparar<br><em>tu espacio.</em></h1>

        <p>Completa estos datos para personalizar Inventory.</p>

        <form class="form-card" data-form="profile">
          <label>
            Tu nombre
            <input name="ownerName" maxlength="70" required placeholder="Tu nombre">
          </label>

          <label>
            Nombre del negocio
            <input name="businessName" maxlength="100" required placeholder="Nombre de tu negocio">
          </label>

          <label>
            Tipo de negocio
            <input name="businessType" maxlength="100" placeholder="Ej. Ropa y accesorios">
          </label>

          <label>
            Descripción
            <textarea name="businessDescription" maxlength="500" placeholder="Descripción opcional"></textarea>
          </label>

          <button class="button button--primary button--full" type="submit">
            Crear mi espacio
          </button>
        </form>
      </section>
    </div>
  `);
}

async function refreshData() {
  state.profile = await getSetting('profile', null);
  state.inventories = await getInventories();

  const savedId = Number(await getSetting('activeInventoryId', 0));
  const saved = state.inventories.find(item => item.id === savedId);

  state.activeInventoryId = saved?.id ?? state.inventories[0]?.id ?? null;

  if (state.activeInventoryId != null) {
    await setSetting('activeInventoryId', state.activeInventoryId);
  }
}

async function showHome() {
  state.screen = 'home';
  await refreshData();

  let productCount = 0;
  let units = 0;
  let lowCount = 0;
  let cards = '';
  let todaySales = 0;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  for (const inventory of state.inventories) {
    const products = await getProducts(inventory.id);
    const low = await getLowStockProducts(inventory.id);
    const sales = await getSalesHistory(inventory.id);

    productCount += products.length;
    units += products.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
    lowCount += low.length;

    todaySales += sales
      .filter(s => s.date?.slice(0, 10) === today)
      .reduce((sum, s) => sum + Number(s.total || 0), 0);

    cards += inventoryCard(
      inventory,
      products.length,
      products.reduce((sum, p) => sum + Number(p.quantity || 0), 0)
    );
  }

  const content = `
    <section class="dashboard-greeting">
      <span class="eyebrow">PANEL PRINCIPAL</span>

      <h1>¡Hola, ${escapeHTML(state.profile?.ownerName || 'bienvenido')}!</h1>

      <p>
        ${escapeHTML(state.profile?.businessName || 'Tu negocio')}
        · Resumen general.
      </p>
    </section>

    <section class="stats-grid">
      ${statCard('Inventarios', state.inventories.length, 'gold')}
      ${statCard('Productos', productCount, 'blue')}
      ${statCard('Unidades', units, 'green')}
      ${statCard('Stock bajo', lowCount, lowCount ? 'warning' : 'green')}
    </section>

    <section class="panel">
      <div class="panel__header">
        <div>
          <h2>Ventas de hoy</h2>
          <p>Resumen de las operaciones registradas.</p>
        </div>
      </div>

      <strong style="font-size:28px">
        ${escapeHTML(formatMoney(todaySales, 'USD'))}
      </strong>

      <p class="muted small">
        Importe sumado de las ventas registradas hoy.
      </p>

      <div class="inline-actions">
        ${actionButton('Historial de ventas', 'sales-history')}
        ${actionButton('Ver alertas', 'low-stock')}
      </div>
    </section>

    <div class="section-heading">
      <div>
        <h2>Tus inventarios</h2>
        <p>Organiza tus productos por colección.</p>
      </div>

      <button class="button button--primary button--icon" data-action="add-inventory">
        +
      </button>
    </div>

    <section class="inventory-list">
      ${cards || emptyState(
        'Aún no tienes inventarios',
        'Crea uno para empezar a registrar productos.',
        'add-inventory'
      )}
    </section>
  `;

  renderInto('#app', shell(content, 'home'));
}

async function showInventories() {
  state.screen = 'inventories';
  await refreshData();

  let cards = '';

  for (const inventory of state.inventories) {
    const products = await getProducts(inventory.id);

    cards += inventoryCard(
      inventory,
      products.length,
      products.reduce((sum, p) => sum + Number(p.quantity || 0), 0)
    );
  }

  renderInto('#app', shell(`
    ${pageHeader('Inventarios', 'Organiza tus productos.', 'add-inventory')}

    <section class="inventory-list">
      ${cards || emptyState(
        'Tu espacio está listo',
        'Crea tu primer inventario.',
        'add-inventory'
      )}
    </section>
  `, 'inventories'));
}

async function showInventory(id) {
  const inventory = await getInventory(id);

  if (!inventory) {
    toast('No se encontró ese inventario.', true);
    await showInventories();
    return;
  }

  state.screen = 'inventory';
  state.activeInventoryId = inventory.id;

  await setSetting('activeInventoryId', inventory.id);

  renderInto('#app', shell(`
    <div class="inline-actions">
      ${actionButton('← Inventarios', 'inventories')}
      ${actionButton('Editar inventario', 'edit-inventory', `data-id="${inventory.id}"`)}
    </div>

    ${pageHeader(
      inventory.name,
      inventory.description || 'Productos de este inventario.',
      'add-product'
    )}

    <div class="search-box">
      <span class="search-box__icon">⌕</span>

      <input
        id="product-search"
        type="search"
        placeholder="Buscar nombre, código o categoría..."
        autocomplete="off"
      >
    </div>

    <div class="section-heading">
      <h2>Productos</h2>
      <button class="text-button" data-action="low-stock">Ver stock bajo</button>
    </div>

    <section id="product-list" class="product-list">
      <p class="muted">Cargando productos...</p>
    </section>
  `, 'inventories'));

  await renderProductList('');
}

async function renderProductList(query) {
  const target = $('#product-list');

  if (!target || !state.activeInventoryId) return;

  const products = await searchProducts(state.activeInventoryId, query);

  if (!products.length) {
    renderInto(target, emptyState(
      query ? 'No encontramos coincidencias' : 'Todavía no hay productos',
      query ? 'Prueba con otro nombre o código.' : 'Agrega el primer producto.',
      query ? '' : 'add-product'
    ));

    return;
  }

  renderInto(target, products.map(product => {
    const html = productCard(product);
    const score = Number(product.searchScore || 0);

    const tone = score >= 80
      ? 'match'
      : score >= 20
        ? 'partial'
        : 'weak';

    return html.replace(
      'class="product-card"',
      `class="product-card product-card--${tone}"`
    );
  }).join(''));
}

function inventoryForm(inventory = null) {
  openModal(
    inventory ? 'Editar inventario' : 'Nuevo inventario',
    'Organiza tus productos como prefieras.',
    `
      <form id="inventory-form" data-form="inventory">
        <input type="hidden" name="id" value="${inventory?.id ?? ''}">

        <label>
          Nombre
          <input
            name="name"
            maxlength="100"
            required
            value="${escapeHTML(inventory?.name || '')}"
            placeholder="Ej. Ropa de mujer"
          >
        </label>

        <label>
          Descripción (opcional)
          <textarea name="description" maxlength="500">${escapeHTML(inventory?.description || '')}</textarea>
        </label>
      </form>
    `,
    `
      <button class="button button--secondary" data-action="close-modal">Cancelar</button>
      <button class="button button--primary" form="inventory-form" type="submit">Guardar</button>
    `
  );
}

function productForm(product = null) {
  state.editingProductId = product?.id ?? null;

  openModal(
    product ? 'Editar producto' : 'Nuevo producto',
    'Registra los datos y las existencias.',
    `
      <form id="product-form" data-form="product">
        <label>
          Nombre del producto
          <input
            name="name"
            maxlength="140"
            required
            value="${escapeHTML(product?.name || '')}"
            placeholder="Ej. Camisa clásica"
          >
        </label>

        <div class="form-grid">
          <label>
            Código o referencia
            <input
              name="code"
              maxlength="80"
              value="${escapeHTML(product?.code || '')}"
              placeholder="Opcional"
            >
          </label>

          <label>
            Categoría
            <input
              name="category"
              maxlength="80"
              value="${escapeHTML(product?.category || '')}"
              placeholder="Ej. Camisas"
            >
          </label>
        </div>

        <div class="form-grid">
          <label>
            Precio normal
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              value="${product?.price ?? ''}"
            >
          </label>

          <label>
            Precio de oferta
            <input
              name="offerPrice"
              type="number"
              min="0"
              step="0.01"
              value="${product?.offerPrice ?? ''}"
              placeholder="Opcional"
            >
          </label>
        </div>

        <div class="form-grid">
          <label>
            Cantidad disponible
            <input
              name="quantity"
              type="number"
              min="0"
              step="1"
              required
              value="${product?.quantity ?? 0}"
            >
          </label>

          <label>
            Alertar cuando queden
            <input
              name="lowStockThreshold"
              type="number"
              min="0"
              step="1"
              value="${product?.lowStockThreshold ?? 3}"
            >
          </label>
        </div>

        <label>
          Moneda
          <select name="currency">
            <option value="USD" ${product?.currency === 'USD' ? 'selected' : ''}>USD — Dólar</option>
            <option value="VES" ${product?.currency === 'VES' ? 'selected' : ''}>VES — Bolívar</option>
            <option value="USDT" ${product?.currency === 'USDT' ? 'selected' : ''}>USDT</option>
          </select>
        </label>

        <label>
          Descripción (opcional)
          <textarea name="description" maxlength="1000">${escapeHTML(product?.description || '')}</textarea>
        </label>

        <label>
          Foto del producto
          <input name="photoFile" type="file" accept="image/*">
        </label>

        ${product?.photo ? `
          <img
            id="product-photo-preview"
            class="photo-preview"
            src="${escapeHTML(product.photo)}"
            alt="Foto actual"
          >

          <button
            type="button"
            class="button button--ghost"
            data-action="remove-photo"
          >
            Quitar foto actual
          </button>
        ` : ''}

        <p class="form-help">
          La foto se guarda en este dispositivo. Se recomienda usar imágenes de menos de 8 MB.
        </p>
      </form>
    `,
    `
      <button class="button button--secondary" data-action="close-modal">Cancelar</button>
      <button class="button button--primary" form="product-form" type="submit">Guardar producto</button>
    `
  );
}

function sellForm(product) {
  const price = product.offerPrice != null &&
    Number(product.offerPrice) < Number(product.price)
      ? product.offerPrice
      : product.price;

  openModal(
    'Registrar venta',
    product.name,
    `
      <form id="sale-form" data-form="sale">
        <input type="hidden" name="productId" value="${product.id}">

        <p>Existencias disponibles: <strong>${product.quantity}</strong></p>

        <label>
          Cantidad a vender
          <input
            name="quantity"
            type="number"
            min="1"
            max="${product.quantity}"
            step="1"
            value="1"
            required
          >
        </label>

        <label>
          Precio por unidad (${escapeHTML(product.currency || 'USD')})
          <input
            name="unitPrice"
            type="number"
            min="0"
            step="0.01"
            value="${price}"
            required
          >
        </label>

        <label>
          Método de pago
          <select name="paymentMethod">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta / punto de venta</option>
            <option value="pago_movil">Pago móvil</option>
            <option value="USDT">USDT</option>
            <option value="otro">Otro</option>
          </select>
        </label>

        <p class="form-help">
          Al confirmar, la venta se guardará y el stock disminuirá automáticamente.
        </p>
      </form>
    `,
    `
      <button class="button button--secondary" data-action="close-modal">Cancelar</button>
      <button class="button button--primary" form="sale-form" type="submit">Confirmar venta</button>
    `
  );
}
function profileForm() {
  const profile = state.profile || {};

  openModal(
    'Perfil del negocio',
    'Actualiza los datos de tu espacio.',
    `
      <form id="profile-form" data-form="profile">
        <label>Tu nombre
          <input name="ownerName" maxlength="70" required value="${escapeHTML(profile.ownerName || '')}">
        </label>
        <label>Nombre del negocio
          <input name="businessName" maxlength="100" required value="${escapeHTML(profile.businessName || '')}">
        </label>
        <label>Tipo de negocio
          <input name="businessType" maxlength="100" value="${escapeHTML(profile.businessType || '')}">
        </label>
        <label>Descripción
          <textarea name="businessDescription" maxlength="500">${escapeHTML(profile.businessDescription || '')}</textarea>
        </label>
      </form>
    `,
    `
      <button class="button button--secondary" data-action="close-modal">Cancelar</button>
      <button class="button button--primary" form="profile-form" type="submit">Guardar</button>
    `
  );
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la fotografía.'));
    reader.readAsDataURL(file);
  });
}

async function handleFormSubmit(form) {
  const data = new FormData(form);
  const values = Object.fromEntries(data.entries());
  const type = form.dataset.form;

  if (type === 'profile') {
    const profile = {
      ownerName: String(values.ownerName || '').trim(),
      businessName: String(values.businessName || '').trim(),
      businessType: String(values.businessType || '').trim(),
      businessDescription: String(values.businessDescription || '').trim()
    };

    if (!profile.ownerName || !profile.businessName) {
      throw new Error('Completa tu nombre y el nombre del negocio.');
    }

    const isFirstProfile = !state.profile;
    await setSetting('profile', profile);
    state.profile = profile;
    closeModal();
    toast('Perfil guardado correctamente.');
    await showHome();

    if (isFirstProfile && !(await getSetting('tutorialSeen', false))) {
      await showTutorial(0);
    }
    return;
  }

  if (type === 'inventory') {
    const inventoryData = {
      name: String(values.name || '').trim(),
      description: String(values.description || '').trim()
    };

    const id = Number(values.id);

    if (id) {
      await updateInventory(id, inventoryData);
      toast('Inventario actualizado.');
      closeModal();
      await showInventory(id);
    } else {
      const created = await createInventory(inventoryData);
      await setSetting('activeInventoryId', created.id);
      state.activeInventoryId = created.id;
      toast('Inventario creado.');
      closeModal();
      await showInventory(created.id);
    }

    return;
  }

  if (type === 'product') {
    if (!state.activeInventoryId) {
      throw new Error('Selecciona primero un inventario.');
    }

    const photoInput = form.elements.photoFile;
    let photo = null;

    if (state.editingProductId) {
      const existing = await getProduct(state.editingProductId);
      photo = form.dataset.removePhoto === 'true'
        ? null
        : existing?.photo ?? null;
    }

    const photoFile = photoInput?.files?.[0];

    if (photoFile) {
      if (!photoFile.type.startsWith('image/')) {
        throw new Error('Selecciona un archivo de imagen válido.');
      }

      if (photoFile.size > 8 * 1024 * 1024) {
        throw new Error('La foto supera los 8 MB. Elige una más pequeña.');
      }

      photo = await fileToDataURL(photoFile);
    }

    const productData = {
      name: values.name,
      code: values.code,
      category: values.category,
      price: values.price,
      offerPrice: values.offerPrice,
      quantity: values.quantity,
      lowStockThreshold: values.lowStockThreshold,
      currency: values.currency,
      description: values.description,
      photo
    };

    if (state.editingProductId) {
      await updateProduct(state.editingProductId, productData);
      toast('Producto actualizado.');
    } else {
      await createProduct(state.activeInventoryId, productData);
      toast('Producto guardado.');
    }

    closeModal();
    await showInventory(state.activeInventoryId);
    return;
  }

  if (type === 'sale') {
    const productId = Number(values.productId);
    const quantity = Number(values.quantity);
    const unitPrice = Number(values.unitPrice);
    const product = await getProduct(productId);

    if (!product) {
      throw new Error('No se encontró el producto.');
    }

    await createSale(
      product.inventoryId,
      [{ productId, quantity, unitPrice }],
      {
        paymentMethod: values.paymentMethod,
        currency: product.currency || 'USD'
      }
    );

    closeModal();
    toast('Venta registrada y existencias actualizadas.');
    await showInventory(product.inventoryId);
    return;
  }
}

async function showLowStock() {
  state.screen = 'low-stock';
  await refreshData();

  let rows = '';

  for (const inventory of state.inventories) {
    const products = await getLowStockProducts(inventory.id);

    rows += products.map(product => `
      <article class="list-row">
        <div>
          <strong>${escapeHTML(product.name)}</strong>
          <p>${escapeHTML(inventory.name)}</p>
          <small>Quedan ${product.quantity} · Aviso en ${product.lowStockThreshold}</small>
        </div>
        <button class="button button--secondary" data-action="edit-product" data-id="${product.id}">Ver</button>
      </article>
    `).join('');
  }

  renderInto('#app', shell(`
    ${pageHeader('Stock bajo', 'Productos que necesitan reposición.')}
    <section class="panel">
      ${rows || emptyState('Todo en orden', 'No hay productos por debajo del nivel de alerta.')}
    </section>
  `, 'inventories'));
}

async function showSalesHistory() {
  state.screen = 'sales-history';
  await refreshData();

  let rows = '';
  let total = 0;

  for (const inventory of state.inventories) {
    const sales = await getSalesHistory(inventory.id);

    rows += sales.map(sale => {
      total += Number(sale.total || 0);

      return `
        <button class="sale-row" data-action="sale-details" data-id="${sale.id}">
          <span class="sale-row__icon">↗</span>
          <span class="sale-row__main">
            <strong>Venta #${sale.id}</strong>
            <small>${escapeHTML(inventory.name)} · ${escapeHTML(formatDate(sale.date))}</small>
            <small>${escapeHTML(sale.paymentMethod || 'otro')} · ${sale.itemCount || 0} unidades</small>
          </span>
          <strong>${escapeHTML(formatMoney(sale.total, sale.currency || 'USD'))}</strong>
        </button>
      `;
    }).join('');
  }

  renderInto('#app', shell(`
    ${pageHeader('Historial de ventas', 'Consulta las operaciones registradas.')}
    <section class="panel">
      <p class="muted">Ventas registradas: ${rows ? 'consulta cada operación' : 'todavía ninguna'}</p>
      <div class="sales-list">
        ${rows || emptyState('Sin ventas todavía', 'Cuando registres una venta, aparecerá aquí.')}
      </div>
    </section>
  `, 'sales-history'));
}

async function showSaleDetails(id) {
  const sale = await getSaleDetails(id);

  const items = sale.items.map(item => `
    <article class="list-row">
      <div>
        <strong>${escapeHTML(item.productName || 'Producto')}</strong>
        <p>${item.quantity} × ${escapeHTML(formatMoney(item.unitPrice, item.currency || sale.currency))}</p>
      </div>
      <strong>${escapeHTML(formatMoney(item.subtotal, item.currency || sale.currency))}</strong>
    </article>
  `).join('');

  openModal(
    `Venta #${sale.id}`,
    formatDate(sale.date),
    `
      <p>Método de pago: <strong>${escapeHTML(sale.paymentMethod || 'otro')}</strong></p>
      ${items}
      <div class="total-line">
        <span>Total</span>
        <strong>${escapeHTML(formatMoney(sale.total, sale.currency || 'USD'))}</strong>
      </div>
    `,
    `<button class="button button--primary" data-action="close-modal">Cerrar</button>`
  );
}

async function showSettings() {
  state.screen = 'settings';
  await refreshData();

  renderInto('#app', shell(`
    ${pageHeader('Configuración', 'Tu aplicación, tus datos y tus reglas.')}
    <section class="panel settings-panel">
      <div class="settings-profile">
        <div class="profile-avatar"><img src="./assets/inventory-logo.png" alt="Inventory"></div>
        <div>
          <strong>${escapeHTML(state.profile?.businessName || 'Mi negocio')}</strong>
          <p>${escapeHTML(state.profile?.ownerName || '')}</p>
        </div>
      </div>

      <button class="settings-row" data-action="tutorial">
        <span><strong>Ver tutorial</strong><small>Repasa cómo utilizar Inventory</small></span>
        <span>›</span>
      </button>

      <button class="settings-row" data-action="edit-profile">
        <span><strong>Perfil del negocio</strong><small>Nombre y datos básicos</small></span>
        <span>›</span>
      </button>

      <button class="settings-row" data-action="export-backup">
        <span><strong>Exportar copia de seguridad</strong><small>Guardar los datos en un archivo JSON</small></span>
        <span>›</span>
      </button>

      <button class="settings-row" data-action="choose-import">
        <span><strong>Importar copia de seguridad</strong><small>Restaurar datos desde un archivo JSON</small></span>
        <span>›</span>
      </button>

      <input id="backup-file" type="file" accept=".json,application/json" hidden>

      <div class="settings-warning">
        <strong>Zona de cuidado</strong>
        <p>Esta acción elimina los datos locales de la aplicación.</p>
        <button class="button button--danger" data-action="delete-all-data">Eliminar todos los datos</button>
      </div>

      <p class="settings-footnote">Inventory · Datos almacenados localmente en este dispositivo.</p>
    </section>
  `, 'settings'));
}

async function finishTutorial() {
  await setSetting('tutorialSeen', true);
  closeModal();
  toast('¡Listo! Ya conoces lo básico de Inventory.');
}

async function showTutorial(step = 0) {
  const steps = [
    {
      title: 'Tu panel principal',
      text: 'Aquí tienes el resumen de tu negocio: inventarios, productos, unidades y alertas de stock bajo. También puedes revisar las ventas del día.',
      tip: 'Usa Inicio para volver al resumen cuando quieras.'
    },
    {
      title: 'Inventarios y productos',
      text: 'Crea inventarios para organizar tu mercancía. Dentro de cada uno puedes registrar productos, fotos, precios, cantidades y códigos.',
      tip: 'La búsqueda te ayuda a encontrar rápidamente un producto mientras atiendes a tus clientes.'
    },
    {
      title: 'Registra tus ventas',
      text: 'Desde un producto puedes registrar una venta, indicar la cantidad y el método de pago. Inventory descuenta las unidades vendidas automáticamente.',
      tip: 'Consulta después cada operación en el Historial de ventas.'
    },
    {
      title: 'Alertas y copias de seguridad',
      text: 'Revisa Stock bajo para detectar productos que necesitan reposición. En Configuración puedes editar tu perfil, exportar tus datos o restaurar una copia.',
      tip: 'Tus datos se guardan localmente en este dispositivo. Exporta copias de seguridad periódicamente.'
    }
  ];

  const current = Math.max(0, Math.min(Number(step) || 0, steps.length - 1));
  state.tutorialStep = current;
  const item = steps[current];

  const progress = steps.map((_, index) =>
    '<span class="tutorial-progress__dot ' + (index <= current ? 'is-active' : '') + '"></span>'
  ).join('');

  openModal(
    'Conoce Inventory · ' + (current + 1) + ' de ' + steps.length,
    'Una guía rápida para empezar.',
    '<div class="tutorial-card">' +
      '<div class="tutorial-progress" aria-label="Progreso">' + progress + '</div>' +
      '<h3>' + item.title + '</h3>' +
      '<p>' + item.text + '</p>' +
      '<div class="tutorial-tip"><strong>Consejo</strong><p>' + item.tip + '</p></div>' +
    '</div>',
    '<button class="button button--ghost" data-action="tutorial-skip">Saltar</button>' +
    (current > 0 ? '<button class="button button--secondary" data-action="tutorial-prev">Atrás</button>' : '') +
    '<button class="button button--primary" data-action="tutorial-next">' +
      (current === steps.length - 1 ? 'Finalizar' : 'Siguiente') +
    '</button>'
  );
}

function showPhoto(product) {
  if (!product?.photo) {
    toast('Este producto no tiene una foto.', true);
    return;
  }

  openModal(
    product.name,
    'Fotografía del producto',
    `<div class="photo-viewer"><img src="${escapeHTML(product.photo)}" alt="${escapeHTML(product.name)}"></div>`,
    `<button class="button button--secondary" data-action="close-modal">Cerrar</button>`
  );
}

async function handleClick(action, element) {
  const id = Number(element.dataset.id);

  switch (action) {
    case 'setup':
      showSetup();
      break;

    case 'tutorial':
      await showTutorial(0);
      break;

    case 'tutorial-next':
      if (state.tutorialStep >= 3) await finishTutorial();
      else await showTutorial(state.tutorialStep + 1);
      break;

    case 'tutorial-prev':
      await showTutorial(state.tutorialStep - 1);
      break;

    case 'tutorial-skip':
      await finishTutorial();
      break;

    case 'retry-init':
      await init();
      break;

    case 'home':
      await showHome();
      break;

    case 'inventories':
      await showInventories();
      break;

    case 'sales-history':
      await showSalesHistory();
      break;

    case 'settings':
      await showSettings();
      break;

    case 'add-inventory':
      inventoryForm();
      break;

    case 'edit-inventory': {
      const inventory = await getInventory(id);
      if (inventory) inventoryForm(inventory);
      break;
    }

    case 'open-inventory':
      await showInventory(id);
      break;

    case 'add-product':
      productForm();
      break;

    case 'edit-product': {
      const product = await getProduct(id);
      if (product) {
        state.activeInventoryId = product.inventoryId;
        productForm(product);
      }
      break;
    }

    case 'sell-product': {
      const product = await getProduct(id);
      if (product) sellForm(product);
      break;
    }

    case 'low-stock':
      await showLowStock();
      break;

    case 'remove-photo': {
      const form = $('#product-form');
      if (form) {
        form.dataset.removePhoto = 'true';
        const preview = $('#product-photo-preview', form);
        if (preview) preview.remove();
        element.remove();
      }
      break;
    }

    case 'close-modal':
      closeModal();
      break;

    case 'backdrop-close':
      if (element.classList.contains('modal-backdrop')) closeModal();
      break;

    case 'edit-profile':
      profileForm();
      break;

    case 'product-photo': {
      const product = await getProduct(id);
      if (product) showPhoto(product);
      break;
    }

    case 'sale-details':
      await showSaleDetails(id);
      break;

    case 'export-backup':
      await downloadBackup();
      toast('Copia de seguridad preparada.');
      break;

    case 'choose-import':
      $('#backup-file')?.click();
      break;

    case 'delete-all-data':
      if (window.confirm('¿Seguro que quieres eliminar TODOS los inventarios, productos, ventas y ajustes? Esta acción no se puede deshacer.')) {
        await clearAllData();
        state.profile = null;
        state.inventories = [];
        state.activeInventoryId = null;
        state.editingProductId = null;
        closeModal();
        toast('Datos locales eliminados.');
        showWelcome();
      }
      break;
  }
}

document.addEventListener('click', async event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  if (action === 'backdrop-close') {
    if (event.target === target) closeModal();
    return;
  }

  try {
    await handleClick(action, target);
  } catch (error) {
    reportError(error);
  }
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;

  event.preventDefault();

  if (state.busy) return;
  state.busy = true;

  const submitButton = form.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  try {
    await handleFormSubmit(form);
  } catch (error) {
    reportError(error);
    if (submitButton) submitButton.disabled = false;
  } finally {
    state.busy = false;
  }
});

document.addEventListener('input', event => {
  if (event.target.id === 'product-search') {
    renderProductList(event.target.value);
  }
});

document.addEventListener('change', async event => {
  if (event.target.id !== 'backup-file') return;

  const file = event.target.files?.[0];
  if (!file) return;

  if (!window.confirm('Importar esta copia puede reemplazar los datos actuales. ¿Quieres continuar?')) {
    event.target.value = '';
    return;
  }

  try {
    await importBackup(file, {
      replaceExisting: true,
      confirmReplace: true
    });

    await refreshData();
    toast('Copia de seguridad importada.');
    await showHome();
  } catch (error) {
    reportError(error);
  } finally {
    event.target.value = '';
  }
});

async function init() {
  try {
    await refreshData();

    if (state.profile) {
      await showHome();
    } else {
      showWelcome();
    }
  } catch (error) {
    console.error(error);

    renderInto('#app', `
      <section class="error-screen">
        <div class="loading-mark">I<span>.</span></div>
        <h1>No pudimos iniciar Inventory</h1>
        <p>Ocurrió un problema al preparar la base de datos local.</p>
        <button class="button button--primary" data-action="retry-init">Intentar de nuevo</button>
      </section>
    `);
  }
}

init();
