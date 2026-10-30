import Dexie from 'dexie';

export const db = new Dexie('InventoryDatabaseV2');

db.version(1).stores({
  settings: '&key',
  inventories: '++id, name, createdAt, updatedAt',
  products: '++id, inventoryId, name, category, code, createdAt, updatedAt',
  variants: '++id, productId, inventoryId, size, color, code',
  sales: '++id, inventoryId, date, status',
  saleItems: '++id, saleId, productId, variantId',
  movements: '++id, inventoryId, productId, variantId, type, date',
  images: '++id, productId, createdAt',
  categories: '++id, name'
});

export async function getSetting(key, fallback = null) {
  const setting = await db.settings.get(key);
  return setting ? setting.value : fallback;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

export async function clearAllData() {
  const tables = [
    db.settings,
    db.inventories,
    db.products,
    db.variants,
    db.sales,
    db.saleItems,
    db.movements,
    db.images,
    db.categories
  ];

  await db.transaction('rw', tables, async () => {
    for (const table of tables) {
      await table.clear();
    }
  });
}
