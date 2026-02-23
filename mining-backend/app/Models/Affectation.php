<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Affectation extends Model
{
    protected $fillable = [
        'equipe1',
        'camion',
        'equipe2',
        'type',             // camion | engin
        'date_affectation',
    ];
}
