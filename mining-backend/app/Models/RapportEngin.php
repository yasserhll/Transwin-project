<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RapportEngin extends Model
{
    protected $fillable = [
        'rapport_date_id',
        'equipe1',
        'equipe2',
        'engin',
        'litres',
        'pourcentage',
        'heure',
        'affectation',
    ];

    protected $casts = [
        'litres'      => 'float',
        'pourcentage' => 'float',
    ];

    public function rapportDate()
    {
        return $this->belongsTo(RapportDate::class);
    }
}
