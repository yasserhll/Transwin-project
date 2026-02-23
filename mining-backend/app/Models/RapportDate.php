<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RapportDate extends Model
{
    protected $fillable = ['date'];

    public function chauffeurs()
    {
        return $this->hasMany(RapportChauffeur::class);
    }

    public function engins()
    {
        return $this->hasMany(RapportEngin::class);
    }
}
