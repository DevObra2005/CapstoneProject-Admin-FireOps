<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameSession extends Model
{
    // These are the columns Laravel is allowed to fill
    // when you call GameSession::create([...])
    // Think of it like a whitelist — only these columns
    // can be saved, nothing else sneaks in
    protected $fillable = [
        'participant_id',
        'event_id',
        'environment',
        'phase1_completed',
        'phase2_score',
        'percentage_score',
        'score_label',   
        'total_penalties',
        'phase2_passed',
        'played_at',
    ];

    // Tell Laravel which columns are true/false (boolean)
    // Without this, Laravel treats them as 0/1 integers
    // With this, PHP sees them as actual true/false values
    protected $casts = [
        'phase1_completed' => 'boolean',
        'phase2_passed'    => 'boolean',
        'played_at'        => 'datetime',
    ];

    // RELATIONSHIP — One session has MANY simulation steps
    // This is like saying "give me all the steps that belong
    // to this session"
    // Usage: $session->steps  → returns all SimulationStep rows
    // Think of it like a parent folder containing child files
    public function steps()
    {
        return $this->hasMany(SimulationStep::class, 'session_id');
    }

    // RELATIONSHIP — One session belongs to ONE participant
    // Usage: $session->participant → returns the Participant row
    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    // RELATIONSHIP — One session belongs to ONE event
    // Usage: $session->event → returns the Event row
    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}