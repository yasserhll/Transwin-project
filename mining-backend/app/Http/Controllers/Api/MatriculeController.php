<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MatriculeEntry;
use Illuminate\Http\Request;

class MatriculeController extends Controller
{
    // GET /api/matricules
    public function index()
    {
        return response()->json(MatriculeEntry::orderBy('code')->get());
    }

    // POST /api/matricules
    public function store(Request $request)
    {
        $data = $request->validate([
            'code'      => 'required|string|max:50',
            'matricule' => 'nullable|string|max:100',
            'type'      => 'nullable|string|max:50',
        ]);

        $entry = MatriculeEntry::create($data);
        return response()->json($entry, 201);
    }

    // PUT /api/matricules/{id}
    public function update(Request $request, $id)
    {
        $entry = MatriculeEntry::findOrFail($id);
        $entry->update($request->only(['code', 'matricule', 'type']));
        return response()->json($entry);
    }

    // DELETE /api/matricules/{id}
    public function destroy($id)
    {
        MatriculeEntry::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    // POST /api/matricules/import  { items: [...] }
    public function import(Request $request)
    {
        $request->validate(['items' => 'required|array']);
        MatriculeEntry::truncate();
        foreach ($request->input('items', []) as $item) {
            MatriculeEntry::create($item);
        }
        return response()->json(['imported' => count($request->input('items', []))]);
    }
}
