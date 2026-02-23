<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matricule_entries', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('matricule', 100)->nullable();
            $table->string('type', 50)->nullable();   // Camion | Citerne | Engin
            $table->timestamps();

            $table->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matricule_entries');
    }
};
