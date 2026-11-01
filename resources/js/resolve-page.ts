import Bootstrap from './Pages/Bootstrap';

// Client and renderer share a fail-closed page registry.
export function resolvePage(name: string) {
  if (name !== 'Bootstrap') throw new Error(`Unknown Inertia page: ${name}`);
  return Bootstrap;
}
