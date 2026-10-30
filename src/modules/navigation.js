const VALID_SCREENS = new Set([
  'welcome',
  'setup',
  'home',
  'inventories',
  'inventory',
  'add-inventory',
  'edit-inventory',
  'add-product',
  'edit-product',
  'low-stock',
  'sales',
  'sales-history',
  'sale-details',
  'settings',
  'profile'
]);

let currentScreen = 'welcome';
let currentParams = {};
const listeners = new Set();

export function getCurrentScreen() {
  return currentScreen;
}

export function getCurrentParams() {
  return { ...currentParams };
}

export function navigateTo(screen, params = {}) {
  if (!VALID_SCREENS.has(screen)) {
    throw new Error(`Pantalla desconocida: ${screen}`);
  }

  const previousScreen = currentScreen;
  const previousParams = { ...currentParams };

  currentScreen = screen;
  currentParams = { ...params };

  const event = {
    screen: currentScreen,
    params: { ...currentParams },
    previousScreen,
    previousParams
  };

  for (const listener of [...listeners]) {
    listener(event);
  }

  return event;
}

export function subscribeToNavigation(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('El listener de navegación debe ser una función.');
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function resetNavigation(screen = 'welcome') {
  if (!VALID_SCREENS.has(screen)) {
    throw new Error(`Pantalla desconocida: ${screen}`);
  }

  return navigateTo(screen, {});
}
