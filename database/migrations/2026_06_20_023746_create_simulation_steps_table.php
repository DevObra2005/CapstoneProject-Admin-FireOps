<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('simulation_steps', function (Blueprint $table) {
            $table->id();

            // WHICH SESSION this action belongs to
            // Links back to game_sessions table
            // If a session is deleted, all its steps are deleted too
            $table->foreignId('session_id')
                  ->constrained('game_sessions')
                  ->onDelete('cascade');

            // WHICH STEP they were supposed to be doing
            // "SoundAlarm", "GrabExtinguisher",
            // "TPASS_Twist", "TPASS_Pull", "TPASS_Aim", "TPASS_Squeeze", "TPASS_Sweep",
            // "Evacuate"
            $table->string('step_name');

            // FOR TPASS SUB-STEPS ONLY
            // T=1, P=2, A=3, S=4, S=5
            // null for all other steps (SoundAlarm, Evacuate, etc.)
            $table->unsignedTinyInteger('sub_step')->nullable();

            // WHAT THEY ACTUALLY DID
            // Examples: "Phone", "FireTop", "Extinguisher", "ExitDoor"
            // This is a string we send from Unity describing the object tapped
            $table->string('chosen_action');

            // WAS IT THE CORRECT ACTION?
            // true = correct, false = wrong
            $table->boolean('was_correct');

            // HOW MANY SECONDS WERE DEDUCTED
            // 0 if correct, 10 or 20 if wrong
            $table->integer('penalty_seconds')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Runs during php artisan migrate:rollback
        // Must drop child table BEFORE parent (game_sessions)
        // because simulation_steps has a foreign key pointing to it
        Schema::dropIfExists('simulation_steps');
    }
};