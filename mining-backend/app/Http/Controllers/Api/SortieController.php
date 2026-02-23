<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SortieEntry;
use Illuminate\Http\Request;

class SortieController extends Controller
{
    // GET /api/sorties
    public function index()
    {
        return response()->json(SortieEntry::orderBy('id')->get());
    }

    // POST /api/sorties
    public function store(Request $request)
    {
        $data = $request->validate([
            'date'            => 'nullable|string|max:20',
            'heure'           => 'nullable|string|max:10',
            'code'            => 'nullable|string|max:50',
            'immatriculation' => 'nullable|string|max:50',
            'litres'          => 'nullable|numeric|min:0',
            'chauffeur'       => 'nullable|string|max:255',
            'remarque'        => 'nullable|string|max:500',
        ]);

        $entry = SortieEntry::create($data);
        return response()->json($entry, 201);
    }

    // PUT /api/sorties/{id}
    public function update(Request $request, $id)
    {
        $entry = SortieEntry::findOrFail($id);
        $entry->update($request->only([
            'date','heure','code','immatriculation',
            'litres','chauffeur','remarque',
        ]));
        return response()->json($entry);
    }

    // DELETE /api/sorties/{id}
    public function destroy($id)
    {
        SortieEntry::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    // POST /api/sorties/import  { items: [...] }
    public function import(Request $request)
    {
        $request->validate(['items' => 'required|array']);
        SortieEntry::truncate();
        foreach ($request->input('items', []) as $item) {
            SortieEntry::create($item);
        }
        return response()->json(['imported' => count($request->input('items', []))]);
    }

    // POST /api/sorties/reset
    public function reset()
    {
        SortieEntry::truncate();
        return response()->json(['ok' => true]);
    }
}
