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

    h2 {
        font-size: 8.5px; color: #6b7280; letter-spacing: 1.2px;
        text-transform: uppercase; font-weight: bold;
        margin: 26px 0 10px 0;
    }

    table { width: 100%; border-collapse: collapse; }

    .finding {
        background: #fafafa;
        border-left: 3px solid #c0392b;
        padding: 14px 16px;
    }
    .finding .txt { font-size: 12px; color: #111827; line-height: 1.55; }

    .metrics { background: #fafafa; }
    .metric { text-align: center; padding: 14px 6px; width: 33.33%; }
    .metric .num { font-size: 25px; font-weight: bold; color: #111827; }
    .metric .cap {
        font-size: 7.5px; color: #6b7280; letter-spacing: 0.7px;
        text-transform: uppercase; margin-top: 3px;
    }
    .divider { border-left: 1px solid #e5e7eb; }

    .note { font-size: 8.5px; color: #9ca3af; margin-top: 8px; line-height: 1.6; }

    .data th {
        text-align: left; font-size: 7.5px; color: #9ca3af;
        letter-spacing: 0.7px; text-transform: uppercase;
        border-bottom: 1.5px solid #d1d5db; padding: 0 7px 6px 7px;
    }
    .data td { padding: 7px; border-bottom: 1px solid #f3f4f6; }
    .data tr:last-child td { border-bottom: none; }
    .num-col { text-align: right; }
    .name { font-weight: bold; color: #111827; }
    .idx { color: #d1d5db; font-size: 9px; }
    .sub { color: #6b7280; }

    .attempts { font-weight: bold; color: #b91c1c; }

    .action {
        background: #fafafa;
        border: 1px solid #e5e7eb;
        padding: 14px 16px;
        margin-top: 20px;
    }
    .action .hd {
        font-size: 8px; color: #9ca3af; letter-spacing: 1.2px;
        text-transform: uppercase; font-weight: bold; margin-bottom: 6px;
    }
    .action .bd { font-size: 9.5px; color: #374151; line-height: 1.7; }

    .clear { color: #15803d; padding: 30px 0; text-align: center; font-size: 11px; }
    .clear .sub { color: #9ca3af; font-size: 9px; margin-top: 5px; }

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
        <td>FireOps Training System &mdash; Bureau of Fire Protection, Natividad Station</td>
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
            <div class="doctype">Follow-up Required</div>
            <div class="refno">
                FIREOPS-FUP-{{ \Carbon\Carbon::parse($event->date)->format('Y') }}-{{ str_pad($event->id, 4, '0', STR_PAD_LEFT) }}
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
        <td class="lbl">Criteria</td>
        <td class="val">{{ $threshold }} or more attempts, not passed</td>
    </tr>
</table>

@if ($summary['cases'] === 0)

    <div class="clear">
        No participants require follow-up.
        <div class="sub">
            Every participant who attempted a procedure {{ $threshold }} or more times
            went on to complete it successfully.
        </div>
    </div>

@else

    <h2>Finding</h2>
    <table class="finding">
        <tr><td class="txt">
            {{ $summary['people_needing_followup'] }}
            of {{ $summary['total_participants'] }}
            {{ $summary['total_participants'] === 1 ? 'participant' : 'participants' }}
            could not complete a procedure after {{ $threshold }} or more attempts.
            @if ($summary['worst_environment'])
                Most difficulty occurred in the
                {{ ucfirst($summary['worst_environment']) }} environment.
            @endif
        </td></tr>
    </table>

    <h2>Overview</h2>
    <table class="metrics">
        <tr>
            <td class="metric">
                <div class="num">{{ $summary['people_needing_followup'] }}</div>
                <div class="cap">Need follow-up</div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $summary['cases'] }}</div>
                <div class="cap">Procedures unpassed</div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $summary['total_participants'] }}</div>
                <div class="cap">Total participated</div>
            </td>
        </tr>
    </table>

    <p class="note">
        A participant may appear more than once if they struggled with more
        than one environment. Best score is the highest they reached across
        all attempts; a passing score is 50 percent.
    </p>

    <h2>Participants requiring follow-up</h2>
    <table class="data">
        <tr>
            <th style="width:20px;">#</th>
            <th>Participant</th>
            <th>Environment</th>
            <th class="num-col">Attempts</th>
            <th class="num-col">Best score</th>
            <th>Main difficulty</th>
        </tr>
        @foreach ($rows as $i => $r)
        <tr>
            <td class="idx">{{ $i + 1 }}</td>
            <td>
                <div class="name">{{ $r['participant_name'] }}</div>
                <div class="sub">{{ $r['organization'] }}</div>
            </td>
            <td>{{ ucfirst($r['environment']) }}</td>
            <td class="num-col attempts">{{ $r['attempts'] }}</td>
            <td class="num-col">{{ $r['best_score'] }}%</td>
            <td>
                <div>{{ $r['main_barrier'] }}</div>
                @if ($r['dominant_step'])
                <div class="sub">
                    Most missed: {{ $r['dominant_step'] }}
                    @if ($r['dominant_choice'])
                        &mdash; chose {{ $r['dominant_choice'] }} instead
                    @endif
                </div>
                @endif
            </td>
        </tr>
        @endforeach
    </table>

    <table class="action">
        <tr><td>
            <div class="hd">Recommended action</div>
            <div class="bd">
                The participants listed above have attempted the procedure
                repeatedly without success. Hands-on instruction is recommended
                before they are considered trained in that environment.
                The &ldquo;most missed&rdquo; column identifies the specific step
                to work through with each person.
            </div>
        </td></tr>
    </table>

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