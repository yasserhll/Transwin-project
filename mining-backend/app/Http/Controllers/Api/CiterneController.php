<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CiterneEntry;
use Illuminate\Http\Request;

class CiterneController extends Controller
{
    // GET /api/citernes?source=beng1
    public function index(Request $request)
    {
        $source = $request->query('source', 'beng1');
        return response()->json(
            CiterneEntry::where('source', $source)->orderBy('id')->get()
        );
    }

    // POST /api/citernes
    public function store(Request $request)
    {
        $data = $request->validate([
            'source'          => 'required|in:beng1,beng2,81669',
            'date'            => 'nullable|string|max:20',
            'heure'           => 'nullable|string|max:10',
            'qte_entree'      => 'nullable|numeric|min:0',
            'fournisseur'     => 'nullable|string|max:255',
            'num_bon'         => 'nullable|string|max:100',
            'code'            => 'nullable|string|max:50',
            'immatriculation' => 'nullable|string|max:50',
            'kilometrage'     => 'nullable|numeric|min:0',
            'qte_sortie'      => 'nullable|numeric|min:0',
            'remarque'        => 'nullable|string|max:500',
            'serie_depart'    => 'nullable|numeric|min:0',
            'serie_fin'       => 'nullable|numeric|min:0',
        ]);

        $entry = CiterneEntry::create($data);
        return response()->json($entry, 201);
    }

    // PUT /api/citernes/{id}
    public function update(Request $request, $id)
    {
        $entry = CiterneEntry::findOrFail($id);
        $entry->update($request->only([
            'date','heure','qte_entree','fournisseur','num_bon',
            'code','immatriculation','kilometrage','qte_sortie',
            'remarque','serie_depart','serie_fin','source',
        ]));
        return response()->json($entry);
    }

    // DELETE /api/citernes/{id}
    public function destroy($id)
    {
        CiterneEntry::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    // POST /api/citernes/import  { source, items: [...] }
    public function import(Request $request)
    {
        $request->validate([
            'source' => 'required|in:beng1,beng2,81669',
            'items'  => 'required|array',
        ]);

        $source = $request->input('source');
        $items  = $request->input('items', []);

        // Supprimer les anciennes entrées de cette source
        CiterneEntry::where('source', $source)->delete();

        foreach ($items as $item) {
            CiterneEntry::create(array_merge($item, ['source' => $source]));
        }

        return response()->json(['imported' => count($items)]);
    }

    // POST /api/citernes/reset  { source }
    public function reset(Request $request)
    {
        $request->validate(['source' => 'required|in:beng1,beng2,81669']);
        CiterneEntry::where('source', $request->input('source'))->delete();
        return response()->json(['ok' => true]);
    }
}
