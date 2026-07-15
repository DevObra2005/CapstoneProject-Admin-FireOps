<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();

            // Who performed the action (superadmin)
            $table->foreignId('performed_by')
                  ->constrained('users')
                  ->cascadeOnDelete();

            // Which staff was affected (nullable — some logs may be general)
            $table->foreignId('target_user_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // What action was done
            // Examples: 'created', 'archived', 'restored', 'edited', 'viewed', 'login'
            $table->string('action');

            // Human-readable description
            // Example: "Created staff account for Juan Dela Cruz"
            $table->text('description');

            // Extra data if needed (like what fields changed during edit)
            $table->json('meta')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};