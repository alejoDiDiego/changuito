<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class BootstrapController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Bootstrap', ['screen' => 'inicio']);
    }

    public function check(): Response
    {
        DB::selectOne('select 1 as ready');

        return Inertia::render('Bootstrap', ['screen' => 'verificación']);
    }
}
