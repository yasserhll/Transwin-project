<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SortieEntry extends Model
{
    protected $fillable = [
        'date',
        'heure',
        'code',
        'immatriculation',
        'litres',
        'chauffeur',
        'remarque',
    ];

    protected $casts = [
        'litres' => 'float',
    ];
}
