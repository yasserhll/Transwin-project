<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('citerne_entries', function (Blueprint $table) {
            $table->id();
            $table->string('source', 20);           // beng1 | beng2 | 81669
            $table->string('date', 20)->nullable();
            $table->string('heure', 10)->nullable();
            $table->float('qte_entree')->default(0);
            $table->string('fournisseur')->nullable();
            $table->string('num_bon', 100)->nullable();
            $table->string('code', 50)->nullable();
            $table->string('immatriculation', 50)->nullable();
            $table->float('kilometrage')->default(0);
            $table->float('qte_sortie')->default(0);
            $table->string('remarque', 500)->nullable();
            $table->float('serie_depart')->default(0);
            $table->float('serie_fin')->default(0);
            $table->timestamps();

            $table->index('source');
            $table->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('citerne_entries');
    }
};
