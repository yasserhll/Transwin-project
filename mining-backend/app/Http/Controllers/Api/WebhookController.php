<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CiterneEntry;
use App\Models\SortieEntry;
use App\Models\MatriculeEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    private function authorize(Request $request): bool
    {
        $secret = env('WEBHOOK_SECRET', '');
        if (empty($secret)) return true;
        return $request->input('secret') === $secret;
    }

    // POST /api/webhook/sync
    public function sync(Request $request)
    {
        if (!$this->authorize($request)) {
            Log::warning('Webhook: tentative non autorisee', ['ip' => $request->ip()]);
            return response()->json(['error' => 'Non autorise'], 401);
        }

        $sheet = $request->input('sheet');
        $items = $request->input('items', []);

        if (!$sheet || !is_array($items)) {
            return response()->json(['error' => 'Parametres invalides'], 422);
        }

        Log::info('Webhook sync recu', [
            'sheet' => $sheet,
            'count' => count($items),
            'ip'    => $request->ip(),
        ]);

        $imported = match($sheet) {
            'beng1', 'beng2', '81669' => $this->syncCiterne($sheet, $items),
            'global'                  => $this->syncSorties($items),
            'matricule'               => $this->syncMatricules($items),
            default                   => 0,
        };

        return response()->json([
            'ok'        => true,
            'sheet'     => $sheet,
            'imported'  => $imported,
            'synced_at' => now()->toISOString(),
        ]);
    }

    private function syncCiterne(string $source, array $items): int
    {
        CiterneEntry::where('source', $source)->delete();
        foreach ($items as $item) {
            CiterneEntry::create([
                'source'          => $source,
                'date'            => $item['date']            ?? null,
                'heure'           => $item['heure']           ?? null,
                'qte_entree'      => $item['qte_entree']      ?? 0,
                'fournisseur'     => $item['fournisseur']     ?? null,
                'num_bon'         => $item['num_bon']         ?? null,
                'code'            => $item['code']            ?? null,
                'immatriculation' => $item['immatriculation'] ?? null,
                'kilometrage'     => $item['kilometrage']     ?? 0,
                'qte_sortie'      => $item['qte_sortie']      ?? 0,
                'remarque'        => $item['remarque']        ?? null,
                'serie_depart'    => $item['serie_depart']    ?? 0,
                'serie_fin'       => $item['serie_fin']       ?? 0,
            ]);
        }
        return count($items);
    }

    private function syncSorties(array $items): int
    {
        SortieEntry::truncate();
        foreach ($items as $item) {
            SortieEntry::create([
                'date'            => $item['date']            ?? null,
                'heure'           => $item['heure']           ?? null,
                'code'            => $item['code']            ?? null,
                'immatriculation' => $item['immatriculation'] ?? null,
                'litres'          => $item['litres']          ?? 0,
                'chauffeur'       => $item['chauffeur']       ?? null,
                'remarque'        => $item['remarque']        ?? null,
            ]);
        }
        return count($items);
    }

    private function syncMatricules(array $items): int
    {
        MatriculeEntry::truncate();
        foreach ($items as $item) {
            MatriculeEntry::create([
                'code'            => $item['code']            ?? null,
                'immatriculation' => $item['immatriculation'] ?? null,
            ]);
        }
        return count($items);
    }

    // GET /api/webhook/status
    public function status()
    {
        return response()->json([
            'status'      => 'ok',
            'server_time' => now()->toISOString(),
            'counts'      => [
                'citerne_beng1' => CiterneEntry::where('source', 'beng1')->count(),
                'citerne_beng2' => CiterneEntry::where('source', 'beng2')->count(),
                'citerne_81669' => CiterneEntry::where('source', '81669')->count(),
                'sorties'       => SortieEntry::count(),
                'matricules'    => MatriculeEntry::count(),
            ],
        ]);
    }
}
