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

            // WHICH TRY this was — 1, 2, 3...
            // Counted per participant + event + environment.
            // The controller computes this as (existing count + 1)
            // right before saving.
            $table->unsignedInteger('attempt_number')->default(1);

            // OFFLINE RESULTS — duplicate protection.
            // A UUID Unity creates once per finished run and sends with the
            // result. If the internet drops AFTER this row was saved but
            // BEFORE Unity got the answer, Unity uploads the same run again
            // from its outbox; submitResult finds this ID and returns the
            // original result instead of saving a second row.
            //
            // UNIQUE is the real guard: two copies arriving at the same
            // instant can both pass the controller's check, but the database
            // refuses the second row. NULLABLE so runs sent by older app
            // versions (no ID) still save — MySQL allows many NULLs in a
            // unique column.
            $table->uuid('participant_attempt_id')->nullable()->unique();

            // Phase 1 — always true if they reached Phase 2
            $table->boolean('phase1_completed')->default(false);

            // Phase 2 — seconds remaining on the timer at the end.
            // 0 on a timeout failure.
            $table->integer('phase2_score')->default(0);

            $table->integer('percentage_score')->default(0);

            $table->string('score_label')->default('Failed');

            // Total seconds lost to wrong actions across all steps
            $table->integer('total_penalties')->default(0);

            // Did the timer survive? false = ran out of time.
            $table->boolean('phase2_passed')->default(false);

            // OVERALL RESULT — the column every stat query filters on.
            // Not the same as phase2_passed:
            //   phase2_passed → timer did not hit zero
            //   passed        → timer OK AND percentage >= 50
            // A run can have phase2_passed = true but passed = false
            // (finished in time, too many mistakes).
            $table->boolean('passed')->default(false);

            // null on a pass. "timeout" or "low_score" on a failure.
            // Drives the label in the admin attempt table.
            $table->string('fail_reason', 20)->nullable();

            // When they completed this session.
            // OFFLINE RESULTS: newer Unity builds send the time the run
            // finished on the phone, so a run uploaded late keeps its real
            // date. useCurrent() is the fallback for older builds.
            $table->timestamp('played_at')->useCurrent();

            // NO UNIQUE CONSTRAINT — multiple attempts are the point now.
            // A plain index instead: speeds up the attempt-count lookup
            // and the per-participant history query, without blocking
            // duplicate rows.
            $table->index(['participant_id', 'event_id', 'environment']);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_sessions');
    }
};