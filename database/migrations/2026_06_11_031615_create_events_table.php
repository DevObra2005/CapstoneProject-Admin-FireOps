<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');         // If staff account deleted, their events are too
            $table->string('token')->unique();   // Secret QR token — generated automatically
            $table->string('name');              // Event name e.g. "Fire Safety Seminar Batch 1"
            $table->text('description')->nullable();
            $table->date('date');                // Event date — used for QR expiry check
            $table->string('location_name')->nullable(); // Human-readable e.g. "Vigan City Hall"
            $table->decimal('latitude', 10, 7)->nullable();  // GPS latitude of venue
            $table->decimal('longitude', 10, 7)->nullable(); // GPS longitude of venue
            $table->integer('radius_meters')->default(100);  // Allowed distance from venue (default 100m)
            $table->boolean('is_open')->default(true);  // Staff controls registration open/close
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};