<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CiterneEntry extends Model
{
    protected $fillable = [
        'source',         // beng1 | beng2 | 81669
        'date',
        'heure',
        'qte_entree',
        'fournisseur',
        'num_bon',
        'code',
        'immatriculation',
        'kilometrage',
        'qte_sortie',
        'remarque',
        'serie_depart',
        'serie_fin',
    ];

    protected $casts = [
        'qte_entree'   => 'float',
        'kilometrage'  => 'float',
        'qte_sortie'   => 'float',
        'serie_depart' => 'float',
        'serie_fin'    => 'float',
    ];
}
