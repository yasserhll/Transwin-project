<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RapportDate;
use App\Models\RapportChauffeur;
use App\Models\RapportEngin;
use Illuminate\Http\Request;

class RapportController extends Controller
{
    // ─────────────────────────────────────────────────────────
    // DATES
    // ─────────────────────────────────────────────────────────

    // GET /api/rapports
    public function index()
    {
        return response()->json(
            RapportDate::with(['chauffeurs', 'engins'])
                ->orderBy('date')
                ->get()
        );
    }

    // POST /api/rapports  { date: "19/02/2026" }
    public function store(Request $request)
    {
        $request->validate(['date' => 'required|string|max:20']);
        $date = RapportDate::firstOrCreate(['date' => $request->input('date')]);
        return response()->json($date->load(['chauffeurs', 'engins']), 201);
    }

    // DELETE /api/rapports/{id}
    public function destroy($id)
    {
        // cascade supprime chauffeurs + engins automatiquement
        RapportDate::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    // ─────────────────────────────────────────────────────────
    // CHAUFFEURS
    // ─────────────────────────────────────────────────────────

    // POST /api/rapports/{id}/chauffeurs
    public function storeChauffeur(Request $request, $id)
    {
        $date = RapportDate::findOrFail($id);
        $data = $request->validate([
            'equipe1'     => 'nullable|string|max:255',
            'equipe2'     => 'nullable|string|max:255',
            'code'        => 'nullable|string|max:50',
            'litres'      => 'nullable|numeric|min:0',
            'pourcentage' => 'nullable|numeric|min:0',
            'activite'    => 'nullable|string|max:255',
        ]);

        $c = $date->chauffeurs()->create($data);
        return response()->json($c, 201);
    }

    // PUT /api/rapports/chauffeurs/{id}
    public function updateChauffeur(Request $request, $id)
    {
        $c = RapportChauffeur::findOrFail($id);
        $c->update($request->only([
            'equipe1','equipe2','code','litres','pourcentage','activite',
        ]));
        return response()->json($c);
    }

    // DELETE /api/rapports/chauffeurs/{id}
    public function destroyChauffeur($id)
    {
        RapportChauffeur::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    // POST /api/rapports/{id}/import-chauffeurs  { items: [...] }
    public function importChauffeurs(Request $request, $id)
    {
        $date = RapportDate::findOrFail($id);
        $request->validate(['items' => 'required|array']);
        $date->chauffeurs()->delete();
        foreach ($request->input('items', []) as $item) {
            $date->chauffeurs()->create($item);
        }
        return response()->json(['imported' => count($request->input('items', []))]);
    }

    // ─────────────────────────────────────────────────────────
    // ENGINS
    // ─────────────────────────────────────────────────────────

    // POST /api/rapports/{id}/engins
    public function storeEngin(Request $request, $id)
    {
        $date = RapportDate::findOrFail($id);
        $data = $request->validate([
            'equipe1'     => 'nullable|string|max:255',
            'equipe2'     => 'nullable|string|max:255',
            'engin'       => 'nullable|string|max:50',
            'litres'      => 'nullable|numeric|min:0',
            'pourcentage' => 'nullable|numeric|min:0',
            'heure'       => 'nullable|string|max:20',
            'affectation' => 'nullable|string|max:255',
        ]);

        $e = $date->engins()->create($data);
        return response()->json($e, 201);
    }

    // PUT /api/rapports/engins/{id}
    public function updateEngin(Request $request, $id)
    {
        $e = RapportEngin::findOrFail($id);
        $e->update($request->only([
            'equipe1','equipe2','engin','litres',
            'pourcentage','heure','affectation',
        ]));
        return response()->json($e);
    }

    // DELETE /api/rapports/engins/{id}
    public function destroyEngin($id)
    {
        RapportEngin::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    // POST /api/rapports/{id}/import-engins  { items: [...] }
    public function importEngins(Request $request, $id)
    {
        $date = RapportDate::findOrFail($id);
        $request->validate(['items' => 'required|array']);
        $date->engins()->delete();
        foreach ($request->input('items', []) as $item) {
            $date->engins()->create($item);
        }
        return response()->json(['imported' => count($request->input('items', []))]);
    }
}
