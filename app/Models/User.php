<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'middle_name',
        'email',
        'password',
        'role',
        'is_active',   
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active'          => 'boolean',
        'email_verified_at'  => 'datetime',
        'password'           => 'hashed',
    ];
     // Accessor — lets you do $user->full_name anywhere in your code
    public function getFullNameAttribute(): string
    {
        $middle = $this->middle_name ? ' ' . $this->middle_name . ' ' : ' ';
        return $this->first_name . $middle . $this->last_name;
    }

    // Relationship — one user can have many activity logs they performed
    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class, 'performed_by');
    }

    // Relationship — one user can be the target of many activity logs
    public function targetedLogs()
    {
        return $this->hasMany(ActivityLog::class, 'target_user_id');
    }

    // Relationship — one user can have many game sessions (already exists)
    public function gameSessions()
    {
        return $this->hasMany(GameSession::class);
    }
}