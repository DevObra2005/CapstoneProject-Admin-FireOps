<?php

namespace App\Mail;

use App\Models\Event;
use App\Models\Participant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ParticipantCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Constructor property promotion — these become PUBLIC properties,
     * which means Blade can use them directly as $participant, $event,
     * and $plainPassword without us passing them via ->with().
     *
     * $plainPassword is nullable on purpose:
     *   - New account   → we pass the generated password
     *   - Existing user → we pass null, and the email omits credentials
     */
    public function __construct(
        public Participant $participant,
        public Event $event,
        public ?string $plainPassword = null
    ) {}

    /**
     * The envelope = the "outside" of the email (subject, sender, reply-to).
     * We change the subject depending on whether credentials are included,
     * so the recipient knows at a glance what the email is about.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->plainPassword
                ? 'Your FireOps Account and Event Registration'
                : 'You have been registered for a FireOps event',
        );
    }

 
    public function content(): Content
    {
        return new Content(
            view: 'emails.participant_credentials',
            with: [
                // Pre-filling the email means they only type passwords.
                // urlencode() protects the '+' in addresses like
                // juan+bfp@gmail.com, which would otherwise decode as a space.
                'changePasswordUrl' => rtrim(config('app.frontend_url'), '/')
                    . '/participant/change-password?email='
                    . urlencode($this->participant->email),
            ],
        );
    }
}