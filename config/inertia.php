<?php

return [
    'ssr' => [
        'enabled' => (bool) env('INERTIA_SSR_ENABLED', true),
        'url' => env('INERTIA_SSR_URL', 'http://127.0.0.1:13714'),
        'ensure_bundle_exists' => true,
        'throw_on_error' => true,
    ],
    'pages' => ['ensure_pages_exist' => true, 'paths' => [resource_path('js/Pages')], 'extensions' => ['tsx']],
    'testing' => ['ensure_pages_exist' => true],
];
