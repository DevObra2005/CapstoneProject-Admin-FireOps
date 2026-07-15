<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_sessions', function (Blueprint $table) {
            $table->id();

            // WHO played — links to the participants table
            $table->foreignId('participant_id')
                  ->constrained('participants')
                  ->onDelete('cascade');

            // WHICH EVENT they were playing under
            $table->foreignId('event_id')
                  ->constrained('events')
                  ->onDelete('cascade');

            // WHICH SCENE they played
            // "office", "classroom", "kitchen"
            $table->string('environment');

            // Phase 1 — always true if they reached Phase 2
            // We store it anyway for completeness
            $table->boolean('phase1_completed')->default(false);

            // Phase 2 — seconds remaining on timer when they passed
            // Example: started with 90s, finished with 60s → score = 60
            $table->integer('phase2_score')->default(0);

            $table->integer('percentage_score')->default(0);
            
            $table->string('score_label')->default('Failed');

            // Total seconds lost to wrong actions across all steps
            // Example: -20s (wrong object) + -10s (wrong order) = 30
            $table->integer('total_penalties')->default(0);

            // Did they complete all steps before timer ran out?
            $table->boolean('phase2_passed')->default(false);

            // When they completed this session
            $table->timestamp('played_at')->useCurrent();

            // THREE GATES — Gate 3
            // Blocks duplicate passing records for the same
            // participant + event + environment combination
            $table->unique(['participant_id', 'event_id', 'environment']);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        // This runs if you ever do: php artisan migrate:rollback
        // It removes the table cleanly
        Schema::dropIfExists('game_sessions');
    }
};