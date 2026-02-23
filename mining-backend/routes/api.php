<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\CiterneController;
use App\Http\Controllers\Api\SortieController;
use App\Http\Controllers\Api\MatriculeController;
use App\Http\Controllers\Api\AffectationController;
use App\Http\Controllers\Api\RapportController;

// ── PUBLIQUE ──────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);

// ── PROTÉGÉES (token requis) ──────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get ('/me',     [AuthController::class, 'me']);

    // Gestion utilisateurs (admin seulement — vérifié dans le controller)
    Route::get   ('/users',     [UserController::class, 'index']);
    Route::post  ('/users',     [UserController::class, 'store']);
    Route::put   ('/users/{id}',[UserController::class, 'update']);
    Route::delete('/users/{id}',[UserController::class, 'destroy']);

    // Citernes
    Route::get   ('/citernes',        [CiterneController::class, 'index']);
    Route::post  ('/citernes/import', [CiterneController::class, 'import']);
    Route::post  ('/citernes/reset',  [CiterneController::class, 'reset']);
    Route::post  ('/citernes',        [CiterneController::class, 'store']);
    Route::put   ('/citernes/{id}',   [CiterneController::class, 'update']);
    Route::delete('/citernes/{id}',   [CiterneController::class, 'destroy']);

    // Sorties
    Route::get   ('/sorties',        [SortieController::class, 'index']);
    Route::post  ('/sorties/import', [SortieController::class, 'import']);
    Route::post  ('/sorties/reset',  [SortieController::class, 'reset']);
    Route::post  ('/sorties',        [SortieController::class, 'store']);
    Route::put   ('/sorties/{id}',   [SortieController::class, 'update']);
    Route::delete('/sorties/{id}',   [SortieController::class, 'destroy']);

    // Matricules
    Route::get   ('/matricules',        [MatriculeController::class, 'index']);
    Route::post  ('/matricules/import', [MatriculeController::class, 'import']);
    Route::post  ('/matricules',        [MatriculeController::class, 'store']);
    Route::put   ('/matricules/{id}',   [MatriculeController::class, 'update']);
    Route::delete('/matricules/{id}',   [MatriculeController::class, 'destroy']);

    // Affectations
    Route::get   ('/affectations',        [AffectationController::class, 'index']);
    Route::post  ('/affectations/import', [AffectationController::class, 'import']);
    Route::post  ('/affectations',        [AffectationController::class, 'store']);
    Route::put   ('/affectations/{id}',   [AffectationController::class, 'update']);
    Route::delete('/affectations/{id}',   [AffectationController::class, 'destroy']);

    // Rapports
    Route::get   ('/rapports',     [RapportController::class, 'index']);
    Route::post  ('/rapports',     [RapportController::class, 'store']);
    Route::delete('/rapports/{id}',[RapportController::class, 'destroy']);

    Route::post  ('/rapports/{id}/chauffeurs',        [RapportController::class, 'storeChauffeur']);
    Route::put   ('/rapports/chauffeurs/{id}',        [RapportController::class, 'updateChauffeur']);
    Route::delete('/rapports/chauffeurs/{id}',        [RapportController::class, 'destroyChauffeur']);
    Route::post  ('/rapports/{id}/import-chauffeurs', [RapportController::class, 'importChauffeurs']);

    Route::post  ('/rapports/{id}/engins',        [RapportController::class, 'storeEngin']);
    Route::put   ('/rapports/engins/{id}',        [RapportController::class, 'updateEngin']);
    Route::delete('/rapports/engins/{id}',        [RapportController::class, 'destroyEngin']);
    Route::post  ('/rapports/{id}/import-engins', [RapportController::class, 'importEngins']);
});
