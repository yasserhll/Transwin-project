<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MatriculeEntry extends Model
{
    protected $fillable = [
        'code',
        'matricule',
        'type',   // Camion | Citerne | Engin
    ];
}
