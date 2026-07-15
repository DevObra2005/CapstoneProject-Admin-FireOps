<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SimulationStep extends Model
{
    // Whitelist of columns Laravel can fill
    // when you call SimulationStep::create([...])
    protected $fillable = [
        'session_id',
        'step_name',
        'sub_step',
        'chosen_action',
        'was_correct',
        'penalty_seconds',
    ];

    // Tell Laravel which columns are true/false
    // and which are numbers
    protected $casts = [
        'was_correct'     => 'boolean',
        'penalty_seconds' => 'integer',
        'sub_step'        => 'integer',
    ];

    // RELATIONSHIP — One step belongs to ONE session
    // Usage: $step->session → returns the GameSession row
    // This is the reverse of hasMany above
    // Think of it like a child file knowing which folder it's in
    public function session()
    {
        return $this->belongsTo(GameSession::class, 'session_id');
    }
}