<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Mail\ManualCertificateMail;
use App\Models\ActivityLog;
use App\Models\ManualCertificate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

// ─────────────────────────────────────────────────────────────
// MANUAL CERTIFICATIONS — staff fill a form, the system saves the
// record, builds the PDF, and (optionally) emails it to the
// organization. Staff can also print it or resend it later.
//
// Separate from CertificateController, which lists certificates
// participants earn automatically by passing the simulation.
// ─────────────────────────────────────────────────────────────
class ManualCertificateController extends Controller
{
    /**
     * PROTECTED — List every manual certificate, newest first
     * Route: GET /api/staff/manual-certificates
     */
    public function index(): JsonResponse
    {
        $certs = ManualCertificate::with('creator')
            ->latest()
            ->get()
            ->map(fn (ManualCertificate $c) => $this->toArray($c));

        return response()->json($certs);
    }

    /**
     * PROTECTED — Create a certificate, and email it if asked
     * Route: POST /api/staff/manual-certificates
     *
     * send_email = true  → recipient_email is required and the PDF is sent
     * send_email = false → saved only, for print-only certificates
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recipient_name'     => 'required|string|max:255',
            // 350 characters fits the space between the name and the
            // "Given this..." line. not_regex blocks one "word" longer than
            // 40 characters (e.g. hhhhhhhh...), which can't wrap on the page.
            'message'            => ['required', 'string', 'max:350', 'not_regex:/\S{41,}/'],
            'given_date'         => 'required|date',
            'fire_marshal_name'  => 'required|string|max:255',
            'fire_marshal_title' => 'required|string|max:255',
            'send_email'         => 'boolean',
            // Only required when the "send" option is ticked
            'recipient_email'    => 'nullable|email|max:255|required_if_accepted:send_email',
        ], [
            'recipient_email.required_if_accepted' => 'Enter an email address to send the certificate to.',
            'message.max'                          => 'The message is too long to fit on the certificate (350 characters max).',
            'message.not_regex'                    => 'A word in the message is too long to fit on one line. Add spaces between words.',
        ]);

        // user_id comes from the logged-in staff, never from the form,
        // so nobody can issue a certificate "as" someone else.
        $cert = ManualCertificate::create([
            ...collect($validated)->except('send_email')->all(),
            'user_id' => $request->user()->id,
        ]);

        ActivityLog::log(
            action: 'created',
            description: 'Issued manual certificate ' . $cert->certificate_no
                . ' to ' . $cert->recipient_name,
            targetId: null,
            meta: [
                'manual_certificate_id' => $cert->id,
                'certificate_no'        => $cert->certificate_no,
                'recipient_name'        => $cert->recipient_name,
                'recipient_email'       => $cert->recipient_email,
            ]
        );

        // The record is saved first, THEN we try to email. If Gmail fails,
        // the certificate still exists and staff can press "Resend" later —
        // same rule as participant credential emails.
        $emailSent = null;   // null = not requested
        if ($request->boolean('send_email')) {
            $emailSent = $this->sendEmail($cert);
        }

        return response()->json([
            'message' => match ($emailSent) {
                true    => 'Certificate created and sent to ' . $cert->recipient_email . '.',
                false   => 'Certificate created, but the email failed to send. Try "Resend" from the list.',
                default => 'Certificate created.',
            },
            'email_sent'  => $emailSent,
            'certificate' => $this->toArray($cert->load('creator')),
        ], 201);
    }

    /**
     * PROTECTED — The certificate PDF, for viewing and printing
     * Route: GET /api/staff/manual-certificates/{manualCertificate}/pdf
     *
     * "inline" tells the browser to DISPLAY the PDF instead of downloading
     * it, so the React page can open it and print.
     */
    public function pdf(ManualCertificate $manualCertificate)
    {
        return response($this->renderPdf($manualCertificate), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $this->filename($manualCertificate) . '"',
        ]);
    }

    /**
     * PROTECTED — Send (or resend) the certificate by email
     * Route: POST /api/staff/manual-certificates/{manualCertificate}/send
     *
     * Staff may change the address here, e.g. to fix a typo or send it
     * to a different office of the same organization.
     */
    public function send(Request $request, ManualCertificate $manualCertificate): JsonResponse
    {
        $validated = $request->validate([
            'recipient_email' => 'required|email|max:255',
        ]);

        $manualCertificate->update(['recipient_email' => $validated['recipient_email']]);

        if (!$this->sendEmail($manualCertificate)) {
            return response()->json([
                'message' => 'The email could not be sent. Please try again in a moment.',
            ], 502);
        }

        return response()->json([
            'message'     => 'Certificate sent to ' . $manualCertificate->recipient_email . '.',
            'certificate' => $this->toArray($manualCertificate->load('creator')),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    /** Builds the PDF and returns the raw bytes. */
    private function renderPdf(ManualCertificate $cert): string
    {
        return Pdf::loadView('certificates.manual', ['cert' => $cert])
            ->setPaper('a4', 'landscape')
            ->output();
    }

    /**
     * Emails the PDF. Returns true on success, false on failure.
     * Never throws: a mail error is logged, not shown as a 500.
     */
    private function sendEmail(ManualCertificate $cert): bool
    {
        try {
            Mail::to($cert->recipient_email)->send(
                new ManualCertificateMail($cert, $this->renderPdf($cert))
            );
        } catch (\Throwable $e) {
            Log::error('Manual certificate email failed', [
                'manual_certificate_id' => $cert->id,
                'email'                 => $cert->recipient_email,
                'error'                 => $e->getMessage(),
            ]);
            return false;
        }

        // emailed_at is not in $fillable (the form must never set it),
        // so it is assigned directly here.
        $cert->emailed_at = now();
        $cert->save();

        ActivityLog::log(
            action: 'emailed',
            description: 'Emailed manual certificate ' . $cert->certificate_no
                . ' to ' . $cert->recipient_email,
            targetId: null,
            meta: [
                'manual_certificate_id' => $cert->id,
                'certificate_no'        => $cert->certificate_no,
                'recipient_email'       => $cert->recipient_email,
            ]
        );

        return true;
    }

    /** "BFP-Natividad-Certificate-Natividad-National-High-School.pdf" */
    private function filename(ManualCertificate $cert): string
    {
        $safe = trim(preg_replace('/[^A-Za-z0-9]+/', '-', $cert->recipient_name), '-');
        return 'BFP-Natividad-Certificate-' . $safe . '.pdf';
    }

    /** The shape React receives for one certificate. */
    private function toArray(ManualCertificate $c): array
    {
        return [
            'id'                 => $c->id,
            'certificate_no'     => $c->certificate_no,
            'recipient_name'     => $c->recipient_name,
            'recipient_email'    => $c->recipient_email,
            'message'            => $c->message,
            'given_date'         => $c->given_date->toDateString(),
            'fire_marshal_name'  => $c->fire_marshal_name,
            'fire_marshal_title' => $c->fire_marshal_title,
            'emailed_at'         => $c->emailed_at,
            'issued_by'          => $c->creator->full_name ?? 'Unknown',
            'created_at'         => $c->created_at,
        ];
    }
}