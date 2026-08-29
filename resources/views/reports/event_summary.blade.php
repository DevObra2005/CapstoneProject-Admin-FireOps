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

    .metrics { background: #fafafa; }
    .metric { text-align: center; padding: 14px 6px; width: 25%; }
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

    .track { width: 62px; height: 5px; background: #f3f4f6; }
    .fill { height: 5px; background: #c0392b; }

    .tag {
        font-size: 7.5px; letter-spacing: 0.5px;
        text-transform: uppercase; font-weight: bold;
    }
    .tag-pass { color: #15803d; }
    .tag-fail { color: #b91c1c; }

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
            <div class="doctype">Event Summary Report</div>
            <div class="refno">
                FIREOPS-EVT-{{ \Carbon\Carbon::parse($event->date)->format('Y') }}-{{ str_pad($event->id, 4, '0', STR_PAD_LEFT) }}
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

@if ($overview['scenarios_attempted'] === 0)

    <p class="empty">No training data was recorded for this event.</p>

@else

    <h2>Overview</h2>
    <table class="metrics">
        <tr>
            <td class="metric">
                <div class="num">{{ $overview['participants_attempted'] }}</div>
                <div class="cap">Participants</div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $overview['scenarios_attempted'] }}</div>
                <div class="cap">Scenarios run</div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $overview['scenario_pass_rate'] }}%</div>
                <div class="cap">Pass rate</div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $overview['final_average_score'] }}%</div>
                <div class="cap">Average score</div>
            </td>
        </tr>
    </table>

    <p class="note">
        {{ $overview['scenarios_passed'] }} of {{ $overview['scenarios_attempted'] }}
        scenarios passed across {{ $overview['participants_attempted'] }}
        {{ $overview['participants_attempted'] === 1 ? 'participant' : 'participants' }}.
        {{ $overview['total_attempts'] }} total attempts recorded,
        averaging {{ $overview['attempts_per_scenario'] }} per scenario.
        Pass rate and average score reflect each participant's final attempt
        in each environment.
    </p>

    <h2>Performance by environment</h2>
    <table class="data">
        <tr>
            <th>Environment</th>
            <th class="num-col">Attempts</th>
            <th class="num-col">Passed</th>
            <th class="num-col">Pass rate</th>
            <th class="num-col">Avg score</th>
            <th style="width:70px;"></th>
        </tr>
        @foreach ($by_environment as $row)
        <tr>
            <td class="name">{{ ucfirst($row['environment']) }}</td>
            <td class="num-col">{{ $row['total_attempts'] }}</td>
            <td class="num-col">{{ $row['passed'] }} / {{ $row['scenarios'] }}</td>
            <td class="num-col">{{ $row['pass_rate'] }}%</td>
            <td class="num-col">{{ $row['average_score'] }}%</td>
            <td>
                <div class="track">
                    <div class="fill" style="width: {{ $row['pass_rate'] }}%;"></div>
                </div>
            </td>
        </tr>
        @endforeach
    </table>

    <h2>Participant results</h2>
    <table class="data">
        <tr>
            <th style="width:20px;">#</th>
            <th>Participant</th>
            <th>Environment</th>
            <th class="num-col">Attempts</th>
            <th class="num-col">Score</th>
            <th style="width:78px;">Result</th>
        </tr>
        @foreach ($participants as $i => $p)
        <tr>
            <td class="idx">{{ $i + 1 }}</td>
            <td class="name">{{ $p['participant_name'] }}</td>
            <td>{{ ucfirst($p['environment']) }}</td>
            <td class="num-col">{{ $p['attempts_made'] }}</td>
            <td class="num-col">{{ $p['score'] }}%</td>
            <td>
                <span class="tag {{ $p['passed'] ? 'tag-pass' : 'tag-fail' }}">
                    {{ $p['passed'] ? $p['score_label'] : 'Failed' }}
                </span>
            </td>
        </tr>
        @endforeach
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