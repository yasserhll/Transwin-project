<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RapportChauffeur extends Model
{
    protected $fillable = [
        'rapport_date_id',
        'equipe1',
        'equipe2',
        'code',
        'litres',
        'pourcentage',
        'activite',
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
