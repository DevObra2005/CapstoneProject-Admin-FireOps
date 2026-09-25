<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ─────────────────────────────────────────────────────────────
// Manual certificates — issued by staff through a form, for a
// person or a whole organization (e.g. a school after a fire
// safety seminar). Separate from the automatic certificates that
// participants earn by passing the Unity simulation.
// ─────────────────────────────────────────────────────────────
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manual_certificates', function (Blueprint $table) {
            $table->id();

            // Readable number for records and reprints, e.g. MC-2026-0001
            $table->string('certificate_no')->unique();

            // What appears on the certificate
            $table->string('recipient_name');
            $table->text('message');              // body text, supports **bold**
            $table->date('given_date');           // "Given this 24th day of July 2026"
            $table->string('fire_marshal_name');
            $table->string('fire_marshal_title');

            // Delivery. Email is optional because some certificates
            // are print-only. emailed_at stays null until a send succeeds.
            $table->string('recipient_email')->nullable();
            $table->timestamp('emailed_at')->nullable();

            // Which staff member issued it. nullOnDelete keeps the
            // certificate record even if that staff account is removed.
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manual_certificates');
    }
};