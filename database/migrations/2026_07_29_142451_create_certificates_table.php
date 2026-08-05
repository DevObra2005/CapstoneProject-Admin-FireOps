<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_session_id')->constrained()->cascadeOnDelete();
            $table->string('environment');            // office, classroom, kitchen
            $table->string('verification_code')->unique();
            $table->timestamp('issued_at');
            $table->timestamps();

            // Mirrors the game_sessions rule — one certificate per
            // participant + event + environment, enforced by MySQL.
            $table->unique(['participant_id', 'event_id', 'environment'], 'cert_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};