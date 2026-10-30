import { db } from '../core/database.js';

function clean(value) {
  return String(value ?? '').trim();
}

function validateProduct(data) {
  const name = clean(data?.name);
  const price = Number(data?.price ?? 0);
  const quantity = Number(data?.quantity ?? 0);
  const threshold = Number(data?.lowStockThreshold ?? 3);
  const offerInput = data?.offerPrice;

  if (!name) {
    throw new Error('El nombre del producto es obligatorio.');
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error('El precio debe ser un número válido y no negativo.');
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('La cantidad debe ser un entero no negativo.');
  }

  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new Error('El límite de pocas existencias no es válido.');
  }

  let offerPrice = null;

  if (offerInput !== '' && offerInput != null) {
    offerPrice = Number(offerInput);

    if (
      !Number.isFinite(offerPrice) ||
      offerPrice < 0 ||
      offerPrice >= price
    ) {
      throw new Error('El precio de oferta debe ser válido y menor que el precio normal.');
    }
  }

  return {
    name,
    category: clean(data?.category),
    code: clean(data?.code),
    description: clean(data?.description),
    price,
    quantity,
    currency: clean(data?.currency) || 'USD',
    lowStockThreshold: Math.floor(threshold),
    offerPrice,
    photo: data?.photo ?? null
  };
}

export async function getProducts(inventoryId) {
  return db.products
    .where('inventoryId')
    .equals(Number(inventoryId))
    .toArray();
}

export async function getProduct(id) {
  return db.products.get(Number(id));
}

export async function createProduct(inventoryId, data) {
  const parentId = Number(inventoryId);
  const inventory = await db.inventories.get(parentId);

  if (!inventory) {
    throw new Error('Primero selecciona un inventario válido.');
  }

  const product = validateProduct(data);
  const now = new Date().toISOString();

  const record = {
    ...product,
    inventoryId: parentId,
    createdAt: now,
    updatedAt: now
  };

  let id;

  await db.transaction(
    'rw',
    [db.products, db.movements, db.inventories],
    async () => {
      id = await db.products.add(record);

      await db.movements.add({
        inventoryId: parentId,
        productId: id,
        variantId: null,
        type: 'initial',
        quantity: record.quantity,
        date: now,
        description: 'Registro inicial del producto'
      });

      await db.inventories.update(parentId, { updatedAt: now });
    }
  );

  return { id, ...record };
}

export async function updateProduct(id, changes) {
  const productId = Number(id);
  const current = await db.products.get(productId);

  if (!current) {
    throw new Error('No se encontró el producto.');
  }

  const merged = validateProduct({ ...current, ...changes });
  const now = new Date().toISOString();

  await db.transaction(
    'rw',
    [db.products, db.movements, db.inventories],
    async () => {
      await db.products.update(productId, {
        ...merged,
        updatedAt: now
      });

      if (merged.quantity !== current.quantity) {
        await db.movements.add({
          inventoryId: current.inventoryId,
          productId,
          variantId: null,
          type: 'adjustment',
          quantity: merged.quantity - current.quantity,
          date: now,
          description: 'Ajuste de existencias'
        });
      }

      await db.inventories.update(current.inventoryId, {
        updatedAt: now
      });
    }
  );

  return db.products.get(productId);
}

export async function deleteProduct(id) {
  const productId = Number(id);
  const product = await db.products.get(productId);

  if (!product) {
    throw new Error('No se encontró el producto.');
  }

  const soldItems = await db.saleItems
    .where('productId')
    .equals(productId)
    .count();

  if (soldItems > 0) {
    throw new Error(
      'Este producto tiene ventas registradas. No se puede eliminar sin afectar el historial.'
    );
  }

  await db.transaction(
    'rw',
    [db.products, db.variants, db.images, db.movements],
    async () => {
      await db.variants.where('productId').equals(productId).delete();
      await db.images.where('productId').equals(productId).delete();
      await db.movements.where('productId').equals(productId).delete();
      await db.products.delete(productId);
    }
  );
}

export async function getLowStockProducts(inventoryId) {
  const products = await getProducts(inventoryId);

  return products.filter(
    (product) => product.quantity <= product.lowStockThreshold
  );
}

export async function searchProducts(inventoryId, query = '') {
  const products = await getProducts(inventoryId);
  const normalize = (value) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .trim();

  const term = normalize(query);

  if (!term) {
    return products;
  }

  const words = term.split(/\s+/).filter(Boolean);

  function score(product) {
    const name = normalize(product.name);
    const code = normalize(product.code);
    const category = normalize(product.category);
    const description = normalize(product.description);

    if (name === term) return 100;
    if (code === term) return 95;
    if (name.startsWith(term)) return 85;
    if (code.startsWith(term)) return 80;

    let points = 0;

    for (const word of words) {
      if (name.includes(word)) points += 12;
      if (code.includes(word)) points += 10;
      if (category.includes(word)) points += 6;
      if (description.includes(word)) points += 3;
    }

    return points;
  }

  return products
    .map((product) => ({
      ...product,
      searchScore: score(product)
    }))
    .filter((product) => product.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);
}
