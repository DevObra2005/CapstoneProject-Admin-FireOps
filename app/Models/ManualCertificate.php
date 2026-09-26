<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// ─────────────────────────────────────────────────────────────
// A certificate issued manually by staff through the
// "Manual Certifications" page — for a person or a whole
// organization. Separate from Certificate, which participants
// earn automatically by passing the Unity simulation.
// ─────────────────────────────────────────────────────────────
class ManualCertificate extends Model
{
    // Only these can be filled from a request. certificate_no and
    // emailed_at are set by the system, never by the form.
    protected $fillable = [
        'recipient_name',
        'message',
        'given_date',
        'fire_marshal_name',
        'fire_marshal_title',
        'recipient_email',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'given_date' => 'date',      // Carbon, so ->format() works
            'emailed_at' => 'datetime',
        ];
    }

    // The staff member who issued it.
    // 'user_id' is passed explicitly because the method is named
    // creator(): without it, Laravel would look for "creator_id".
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Runs automatically every time a certificate is created.
    // Gives it the next number for the current year:
    // MC-2026-0001, MC-2026-0002, ... and starts at 0001 again next year.
    protected static function booted(): void
    {
        static::creating(function (ManualCertificate $cert) {
            $year   = now()->year;
            $prefix = "MC-{$year}-";

            // Highest number used so far this year, e.g. "MC-2026-0007"
            $last = static::where('certificate_no', 'like', $prefix . '%')
                ->orderByDesc('certificate_no')
                ->value('certificate_no');

            $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

            // str_pad keeps 4 digits: 7 → "0007"
            $cert->certificate_no = $prefix . str_pad($next, 4, '0', STR_PAD_LEFT);
        });
    }
}