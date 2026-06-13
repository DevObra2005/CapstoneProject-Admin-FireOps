<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')
                  ->constrained()
                  ->onDelete('cascade');         // Participant deleted if event is deleted
            $table->string('name');
            $table->string('email');
            $table->string('department')->nullable();
            $table->string('contact_number')->nullable();
            $table->timestamps();

            // Same email cannot register twice for the same event
            $table->unique(['event_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participants');
    }
};