import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { resolvePage } from './resolve-page';

void createInertiaApp({
  resolve: resolvePage,
  setup({ el, App, props }) {
    const tree = <App {...props} />;
    if (el.hasChildNodes()) hydrateRoot(el, tree);
    else createRoot(el).render(tree);
  },
});
