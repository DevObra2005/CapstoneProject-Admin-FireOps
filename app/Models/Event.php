<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Event extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'description',
        'date',
        'location_name',
        'latitude',
        'longitude',
        'radius_meters',
        'is_open',
        'token',
    ];

    protected $casts = [
        'is_open'   => 'boolean',
        'latitude'  => 'float',
        'longitude' => 'float',
    ];

    /**
     * "Booted" is a Laravel lifecycle hook — it runs once when the model class loads.
     * We use "creating" event to auto-generate a token BEFORE the row is saved.
     * This means staff never has to think about tokens — it just happens automatically.
     */
    protected static function booted(): void
    {
        static::creating(function (Event $event) {
            // Str::random(32) generates a 32-character random string
            // e.g. "a8f3k92mxqB7tLpNdJcWrYeZvQsXhUo"
            // This becomes the secret part of the QR code URL
            $event->token = Str::random(32);
        });
    }

    /**
     * One event belongs to one staff member (user)
     * Usage: $event->staff
     */
    public function staff()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * One event has many participants
     * Usage: $event->participants
     */
    public function participants()
    {
        return $this->belongsToMany(Participant::class, 'event_participant')
                ->withTimestamps();
    }

}