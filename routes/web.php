<?php

use App\Http\Controllers\BootstrapController;
use Illuminate\Support\Facades\Route;

Route::get('/', [BootstrapController::class, 'index']);
Route::get('/bootstrap/check', [BootstrapController::class, 'check']);
