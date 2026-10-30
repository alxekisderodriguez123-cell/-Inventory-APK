import { db } from './database.js';

const BACKUP_FORMAT = 'inventory-backup';
const BACKUP_VERSION = 1;

const TABLES = [
  'settings',
  'inventories',
  'products',
  'variants',
  'sales',
  'saleItems',
  'movements',
  'images',
  'categories'
];

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(',')[1] ?? '');
    };

    reader.onerror = () => reject(
      new Error('No se pudo leer una fotografía del respaldo.')
    );

    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, mimeType = 'application/octet-stream') {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

async function encodeValue(value) {
  if (value instanceof Blob) {
    return {
      __inventoryBlob: true,
      mimeType: value.type || 'application/octet-stream',
      data: await blobToBase64(value)
    };
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map(encodeValue));
  }

  if (value && typeof value === 'object') {
    const result = {};

    for (const [key, child] of Object.entries(value)) {
      result[key] = await encodeValue(child);
    }

    return result;
  }

  return value;
}

function decodeValue(value) {
  if (Array.isArray(value)) {
    return value.map(decodeValue);
  }

  if (value && typeof value === 'object') {
    if (value.__inventoryBlob === true) {
      if (typeof value.data !== 'string') {
        throw new Error('El archivo contiene una fotografía inválida.');
      }

      return base64ToBlob(value.data, value.mimeType);
    }

    const result = {};

    for (const [key, child] of Object.entries(value)) {
      result[key] = decodeValue(child);
    }

    return result;
  }

  return value;
}

export async function exportBackup() {
  const tables = {};

  for (const name of TABLES) {
    tables[name] = await db.table(name).toArray();
    tables[name] = await encodeValue(tables[name]);
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables
  };
}

export async function downloadBackup() {
  const backup = await exportBackup();
  const content = JSON.stringify(backup);
  const blob = new Blob([content], {
    type: 'application/json;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `inventory-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    filename: link.download,
    bytes: blob.size
  };
}

export async function importBackup(file, options = {}) {
  if (!file) {
    throw new Error('Selecciona un archivo de respaldo.');
  }

  if (file.size > 200 * 1024 * 1024) {
    throw new Error('El archivo supera el límite de 200 MB.');
  }

  const text = await file.text();
  let backup;

  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('El archivo no contiene JSON válido.');
  }

  if (
    backup?.format !== BACKUP_FORMAT ||
    backup?.version !== BACKUP_VERSION ||
    !backup.tables ||
    typeof backup.tables !== 'object'
  ) {
    throw new Error('El archivo no es compatible con esta versión de Inventory.');
  }

  const decoded = {};

  for (const name of TABLES) {
    const rows = backup.tables[name];

    if (!Array.isArray(rows)) {
      throw new Error(`Faltan datos válidos en la sección: ${name}.`);
    }

    decoded[name] = decodeValue(rows);
  }

  const replaceExisting = options.replaceExisting === true;

  if (replaceExisting && options.confirmReplace !== true) {
    throw new Error('Debes confirmar que deseas reemplazar los datos actuales.');
  }

  await db.transaction('rw', TABLES.map((name) => db.table(name)), async () => {
    if (replaceExisting) {
      for (const name of TABLES) {
        await db.table(name).clear();
      }
    }

    for (const name of TABLES) {
      if (decoded[name].length > 0) {
        await db.table(name).bulkPut(decoded[name]);
      }
    }
  });

  return {
    importedAt: new Date().toISOString(),
    inventories: decoded.inventories.length,
    products: decoded.products.length,
    sales: decoded.sales.length
  };
}
