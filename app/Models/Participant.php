<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Participant extends Model
{
    protected $fillable = [
        'event_id',
        'name',
        'email',
        'department',
        'contact_number',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}