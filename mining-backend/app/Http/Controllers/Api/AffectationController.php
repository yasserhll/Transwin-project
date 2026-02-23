<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Affectation;
use Illuminate\Http\Request;

class AffectationController extends Controller
{
    // GET /api/affectations
    public function index()
    {
        return response()->json(Affectation::orderBy('id')->get());
    }

    // POST /api/affectations
    public function store(Request $request)
    {
        $data = $request->validate([
            'equipe1'          => 'nullable|string|max:255',
            'camion'           => 'required|string|max:50',
            'equipe2'          => 'nullable|string|max:255',
            'type'             => 'nullable|in:camion,engin',
            'date_affectation' => 'nullable|string|max:20',
        ]);

        $entry = Affectation::create($data);
        return response()->json($entry, 201);
    }

    // PUT /api/affectations/{id}
    public function update(Request $request, $id)
    {
        $entry = Affectation::findOrFail($id);
        $entry->update($request->only([
            'equipe1', 'camion', 'equipe2', 'type', 'date_affectation',
        ]));
        return response()->json($entry);
    }

    // DELETE /api/affectations/{id}
    public function destroy($id)
    {
        Affectation::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    // POST /api/affectations/import  { items: [...] }
    public function import(Request $request)
    {
        $request->validate(['items' => 'required|array']);
        Affectation::truncate();
        foreach ($request->input('items', []) as $item) {
            Affectation::create($item);
        }
        return response()->json(['imported' => count($request->input('items', []))]);
    }
}
