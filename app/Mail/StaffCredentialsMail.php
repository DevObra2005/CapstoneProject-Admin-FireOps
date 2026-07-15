<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaffCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $staffName;
    public string $email;
    public string $plainPassword;

    public function __construct(string $staffName, string $email, string $plainPassword)
    {
        $this->staffName     = $staffName;
        $this->email         = $email;
        $this->plainPassword = $plainPassword;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your FireOps Staff Account Credentials',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.staff_credentials',
        );
    }
}