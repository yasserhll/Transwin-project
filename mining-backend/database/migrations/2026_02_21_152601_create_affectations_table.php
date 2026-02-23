<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affectations', function (Blueprint $table) {
            $table->id();
            $table->string('equipe1')->nullable();
            $table->string('camion', 50);
            $table->string('equipe2')->nullable();
            $table->enum('type', ['camion', 'engin'])->default('camion');
            $table->string('date_affectation', 20)->nullable();
            $table->timestamps();

            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affectations');
    }
};
