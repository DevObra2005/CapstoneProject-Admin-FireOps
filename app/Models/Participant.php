<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Participant extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'organization',
        'contact_number',
    ];

    // These fields are NEVER included in API responses
    // Even if someone calls ->toJson() or response()->json($participant)
    // password and remember_token will never appear
    protected $hidden = [
        'password',
        'remember_token',
    ];

    // Many-to-Many relationship with Event
    // Laravel automatically looks for the event_participant pivot table
    public function events()
    {
        return $this->belongsToMany(Event::class, 'event_participant')
                    ->withTimestamps(); // includes created_at from pivot (= registration date)
    }
    
    // One participant can have MANY game sessions
    // Usage: $participant->gameSessions → returns all their sessions
    public function gameSessions()
    {
        return $this->hasMany(GameSession::class);
    }
}