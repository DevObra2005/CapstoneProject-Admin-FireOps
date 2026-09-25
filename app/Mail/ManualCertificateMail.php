<?php

namespace App\Mail;

use App\Models\ManualCertificate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// ─────────────────────────────────────────────────────────────
// Sends a manually issued certificate to an organization's email.
// Same pattern as CertificateMail: the controller builds the PDF,
// passes the raw bytes in, and this class attaches them.
// ─────────────────────────────────────────────────────────────
class ManualCertificateMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ManualCertificate $cert,
        public string $pdfContent,   // raw PDF bytes from dompdf
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Certificate from BFP Natividad — ' . $this->cert->recipient_name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.manual_certificate',
        );
    }

    public function attachments(): array
    {
        // Clean filename: "BFP-Natividad-Certificate-Natividad-National-High-School.pdf"
        $safeName = trim(preg_replace('/[^A-Za-z0-9]+/', '-', $this->cert->recipient_name), '-');
        $filename = 'BFP-Natividad-Certificate-' . $safeName . '.pdf';

        return [
            Attachment::fromData(fn () => $this->pdfContent, $filename)
                ->withMime('application/pdf'),
        ];
    }
}