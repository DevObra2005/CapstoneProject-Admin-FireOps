<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Certificate Verification — FireOps</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0; padding: 24px;
        min-height: 100vh;
        background: #eeeeee;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        color: #0a0a0a;
        display: flex; align-items: center; justify-content: center;
    }
    .card {
        width: 100%; max-width: 440px;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 6px 24px rgba(0,0,0,.10);
        overflow: hidden;
    }
    .top { padding: 26px 26px 20px; text-align: center; border-bottom: 1px solid #e2e2e2; }
    .brand { font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #b8271a; }
    .brand-sub { font-size: 10.5px; color: #616161; margin-top: 3px; letter-spacing: .6px; }

    .status { padding: 30px 26px; text-align: center; }
    .badge {
        display: inline-block;
        width: 62px; height: 62px; line-height: 62px;
        border-radius: 50%; font-size: 28px; margin-bottom: 14px;
    }
    .badge.ok   { background: #dff0e5; color: #14562a; }
    .badge.bad  { background: #fce4e1; color: #b8271a; }
    .status-h   { font-size: 19px; font-weight: 800; }
    .status-h.ok  { color: #14562a; }
    .status-h.bad { color: #b8271a; }
    .status-p   { font-size: 13px; color: #616161; margin-top: 6px; line-height: 1.6; }

    .rows { padding: 4px 26px 26px; }
    .row {
        display: flex; justify-content: space-between; align-items: baseline;
        gap: 14px; padding: 11px 0; border-bottom: 1px solid #efefef;
    }
    .row:last-child { border-bottom: 0; }
    .k { font-size: 11px; color: #8f8f8f; letter-spacing: .8px; text-transform: uppercase; flex: none; }
    .v { font-size: 13.5px; font-weight: 600; text-align: right; }
    .v.score { color: #14562a; font-weight: 800; }

    .foot {
        padding: 14px 26px; background: #f7f7f7;
        font-size: 10.5px; color: #8f8f8f; text-align: center; line-height: 1.6;
    }
    .code { font-family: monospace; font-size: 10px; color: #616161; word-break: break-all; }
</style>
</head>
<body>

<div class="card">

    <div class="top">
        <div class="brand">BUREAU OF FIRE PROTECTION</div>
        <div class="brand-sub">Natividad Station &middot; FireOps Training System</div>
    </div>

    @if($certificate)

        <div class="status">
            <div class="badge ok">&check;</div>
            <div class="status-h ok">Valid certificate</div>
            <div class="status-p">This certificate was issued by BFP Natividad Station and is recorded in the FireOps system.</div>
        </div>

        <div class="rows">
            <div class="row">
                <span class="k">Name</span>
                <span class="v">{{ $certificate->participant->name }}</span>
            </div>
            <div class="row">
                <span class="k">Environment</span>
                <span class="v">{{ ucfirst($certificate->environment) }}</span>
            </div>
            <div class="row">
                <span class="k">Event</span>
                <span class="v">{{ $certificate->event->name }}</span>
            </div>
            @if($certificate->gameSession)
            <div class="row">
                <span class="k">Score</span>
                <span class="v score">
                    {{ $certificate->gameSession->percentage_score }}%
                    &middot; {{ $certificate->gameSession->score_label }}
                </span>
            </div>
            @endif
            <div class="row">
                <span class="k">Issued</span>
                <span class="v">{{ $certificate->issued_at->setTimezone(config('app.display_timezone'))->format('F j, Y') }}</span>
            </div>
        </div>

        <div class="foot">
            Verification code<br>
            <span class="code">{{ $certificate->verification_code }}</span>
        </div>

    @else

        <div class="status">
            <div class="badge bad">&times;</div>
            <div class="status-h bad">Certificate not found</div>
            <div class="status-p">
                This verification code does not match any certificate on record.
                Check that the code was entered correctly, or contact BFP Natividad Station.
            </div>
        </div>

        <div class="foot">
            Code checked<br>
            <span class="code">{{ request()->route('code') }}</span>
        </div>

    @endif

</div>

</body>
</html>