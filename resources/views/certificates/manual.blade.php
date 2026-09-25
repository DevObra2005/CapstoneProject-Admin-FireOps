{{--
─────────────────────────────────────────────────────────────
 Manual certificate — dompdf template (A4 landscape)

 Two layers, like pre-printed certificate paper:
   1. Background PNG (red corners + dot seals), full page
   2. Text placed on top with absolute positions in mm

 dompdf cannot fetch images over HTTP, so every image is read
 from disk and embedded as base64.

 Expects: $cert (App\Models\ManualCertificate)
─────────────────────────────────────────────────────────────
--}}
@php
    // Reads a PNG from public/ and returns a base64 data URI.
    // Returns null when the file is missing, so a missing logo is
    // simply skipped instead of breaking the whole PDF.
    $embed = function (string $relative) {
        $path = public_path($relative);
        return file_exists($path)
            ? 'data:image/png;base64,' . base64_encode(file_get_contents($path))
            : null;
    };

    $background = $embed('Images/certificates/manual-certificate-bg.png');

    // Logos left to right. Missing ones are filtered out.
    $logos = array_filter(array_map(
        fn ($i) => $embed("Images/certificates/logo{$i}.png"),
        range(1, 5)
    ));

    // Message is one paragraph, like the original certificate, so any
    // line breaks become spaces (extra lines would push the text into
    // the "Given this..." line). Escape first so typed HTML can't run,
    // THEN turn **text** into bold.
    $plainMessage = trim(preg_replace('/\s*\R\s*/', ' ', $cert->message));
    $messageHtml  = preg_replace('/\*\*(.+?)\*\*/s', '<b>$1</b>', e($plainMessage));

    // Longer messages get a smaller font so they stay inside their space:
    // up to 220 characters → 12pt, then shrinks gradually, never below 10pt.
    $len      = mb_strlen($plainMessage);
    $bodySize = $len <= 220 ? 12 : max(10, round(12 * sqrt(220 / $len), 1));

    // Long organization names shrink so they stay on one line.
    $name     = $cert->recipient_name;
    $nameSize = min(30, 30 * 30 / max(mb_strlen($name), 1));

    // "24th" and "July 2026"
    $day       = $cert->given_date->format('jS');
    $monthYear = $cert->given_date->format('F Y');
@endphp
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{ $cert->certificate_no }}</title>
<style>
    @page { size: A4 landscape; margin: 0; }

    * { margin: 0; padding: 0; }

    body {
        width: 297mm;
        height: 210mm;
        font-family: 'DejaVu Sans', sans-serif;   /* built into dompdf */
        color: #2b2b2b;
    }

    /* Background fills the whole page */
    .bg {
        position: absolute;
        top: 0; left: 0;
        width: 297mm; height: 210mm;
    }

    /* Every text block spans the page width and centers itself */
    .row {
        position: absolute;
        left: 0;
        width: 297mm;
        text-align: center;
    }

    .logos img {
        height: 20mm;
        width: 20mm;
        margin: 0 2mm;
    }

    .agency {
        font-size: 9.5pt;
        line-height: 1.35;
    }
    .agency b { text-transform: uppercase; }

    .award { font-size: 18pt; color: #1f8fdc; }
    .title { font-size: 42pt; font-weight: bold; color: #1f8fdc; letter-spacing: 1pt; }
    .to    { font-size: 18pt; color: #1f8fdc; }

    .name {
        display: inline-block;
        font-weight: bold;
        padding: 0 6mm 1.5mm;
        border-bottom: 0.8mm solid #2b2b2b;
        min-width: 170mm;
        white-space: nowrap;
    }

    .body {
        position: absolute;
        left: 58mm;
        width: 185mm;
        font-style: italic;
        line-height: 1.5;
        text-align: left;
        word-wrap: break-word;   /* safety net for long words */
    }

    /* Narrower than the page and shifted left, so the end of the
       line ("Pangasinan.") stays clear of the bottom-right red shape */
    .given {
        position: absolute;
        left: 56mm;
        width: 185mm;
        text-align: center;
        font-size: 11.5pt;
        font-style: italic;
    }

    .signer-name {
        display: inline-block;
        font-size: 12.5pt;
        font-weight: bold;
        text-transform: uppercase;
        padding: 0 10mm 1mm;
        border-bottom: 0.6mm solid #2b2b2b;
    }
    .signer-title {
        font-size: 11pt;
        font-weight: bold;
        line-height: 1.35;
        margin-top: 1.5mm;
    }
</style>
</head>
<body>

    @if ($background)
        <img class="bg" src="{{ $background }}" alt="">
    @endif

    {{-- Logos --}}
    <div class="row logos" style="top: 12mm;">
        @foreach ($logos as $logo)
            <img src="{{ $logo }}" alt="">
        @endforeach
    </div>

    {{-- Agency header --}}
    <div class="row agency" style="top: 35mm;">
        Republic of the Philippines<br>
        Department of the Interior and Local Government<br>
        <b>Bureau of Fire Protection</b><br>
        <b>Region I</b><br>
        <b>Natividad Fire Station - Pangasinan</b>
    </div>

    {{-- Title --}}
    <div class="row award" style="top: 68mm;">Award this</div>
    <div class="row title" style="top: 75mm;">CERTIFICATE</div>
    <div class="row to"    style="top: 94mm;">to</div>

    {{-- Recipient --}}
    <div class="row" style="top: 106mm;">
        <span class="name" style="font-size: {{ $nameSize }}pt;">{{ $name }}</span>
    </div>

    {{-- Message --}}
    <div class="body" style="top: 128mm; font-size: {{ $bodySize }}pt;">{!! $messageHtml !!}</div>

    {{-- Given this... (location stays fixed) --}}
    <div class="given" style="top: 153mm;">
        Given this <b>{{ $day }}</b> day of <b>{{ $monthYear }}</b>
        at Natividad Fire Station, Natividad, Pangasinan.
    </div>

    {{-- Signature block --}}
    <div class="row" style="top: 171mm;">
        <span class="signer-name">{{ $cert->fire_marshal_name }}</span>
        <div class="signer-title">
            {{ $cert->fire_marshal_title }}<br>
            BFP Natividad
        </div>
    </div>

</body>
</html>