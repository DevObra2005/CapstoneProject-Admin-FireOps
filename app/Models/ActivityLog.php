<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = [
        'performed_by',
        'target_user_id',
        'action',
        'description',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

   public static function log(
        string $action,
        string $description,
        ?int $targetId = null,
        ?array $meta = null
    ): void {
        // Only log if someone is authenticated
        if (!auth()->check()) return;

        self::create([
            'performed_by'   => auth()->id(),
            'target_user_id' => $targetId,
            'action'         => $action,
            'description'    => $description,
            'meta'           => $meta,
        ]);
    }

    // Who performed the action
    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    // Who was targeted
    public function target()
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }
}