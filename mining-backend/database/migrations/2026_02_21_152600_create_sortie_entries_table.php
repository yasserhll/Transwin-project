<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sortie_entries', function (Blueprint $table) {
            $table->id();
            $table->string('date', 20)->nullable();
            $table->string('heure', 10)->nullable();
            $table->string('code', 50)->nullable();
            $table->string('immatriculation', 50)->nullable();
            $table->float('litres')->default(0);
            $table->string('chauffeur')->nullable();
            $table->string('remarque', 500)->nullable();
            $table->timestamps();

            $table->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sortie_entries');
    }
};
