<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rapport_chauffeurs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rapport_date_id')
                  ->constrained('rapport_dates')
                  ->onDelete('cascade');
            $table->string('equipe1')->nullable();
            $table->string('equipe2')->nullable();
            $table->string('code', 50)->nullable();
            $table->float('litres')->default(0);
            $table->float('pourcentage')->default(0);
            $table->string('activite')->nullable();
            $table->timestamps();

            $table->index('rapport_date_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rapport_chauffeurs');
    }
};
