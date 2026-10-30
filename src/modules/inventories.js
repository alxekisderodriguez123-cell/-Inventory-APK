import { db } from '../core/database.js';

function cleanName(value) {
  return String(value ?? '').trim();
}

export async function getInventories() {
  return db.inventories.orderBy('updatedAt').reverse().toArray();
}

export async function getInventory(id) {
  return db.inventories.get(Number(id));
}

export async function createInventory(data) {
  const name = cleanName(data?.name);

  if (!name) {
    throw new Error('Escribe el nombre del inventario.');
  }

  const now = new Date().toISOString();

  const inventory = {
    name,
    description: cleanName(data?.description),
    createdAt: now,
    updatedAt: now
  };

  const id = await db.inventories.add(inventory);

  return { id, ...inventory };
}

export async function updateInventory(id, changes) {
  const inventoryId = Number(id);
  const current = await db.inventories.get(inventoryId);

  if (!current) {
    throw new Error('No se encontró ese inventario.');
  }

  const updated = { ...changes };

  if (Object.hasOwn(updated, 'name')) {
    updated.name = cleanName(updated.name);

    if (!updated.name) {
      throw new Error('El nombre no puede quedar vacío.');
    }
  }

  delete updated.id;
  delete updated.createdAt;
  updated.updatedAt = new Date().toISOString();

  await db.inventories.update(inventoryId, updated);

  return db.inventories.get(inventoryId);
}

export async function deleteInventory(id) {
  const inventoryId = Number(id);

  await db.transaction(
    'rw',
    [
      db.inventories,
      db.products,
      db.variants,
      db.sales,
      db.saleItems,
      db.movements,
      db.images
    ],
    async () => {
      const productIds = await db.products
        .where('inventoryId')
        .equals(inventoryId)
        .primaryKeys();

      const sales = await db.sales
        .where('inventoryId')
        .equals(inventoryId)
        .primaryKeys();

      await db.saleItems.where('saleId').anyOf(sales).delete();
      await db.variants.where('inventoryId').equals(inventoryId).delete();
      await db.images.where('productId').anyOf(productIds).delete();
      await db.movements.where('inventoryId').equals(inventoryId).delete();
      await db.products.where('inventoryId').equals(inventoryId).delete();
      await db.sales.where('inventoryId').equals(inventoryId).delete();
      await db.inventories.delete(inventoryId);
    }
  );
}
