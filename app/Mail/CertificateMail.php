<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;

class CertificateMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $pdfContent,       // raw PDF bytes
        public string $participantName,
        public string $environment,
        public string $eventName,
        public int    $percentageScore,
        public string $scoreLabel,
        public string $verifyUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your FireOps Certificate — ' . ucfirst($this->environment),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.certificate',
        );
    }

    public function attachments(): array
    {
        // Build a clean filename: "FireOps-Certificate-Mark-Office.pdf"
        $safeName = preg_replace('/[^A-Za-z0-9]+/', '-', $this->participantName);
        $filename = 'FireOps-Certificate-' . $safeName . '-' . ucfirst($this->environment) . '.pdf';

        return [
            Attachment::fromData(fn () => $this->pdfContent, $filename)
                ->withMime('application/pdf'),
        ];
    }
}