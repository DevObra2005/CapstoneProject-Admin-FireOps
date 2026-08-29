<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Mail\ParticipantCredentialsMail;
use App\Models\ActivityLog;
use App\Models\Event;
use App\Models\Participant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ParticipantController extends Controller
{

    /**
     * PROTECTED — List participants for an event
     * Route: GET /api/staff/events/{eventId}/participants
     */
    public function index(Request $request, $eventId)
    {
        $event = Event::where('id', $eventId)->firstOrFail();

        $participants = $event->participants()
                              ->withPivot('created_at')
                              ->orderBy('event_participant.created_at', 'desc')
                              ->get()
                              ->map(function ($participant) {
                                  return [
                                      'id'             => $participant->id,
                                      'name'           => $participant->name,
                                      'email'          => $participant->email,
                                      'organization'   => $participant->organization,
                                      'contact_number' => $participant->contact_number,
                                      'created_at'     => $participant->pivot->created_at,
                                  ];
                              });

        return response()->json($participants);
    }

    /**
     * PROTECTED — Staff manually adds a participant to an event
     * Route: POST /api/staff/events/{eventId}/participants
     *
     * Unlike the public QR route, this one:
     *   - does NOT require the event to be open (staff override)
     *   - does NOT ask for a password (staff is already authenticated)
     *   - GENERATES a password for brand new accounts and emails it
     */
    public function storeManual(Request $request, $eventId)
    {
        $event = Event::where('id', $eventId)->firstOrFail();

        // organization is REQUIRED here because the DB column is NOT NULL.
        //
        // contact_number uses ARRAY syntax, not a pipe string. A regex
        // inside a pipe-delimited rule would be split at any '|' in the
        // pattern. The second argument gives a message that actually
        // tells the user what the right format is.
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|email|max:255',
            'organization'   => 'required|in:Employee,Student',
            'contact_number' => ['nullable', 'regex:/^09\d{9}$/'],
        ], [
            'contact_number.regex' => 'Contact number must be 11 digits starting with 09 (e.g. 09171234567).',
        ]);

        $participant   = Participant::where('email', $validated['email'])->first();
        $plainPassword = null;   // stays null unless we create a new account
        $status        = null;   // tells the frontend which of the 3 cases happened

        if ($participant) {

            // ── CASE 3: account exists AND is already in this event ──────────
            $alreadyJoined = $participant->events()
                                         ->where('event_id', $event->id)
                                         ->exists();

            if ($alreadyJoined) {
                return response()->json([
                    'message' => "{$participant->name} is already registered for this event.",
                    'status'  => 'duplicate',
                ], 409); // 409 Conflict
            }

            // ── CASE 2: account exists but is NOT in this event ──────────────
            // Enroll only. We deliberately do NOT generate a new password —
            // that would silently break the login they already use.
            $participant->events()->attach($event->id);
            $status = 'enrolled_existing';

        } else {

            // ── CASE 1: brand new email ──────────────────────────────────────
            $plainPassword = $this->generateReadablePassword();

            $participant = Participant::create([
                'name'           => $validated['name'],
                'email'          => $validated['email'],
                'password'       => Hash::make($plainPassword),
                'organization'   => $validated['organization'],
                'contact_number' => $validated['contact_number'] ?? null,
            ]);

            $participant->events()->attach($event->id);
            $status = 'created_new';
        }

        // ── SEND THE EMAIL ───────────────────────────────────────────────────
        // Wrapped in try/catch on purpose. If Gmail SMTP fails, the participant
        // still exists in the database — we just report that the mail failed.
        // Losing the account because an SMTP connection timed out would be worse.
        $emailSent = true;

        try {
            Mail::to($participant->email)->send(
                new ParticipantCredentialsMail($participant, $event, $plainPassword)
            );
        } catch (\Throwable $e) {
            $emailSent = false;
            Log::error('Participant credential email failed', [
                'participant_id' => $participant->id,
                'event_id'       => $event->id,
                'error'          => $e->getMessage(),
            ]);
        }

        // ── ACTIVITY LOG ─────────────────────────────────────────────────────
        // targetId is NULL on purpose. target_user_id is a foreign key into
        // the USERS table — passing a participant ID there would make this log
        // appear on an unrelated staff member's detail page.
        // Participant identity goes in meta instead.
        ActivityLog::log(
            action: $status === 'created_new' ? 'created' : 'registered',
            description: $status === 'created_new'
                ? 'Created participant account for ' . $participant->name
                    . ' and added them to ' . $event->name
                : 'Added existing participant ' . $participant->name
                    . ' to ' . $event->name,
            targetId: null,
            meta: [
                'participant_id'    => $participant->id,
                'participant_name'  => $participant->name,
                'participant_email' => $participant->email,
                'organization'      => $participant->organization,
                'event_id'          => $event->id,
                'event_name'        => $event->name,
                'method'            => 'manual',
                'email_sent'        => $emailSent,
            ]
        );

        return response()->json([
            'message'     => $status === 'created_new'
                                ? 'Participant account created and added to this event.'
                                : 'Existing participant added to this event.',
            'status'      => $status,
            'email_sent'  => $emailSent,
            'participant' => [
                'id'             => $participant->id,
                'name'           => $participant->name,
                'email'          => $participant->email,
                'organization'   => $participant->organization,
                'contact_number' => $participant->contact_number,
            ],
        ], 201);
    }

    /**
     * Generates a password that is safe to type on a phone keyboard.
     *
     * Excluded characters: I, O, 0, 1 — these are visually ambiguous and
     * cause "wrong password" failures that look like application bugs.
     *
     * random_int() is cryptographically secure (unlike rand()), which matters
     * because this string is the only thing protecting the account.
     */
    private function generateReadablePassword(int $length = 10): string
    {
        $characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $max        = strlen($characters) - 1;
        $password   = '';

        for ($i = 0; $i < $length; $i++) {
            $password .= $characters[random_int(0, $max)];
        }

        return $password;
    }

    /**
     * PROTECTED — Download a blank import template
     * Route: GET /api/staff/participants/import-template
     *
     * Generates the .xlsx in memory and streams it straight to the browser.
     * Nothing is written to disk, so there's no temp file to clean up.
     */
    public function importTemplate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Participants');

        // Header row — these names must match what the parser expects
        $sheet->fromArray(
            [['name', 'email', 'organization', 'contact_number']],
            null,
            'A1'
        );

        // Two example rows so staff can see the expected format
        $examples = [
            ['Juan Dela Cruz',  'juan.delacruz@example.com', 'Employee'],
            ['Maria Santos',    'maria.santos@example.com',  'Student'],
        ];
        $sheet->fromArray($examples, null, 'A2');

        // Contact numbers must be written as TEXT, not numbers.
        // Excel treats 09171234567 as a numeric value and strips the leading
        // zero, turning it into 9171234567. setCellValueExplicit() with
        // DataType::TYPE_STRING forces Excel to preserve it exactly.
        $sheet->setCellValueExplicit('D2', '09171234567', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('D3', '09281234567', DataType::TYPE_STRING);
        
        // Force the ENTIRE contact_number column to text format.
        //
        // getStyle('D2:D500') would work but instantiates 500 empty
        // cells, inflating the sheet dimensions so toArray() returns
        // 500 rows. getDefaultColumnDimension() sets the column's
        // default style without creating any cells, so rows staff
        // types later inherit text format and keep their leading zero.
        $spreadsheet->getDefaultStyle()->getNumberFormat()->setFormatCode('General');

        $sheet->getStyle('D')
              ->getNumberFormat()
              ->setFormatCode('@');

        // Bold header, auto-sized columns
        $sheet->getStyle('A1:D1')->getFont()->setBold(true);
        foreach (['A', 'B', 'C', 'D'] as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);

        // streamDownload() sends the file without ever saving it server-side.
        // 'php://output' is a special stream that writes to the HTTP response.
        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'fireops_participant_template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * PROTECTED — Parse an uploaded file and report what WOULD happen
     * Route: POST /api/staff/events/{eventId}/participants/import/preview
     *
     * Writes nothing. Sends no email. Purely a dry run so staff can
     * catch typos before any account is created.
     */
    public function previewImport(Request $request, $eventId)
    {
        $event = Event::where('id', $eventId)->firstOrFail();

        $request->validate([
            // 'txt' is included because some systems report CSV files as
            // text/plain, which would otherwise fail the mimes check.
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:2048',
        ]);

        // ── READ THE FILE ────────────────────────────────────────────────────
        try {
            $spreadsheet = IOFactory::load($request->file('file')->getRealPath());
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'That file could not be read. Please upload a valid Excel (.xlsx) or CSV file.',
            ], 422);
        }

        // toArray(nullValue, calculateFormulas, formatData, returnCellRef)
        // returnCellRef = false gives plain 0-indexed arrays instead of
        // letter-keyed ones like ['A' => ..., 'B' => ...]
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        if (count($rows) < 2) {
            return response()->json([
                'message' => 'That file has no data rows. Use the template as a starting point.',
            ], 422);
        }

        // ── MAP THE HEADER ROW ───────────────────────────────────────────────
        // We read column POSITIONS from the header names rather than assuming
        // a fixed order. That way "Email" can sit in column A or column C and
        // the import still works. Names are normalised so "Contact Number",
        // "contact_number", and "CONTACT-NUMBER" all resolve to the same key.
        $headerRow = array_shift($rows);
        $headers = [];

        foreach ($headerRow as $index => $label) {
            $key = strtolower(trim((string) $label));
            $key = preg_replace('/[^a-z0-9]+/', '_', $key);
            $key = trim($key, '_');

            if ($key !== '') {
                $headers[$key] = $index;
            }
        }

        foreach (['name', 'email', 'organization'] as $required) {
            if (!array_key_exists($required, $headers)) {
                return response()->json([
                    'message' => "Your file is missing a required column: '{$required}'. "
                               . "Required columns are: name, email, organization.",
                ], 422);
            }
        }

        // ── DROP BLANK ROWS BEFORE COUNTING ──────────────────────────────────
        // Excel pads files with empty rows whenever a cell has been styled
        // or merely touched, so a two-person file can report hundreds of
        // rows. Counting raw rows would reject legitimate files.
        //
        // array_filter preserves the original keys, which would break the
        // $index + 2 row-number maths below. array_values reindexes from
        // zero so the numbering stays correct.
        $rows = array_values(array_filter($rows, function ($row) use ($headers) {
            $name  = trim((string) ($row[$headers['name']] ?? ''));
            $email = trim((string) ($row[$headers['email']] ?? ''));
            $org   = trim((string) ($row[$headers['organization']] ?? ''));

            return $name !== '' || $email !== '' || $org !== '';
        }));

        if (count($rows) === 0) {
            return response()->json([
                'message' => 'That file has no data rows. Use the template as a starting point.',
            ], 422);
        }

        // Cap applies to rows with actual content, not raw sheet rows
        if (count($rows) > 300) {
            return response()->json([
                'message' => 'That file has more than 300 rows. Please split it into smaller files.',
            ], 422);
        }

        // ── PASS 1: EXTRACT AND VALIDATE EACH ROW'S FORMAT ───────────────────
        $parsed = [];
        $seenInFile = [];   // catches the same email appearing twice in one file

        foreach ($rows as $index => $row) {
            // +2 because we removed the header row (+1) and spreadsheets
            // are 1-indexed (+1). So $index 0 is the user's row 2.
            $rowNumber = $index + 2;

            $name         = trim((string) ($row[$headers['name']] ?? ''));
            $email        = strtolower(trim((string) ($row[$headers['email']] ?? '')));
            $organization = trim((string) ($row[$headers['organization']] ?? ''));

            // Contact numbers come back from Excel as floats when the cell
            // was stored as a number — 9171234567 arrives as 9171234567.0.
            // number_format strips the decimal without scientific notation.
            $contact = isset($headers['contact_number'])
                ? ($row[$headers['contact_number']] ?? null)
                : null;

            // Only convert when the cell arrived as an actual NUMBER.
            // Excel stores a plain-typed 09171234567 as the float
            // 9171234567.0, and casting recovers the digits.
            //
            // is_numeric() must NOT be used here: it returns true for the
            // STRING "09171234567" too, so the cast would strip the very
            // leading zero the template works to preserve.
            if (is_float($contact) || is_int($contact)) {
                $contact = number_format((float) $contact, 0, '', '');
            }

            $contact = trim((string) $contact);

            // Skip fully blank rows. Excel commonly pads files with empty
            // rows below the data, and flagging those as errors is noise.
            if ($name === '' && $email === '' && $organization === '') {
                continue;
            }

            $entry = [
                'row_number'     => $rowNumber,
                'name'           => $name,
                'email'          => $email,
                'organization'   => $organization,
                'contact_number' => $contact !== '' ? $contact : null,
            ];

            // Same rules as the manual endpoint. Validator::make() lets us
            // validate without throwing — we want to collect every bad row
            // and report them together, not stop at the first one.
            $validator = Validator::make($entry, [
                'name'           => 'required|string|max:255',
                'email'          => 'required|email|max:255',
                'organization'   => 'required|in:Employee,Student',
                'contact_number' => ['nullable', 'regex:/^09\d{9}$/'],
            ], [
                'contact_number.regex' => 'Contact number must be 11 digits starting with 09.',
            ]);

            if ($validator->fails()) {
                $entry['status']  = 'error';
                $entry['message'] = $validator->errors()->first();
                $parsed[] = $entry;
                continue;
            }

            // Duplicate WITHIN the uploaded file
            if (isset($seenInFile[$email])) {
                $entry['status']  = 'error';
                $entry['message'] = 'This email is duplicate on row ' . $seenInFile[$email] . '.';
                $parsed[] = $entry;
                continue;
            }

            $seenInFile[$email] = $rowNumber;
            $entry['status'] = 'pending';   // resolved in pass 2
            $parsed[] = $entry;
        }

        // ── PASS 2: CHECK THE DATABASE ───────────────────────────────────────
        // Two queries total, not two per row. Looking up 50 emails one at a
        // time would be 100 round trips; whereIn() does it in one each.
        $emails = collect($parsed)
            ->where('status', 'pending')
            ->pluck('email')
            ->all();

        $existingEmails = Participant::whereIn('email', $emails)
                                     ->pluck('email')
                                     ->flip();   // flip() → O(1) key lookups

        $enrolledEmails = $event->participants()
                                ->whereIn('email', $emails)
                                ->pluck('email')
                                ->flip();

        foreach ($parsed as &$entry) {
            if ($entry['status'] !== 'pending') {
                continue;
            }

            if ($enrolledEmails->has($entry['email'])) {
                $entry['status']  = 'duplicate';
                $entry['message'] = 'Already registered for this event — will be skipped.';
            } elseif ($existingEmails->has($entry['email'])) {
                $entry['status']  = 'existing';
                $entry['message'] = 'Has a FireOps account — will be added to this event.';
            } else {
                $entry['status']  = 'new';
                $entry['message'] = 'New account — password will be emailed.';
            }
        }
        unset($entry);   // breaks the reference from the loop above

        // ── SUMMARY ──────────────────────────────────────────────────────────
        $counts = collect($parsed)->countBy('status');

        return response()->json([
            'event' => [
                'id'   => $event->id,
                'name' => $event->name,
            ],
            'summary' => [
                'total'     => count($parsed),
                'new'       => $counts['new']       ?? 0,
                'existing'  => $counts['existing']  ?? 0,
                'duplicate' => $counts['duplicate'] ?? 0,
                'error'     => $counts['error']     ?? 0,
            ],
            'rows' => $parsed,
        ], 200);
    }

    /**
     * PROTECTED — Commit ONE CHUNK of rows from a reviewed import
     * Route: POST /api/staff/events/{eventId}/participants/import/commit
     *
     * React sends 10 rows per call and loops. Keeping each request small
     * avoids PHP's max_execution_time and browser timeouts, without
     * needing a queue worker running on the server.
     *
     * Every row is re-validated here. The preview ran in a separate
     * request and the server kept no state — and the client could have
     * edited the JSON. Never trust the preview as a security boundary.
     */
    public function commitImport(Request $request, $eventId)
    {
        $event = Event::where('id', $eventId)->firstOrFail();

        $request->validate([
            'rows'                  => 'required|array|min:1|max:25',
            'rows.*.name'           => 'required|string|max:255',
            'rows.*.email'          => 'required|email|max:255',
            'rows.*.organization'   => 'required|in:Employee,Student',
            'rows.*.contact_number' => ['nullable', 'regex:/^09\d{9}$/'],
            'rows.*.row_number'     => 'nullable|integer',
        ], [
            'rows.*.contact_number.regex' => 'Contact number must be 11 digits starting with 09 (e.g. 09171234567).',
        ]);

        $results = [];

        foreach ($request->input('rows') as $row) {

            $email = strtolower(trim($row['email']));

            $rowResult = [
                'row_number' => $row['row_number'] ?? null,
                'name'       => $row['name'],
                'email'      => $email,
            ];

            try {
                $participant   = Participant::where('email', $email)->first();
                $plainPassword = null;

                if ($participant) {

                    $alreadyJoined = $participant->events()
                                                 ->where('event_id', $event->id)
                                                 ->exists();

                    if ($alreadyJoined) {
                        $rowResult['status']     = 'duplicate';
                        $rowResult['message']    = 'Already registered — skipped.';
                        $rowResult['email_sent'] = false;
                        $results[] = $rowResult;
                        continue;
                    }

                    $participant->events()->attach($event->id);
                    $rowResult['status']  = 'enrolled_existing';
                    $rowResult['message'] = 'Added to this event.';

                } else {

                    $plainPassword = $this->generateReadablePassword();

                    $participant = Participant::create([
                        'name'           => trim($row['name']),
                        'email'          => $email,
                        'password'       => Hash::make($plainPassword),
                        'organization'   => $row['organization'],
                        'contact_number' => $row['contact_number'] ?? null,
                    ]);

                    $participant->events()->attach($event->id);
                    $rowResult['status']  = 'created_new';
                    $rowResult['message'] = 'Account created.';
                }

                // Email attempt is isolated — a failed send must not
                // undo an account that already exists in the database.
                try {
                    Mail::to($participant->email)->send(
                        new ParticipantCredentialsMail($participant, $event, $plainPassword)
                    );
                    $rowResult['email_sent'] = true;
                } catch (\Throwable $e) {
                    $rowResult['email_sent'] = false;
                    $rowResult['message'] .= ' Email failed to send.';
                    Log::error('Bulk import email failed', [
                        'email'    => $email,
                        'event_id' => $event->id,
                        'error'    => $e->getMessage(),
                    ]);
                }

                $rowResult['participant_id'] = $participant->id;

            } catch (\Throwable $e) {
                // One bad row must not kill the other nine in this chunk.
                // Catch, record, keep going.
                $rowResult['status']     = 'error';
                $rowResult['message']    = 'Could not be saved. Please add this person manually.';
                $rowResult['email_sent'] = false;

                Log::error('Bulk import row failed', [
                    'email'    => $email,
                    'event_id' => $event->id,
                    'error'    => $e->getMessage(),
                ]);
            }

            $results[] = $rowResult;
        }

        // ── ACTIVITY LOG ─────────────────────────────────────────────────────
        // One entry per CHUNK. Logging every participant individually would
        // flood the activity log on a 50-person import.
        $counts = collect($results)->countBy('status');

        $created  = $counts['created_new']       ?? 0;
        $enrolled = $counts['enrolled_existing'] ?? 0;
        $skipped  = $counts['duplicate']         ?? 0;
        $failed   = $counts['error']             ?? 0;

        // targetId stays null — target_user_id is a foreign key into the
        // USERS table, and these are participants.
        ActivityLog::log(
            action: 'imported',
            description: 'Imported participants into ' . $event->name
                . ' (' . $created . ' created, ' . $enrolled . ' added, '
                . $skipped . ' skipped, ' . $failed . ' failed)',
            targetId: null,
            meta: [
                'event_id'   => $event->id,
                'event_name' => $event->name,
                'method'     => 'bulk_excel',
                'created'    => $created,
                'enrolled'   => $enrolled,
                'skipped'    => $skipped,
                'failed'     => $failed,
                'emails'     => collect($results)->pluck('email')->all(),
            ]
        );

        return response()->json([
            'summary' => [
                'processed' => count($results),
                'created'   => $created,
                'enrolled'  => $enrolled,
                'skipped'   => $skipped,
                'failed'    => $failed,
            ],
            'results' => $results,
        ], 200);
    }

    /**
     * PUBLIC — Submit registration form
     * Route: POST /api/register/{token}
     */
    public function store(Request $request, $token)
    {
        $event = Event::where('token', $token)->firstOrFail();

        if (!$event->is_open) {
            return response()->json([
                'message' => 'Registration for this event is currently closed.'
            ], 403);
        }

        // organization is now REQUIRED. The participants.organization column
        // is NOT NULL, so allowing null here caused a 500 error whenever a
        // QR registrant skipped the dropdown.
        //
        // contact_number matches the manual/import rule so both registration
        // paths store numbers in the same format.
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|email|max:255',
            'password'       => 'required|string|min:6',
            'organization'   => 'required|in:Employee,Student',
            'contact_number' => ['nullable', 'regex:/^09\d{9}$/'],
        ], [
            'contact_number.regex' => 'Contact number must be 11 digits starting with 09 (e.g. 09171234567).',
        ]);

        $participant = Participant::where('email', $validated['email'])->first();

        if ($participant) {
            if (!Hash::check($validated['password'], $participant->password)) {
                return response()->json([
                    'message' => 'This email is already registered. To join this event, please use the password you created during your first registration.'
                ], 401);
            }

            $alreadyJoined = $participant->events()
                                         ->where('event_id', $event->id)
                                         ->exists();

            if ($alreadyJoined) {
                return response()->json([
                    'message' => 'You are already registered for this event.'
                ], 409);
            }

            $participant->events()->attach($event->id);

        } else {
            $participant = Participant::create([
                'name'           => $validated['name'],
                'email'          => $validated['email'],
                'password'       => Hash::make($validated['password']),
                'organization'   => $validated['organization'],
                'contact_number' => $validated['contact_number'] ?? null,
            ]);

            $participant->events()->attach($event->id);
        }

        return response()->json([
            'message'     => 'Registration successful! You can now log in to FireOps.',
            'participant' => [
                'id'    => $participant->id,
                'name'  => $participant->name,
                'email' => $participant->email,
            ]
        ], 201);
    }

    /**
     * PROTECTED — Remove participant from an event
     * Route: DELETE /api/staff/events/{eventId}/participants/{participantId}
     */
    public function destroy(Request $request, $eventId, $participantId)
    {
        $event = Event::where('id', $eventId)->firstOrFail();

        $participant = $event->participants()->findOrFail($participantId);

        $event->participants()->detach($participantId);

        return response()->json([
            'message' => 'Participant removed from this event.'
        ]);
    }

    /**
     * PUBLIC — Unity game login
     * Route: POST /api/participant/login
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $participant = Participant::where('email', $validated['email'])->first();

        if (!$participant || !Hash::check($validated['password'], $participant->password)) {
            return response()->json([
                'message' => 'Invalid email or password.'
            ], 401);
        }

        $participant->tokens()->delete();

        $token = $participant->createToken('unity-login')->plainTextToken;

        return response()->json([
            'token'       => $token,
            'participant' => [
                'id'           => $participant->id,
                'name'         => $participant->name,
                'email'        => $participant->email,
                'organization' => $participant->organization,
            ]
        ], 200);
    }
}