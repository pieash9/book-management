<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Book Management') }}</title>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=space-grotesk:400,500,700|dm-sans:400,500,700|jetbrains-mono:400,600" rel="stylesheet" />

        @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            @vite(['resources/css/app.css', 'resources/js/app.js'])
        @endif
    </head>
    <body>
        <div id="app">
            @unless (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
                <div style="padding: 2rem; font-family: 'DM Sans', sans-serif;">
                    Frontend assets are not built yet. Run <code>npm run build</code> or <code>npm run dev</code>.
                </div>
            @endunless
        </div>
    </body>
</html>
