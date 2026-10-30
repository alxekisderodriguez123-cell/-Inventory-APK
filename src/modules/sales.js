import { db } from '../core/database.js';

function money(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Hay un precio inválido en la venta.');
  }

  return amount;
}

export async function createSale(inventoryId, items, options = {}) {
  const parentId = Number(inventoryId);

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Agrega al menos un producto a la venta.');
  }

  const paymentMethod = String(
    options.paymentMethod ?? 'otro'
  ).trim();

  const currency = String(options.currency ?? 'USD').trim();

  if (!paymentMethod || !currency) {
    throw new Error('Selecciona el método de pago y la moneda.');
  }

  return db.transaction(
    'rw',
    [
      db.inventories,
      db.products,
      db.sales,
      db.saleItems,
      db.movements
    ],
    async () => {
      const inventory = await db.inventories.get(parentId);

      if (!inventory) {
        throw new Error('No se encontró el inventario seleccionado.');
      }

      // Agrupar líneas repetidas del mismo producto.
      const grouped = new Map();

      for (const item of items) {
        const productId = Number(item.productId);
        const quantity = Number(item.quantity);

        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error(
            'Las cantidades vendidas deben ser enteros mayores que cero.'
          );
        }

        const key = productId;
        const previous = grouped.get(key);

        if (previous) {
          if (
            item.unitPrice != null &&
            Number(item.unitPrice) !== previous.requestedUnitPrice
          ) {
            throw new Error(
              'Un mismo producto no puede tener dos precios diferentes en esta venta.'
            );
          }

          previous.quantity += quantity;
        } else {
          grouped.set(key, {
            productId,
            quantity,
            requestedUnitPrice: item.unitPrice == null
              ? null
              : money(item.unitPrice)
          });
        }
      }

      const preparedItems = [];

      for (const item of grouped.values()) {
        const product = await db.products.get(item.productId);

        if (!product || product.inventoryId !== parentId) {
          throw new Error(
            'Uno de los productos no pertenece a este inventario.'
          );
        }

        if (product.quantity < item.quantity) {
          throw new Error(
            `No hay suficiente existencia de "${product.name}". Disponible: ${product.quantity}.`
          );
        }

        const defaultPrice =
          product.offerPrice != null &&
          product.offerPrice < product.price
            ? product.offerPrice
            : product.price;

        const unitPrice = money(
          item.requestedUnitPrice ?? defaultPrice
        );

        preparedItems.push({
          product,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity
        });
      }

      const now = new Date().toISOString();

      const total = preparedItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );

      const saleId = await db.sales.add({
        inventoryId: parentId,
        date: now,
        status: 'completed',
        paymentMethod,
        currency,
        total,
        itemCount: preparedItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        )
      });

      for (const item of preparedItems) {
        const remaining = item.product.quantity - item.quantity;

        await db.products.update(item.productId, {
          quantity: remaining,
          updatedAt: now
        });

        await db.saleItems.add({
          saleId,
          inventoryId: parentId,
          productId: item.productId,
          productName: item.product.name,
          variantId: null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          currency
        });

        await db.movements.add({
          inventoryId: parentId,
          productId: item.productId,
          variantId: null,
          type: 'sale',
          quantity: -item.quantity,
          date: now,
          description: `Venta #${saleId}`
        });
      }

      await db.inventories.update(parentId, {
        updatedAt: now
      });

      return {
        id: saleId,
        inventoryId: parentId,
        date: now,
        total,
        currency,
        paymentMethod,
        items: preparedItems.map((item) => ({
          productId: item.productId,
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal
        }))
      };
    }
  );
}

export async function getSalesHistory(inventoryId) {
  const sales = await db.sales
    .where('inventoryId')
    .equals(Number(inventoryId))
    .toArray();

  return sales.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getSaleDetails(saleId) {
  const sale = await db.sales.get(Number(saleId));

  if (!sale) {
    throw new Error('No se encontró esa venta.');
  }

  const items = await db.saleItems
    .where('saleId')
    .equals(Number(saleId))
    .toArray();

  return { ...sale, items };
}

export async function getInventoryMovements(inventoryId) {
  const movements = await db.movements
    .where('inventoryId')
    .equals(Number(inventoryId))
    .toArray();

  return movements.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
