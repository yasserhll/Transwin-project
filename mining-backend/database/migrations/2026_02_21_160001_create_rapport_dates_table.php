<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rapport_dates', function (Blueprint $table) {
            $table->id();
            $table->string('date', 20)->unique();   // format JJ/MM/AAAA
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rapport_dates');
    }
};
