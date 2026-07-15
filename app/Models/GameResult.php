<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameResult extends Model
{
    // Tell Laravel which table this model belongs to
    protected $table = 'game_results';

    // Tell Laravel we only have created_at, not updated_at
    public $timestamps = false;
    protected $dates = ['created_at'];

    // These are the columns Laravel is allowed to fill
    protected $fillable = [
        'participant_id',
        'event_id',
        'score',
        'completion_time',
        'hazards_found',
        'completed',
    ];

    // --- RELATIONSHIPS ---

    // A game result belongs to one participant
    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    // A game result belongs to one event
    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}