<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 42px 48px 72px 48px; }

    body {
        font-family: DejaVu Sans, sans-serif;
        font-size: 9.5px;
        color: #1f2937;
        line-height: 1.5;
    }

    .band { border-bottom: 3px solid #c0392b; padding-bottom: 10px; }
    .org { font-size: 15px; font-weight: bold; letter-spacing: 0.3px; }
    .station { font-size: 9px; color: #6b7280; margin-top: 1px; }
    .doctype {
        font-size: 8px; color: #c0392b; letter-spacing: 1.4px;
        text-transform: uppercase; text-align: right;
    }
    .refno { font-size: 8px; color: #9ca3af; text-align: right; margin-top: 2px; }

    .meta { margin-top: 16px; }
    .meta td { padding: 3px 0; vertical-align: top; }
    .meta .lbl {
        color: #9ca3af; width: 74px; font-size: 8px;
        letter-spacing: 0.6px; text-transform: uppercase;
    }
    .meta .val { font-size: 10px; }

    table { width: 100%; border-collapse: collapse; }

    .purpose { background: #fafafa; border-left: 3px solid #d1d5db; margin-top: 18px; }
    .purpose td { padding: 12px 14px; font-size: 9.5px; color: #4b5563; line-height: 1.7; }

    /* Each environment is its own block, separated by a rule rather than
       a heading style, so the reader takes them one at a time. */
    .env-head {
        margin-top: 30px;
        border-bottom: 2px solid #d1d5db;
        padding-bottom: 6px;
    }
    .env-name {
        font-size: 13px; font-weight: bold; color: #111827;
        letter-spacing: 0.3px; text-transform: uppercase;
    }
    .env-tag {
        font-size: 8px; color: #c0392b; letter-spacing: 1px;
        text-transform: uppercase; font-weight: bold;
    }
    .env-count { font-size: 9px; color: #9ca3af; text-align: right; }

    .data { margin-top: 12px; }
    .data th {
        text-align: left; font-size: 7.5px; color: #9ca3af;
        letter-spacing: 0.7px; text-transform: uppercase;
        border-bottom: 1.5px solid #d1d5db; padding: 0 7px 6px 7px;
    }
    .data td { padding: 7px; border-bottom: 1px solid #f3f4f6; }
    .data tr:last-child td { border-bottom: none; }
    .step { font-weight: bold; color: #111827; }
    .count { text-align: center; font-size: 13px; font-weight: bold; color: #b91c1c; }
    .th-count { text-align: center; }
    .instead { color: #4b5563; }

    .clean { font-size: 8.5px; color: #9ca3af; margin-top: 8px; line-height: 1.6; }

    .advice { background: #fafafa; border-left: 3px solid #c0392b; margin-top: 14px; }
    .advice td { padding: 12px 14px; }
    .advice .hd {
        font-size: 8px; color: #9ca3af; letter-spacing: 1.2px;
        text-transform: uppercase; font-weight: bold; margin-bottom: 5px;
    }
    .advice .bd { font-size: 10px; color: #111827; line-height: 1.6; }

    .no-mistakes { color: #15803d; font-size: 10px; padding: 16px 0; }

    .empty { color: #9ca3af; padding: 30px 0; font-style: italic; text-align: center; }

    .signature { margin-top: 52px; }
    .sigline { border-top: 1px solid #9ca3af; padding-top: 5px; text-align: center; }
    .signame { font-size: 9px; color: #374151; }
    .sigrole { font-size: 7.5px; color: #9ca3af; letter-spacing: 0.6px; text-transform: uppercase; }

    footer {
        position: fixed; bottom: -48px; left: 0; right: 0;
        font-size: 7.5px; color: #b0b0b0;
        border-top: 1px solid #f3f4f6; padding-top: 6px;
    }
    .pg:after { content: counter(page); }
</style>
</head>
<body>

<footer>
    <table><tr>
        <td>FireOps: A 3D Gamified Simulation-Based Training System &mdash; Bureau of Fire Protection, Natividad Station</td>
        <td style="text-align:right;">Page <span class="pg"></span></td>
    </tr></table>
</footer>

<table class="band">
    <tr>
        <td>
            <div class="org">Bureau of Fire Protection</div>
            <div class="station">Natividad Fire Station</div>
        </td>
        <td>
            <div class="doctype">Simulation Analysis Report</div>
            <div class="refno">
                FIREOPS-SIM-{{ \Carbon\Carbon::parse($event->date)->format('Y') }}-{{ str_pad($event->id, 4, '0', STR_PAD_LEFT) }}
            </div>
        </td>
    </tr>
</table>

<table class="meta">
    <tr>
        <td class="lbl">Event</td>
        <td class="val">{{ $event->name }}</td>
        <td class="lbl">Generated</td>
        <td class="val">{{ $generated_at }}</td>
    </tr>
    <tr>
        <td class="lbl">Date</td>
        <td class="val">{{ \Carbon\Carbon::parse($event->date)->format('d F Y') }}</td>
        <td class="lbl">Prepared by</td>
        <td class="val">{{ $generated_by }}</td>
    </tr>
    <tr>
        <td class="lbl">Location</td>
        <td class="val">{{ $event->location_name ?: 'Not specified' }}</td>
        <td></td>
        <td></td>
    </tr>
</table>

@if ($environments->isEmpty())

    <p class="empty">No simulations were played at this event.</p>

@else

    <table class="purpose">
        <tr><td>
            This report shows which steps participants got wrong during the
            simulation, and what they did instead. Each environment is
            reported separately because they teach different procedures.
        </td></tr>
    </table>

    @foreach ($environments as $env)

        <table class="env-head">
            <tr>
                <td>
                    <span class="env-name">{{ $env['label'] }}</span>
                    &nbsp;<span class="env-tag">{{ $env['procedure'] }}</span>
                </td>
                <td class="env-count">
                    {{ $env['participants'] }}
                    {{ $env['participants'] === 1 ? 'participant' : 'participants' }}
                    &middot;
                    {{ $env['simulations'] }}
                    {{ $env['simulations'] === 1 ? 'simulation' : 'simulations' }}
                </td>
            </tr>
        </table>

        @if ($env['mistakes'] === 0)

            <p class="no-mistakes">
                Every step was performed correctly in this environment.
            </p>

        @else

            <table class="data">
                <tr>
                    <th>Step</th>
                    <th class="th-count">Simulations with mistake</th>
                    <th>What they did instead</th>
                </tr>
                @foreach ($env['steps'] as $row)
                <tr>
                    <td class="step">{{ $row['step_label'] }}</td>
                    <td class="count">{{ $row['times_wrong'] }}</td>
                    <td class="instead">{{ $row['instead'] ?? '—' }}</td>
                </tr>
                @endforeach
            </table>

            @if ($env['advice'])
            <table class="advice">
                <tr><td>
                    <div class="hd">What to teach</div>
                    <div class="bd">{{ $env['advice'] }}</div>
                </td></tr>
            </table>
            @endif

        @endif

    @endforeach

@endif

<table class="signature">
    <tr>
        <td style="width:56%;"></td>
        <td class="sigline">
            <div class="signame">&nbsp;</div>
            <div class="sigrole">Verified by &mdash; Station Officer</div>
        </td>
    </tr>
</table>

</body>
</html>