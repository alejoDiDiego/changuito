import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { renderToString } from 'react-dom/server';
import { resolvePage } from './resolve-page';

createServer(
  page => createInertiaApp({
    page,
    render: renderToString,
    resolve: resolvePage,
    setup: ({ App, props }) => <App {...props} />,
  }),
  { port: 13714, host: process.env.SSR_HOST ?? '127.0.0.1' },
);
