<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'AppsTorrent Realtech') }} API</title>
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,600&display=swap" rel="stylesheet" />
        <style>
            body { font-family: 'Figtree', sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 1rem; max-width: 500px; width: 90%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; color: #38bdf8; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
            .badge { display: inline-block; background: #0369a1; color: #e0f2fe; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
        </style>
    </head>
    <body>
        <div class="card">
            <span class="badge">Laravel 11 API Backend</span>
            <h1>{{ config('app.name', 'AppsTorrent Realtech') }}</h1>
            <p>API Server is running successfully. Connect frontend clients via <code>/api</code> endpoints.</p>
        </div>
    </body>
</html>
