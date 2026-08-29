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

    /* The single most important finding, set apart from the tables so
       a reader who only glances at the page still takes it away. */
    .headline {
        background: #fafafa;
        border-left: 3px solid #c0392b;
        padding: 14px 16px;
    }
    .headline .txt { font-size: 12px; color: #111827; line-height: 1.55; }

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
    .env { color: #6b7280; }

    .track { width: 62px; height: 5px; background: #f3f4f6; }
    .fill { height: 5px; background: #c0392b; }

    /* Failure rate is coloured by severity — a reader scanning the
       column sees where attention is needed without reading numbers. */
    .rate-high { color: #b91c1c; font-weight: bold; }
    .rate-mid  { color: #b45309; font-weight: bold; }
    .rate-low  { color: #15803d; }

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
            <div class="doctype">Training Analysis Report</div>
            <div class="refno">
                FIREOPS-TRN-{{ now()->setTimezone(config('app.display_timezone'))->format('Y-md') }}
            </div>
        </td>
    </tr>
</table>

<table class="meta">
    <tr>
        <td class="lbl">Period</td>
        <td class="val">{{ $period_label }}</td>
        <td class="lbl">Generated</td>
        <td class="val">{{ $generated_at }}</td>
    </tr>
    <tr>
        <td class="lbl">Scope</td>
        <td class="val">All environments &mdash; Office, Classroom, Kitchen</td>
        <td class="lbl">Prepared by</td>
        <td class="val">{{ $generated_by }}</td>
    </tr>
</table>

@if ($total_steps === 0)

    <p class="empty">No simulation steps were recorded in this period.</p>

@else

    @if ($headline)
    <h2>Key finding</h2>
    <table class="headline">
        <tr><td class="txt">{{ $headline }}</td></tr>
    </table>
    @endif

    <h2>Overview</h2>
    <table class="metrics">
        <tr>
            <td class="metric">
                <div class="num">{{ number_format($total_steps) }}</div>
                <div class="cap">Steps recorded</div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $by_step->count() }}</div>
                <div class="cap">Distinct steps</div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $overall_failure_rate }}%</div>
                <div class="cap">Overall failure rate</div>
            </td>
        </tr>
    </table>

    <p class="note">
        Each row below is one doctrine step within one environment.
        Failure rate is the share of attempts where the participant
        performed that step incorrectly. Average penalty is the time
        added to their run each time the step was missed.
    </p>

    <h2>Step failure rates</h2>
    <table class="data">
        <tr>
            <th style="width:20px;">#</th>
            <th>Step</th>
            <th>Environment</th>
            <th class="num-col">Times run</th>
            <th class="num-col">Missed</th>
            <th class="num-col">Failure rate</th>
            <th class="num-col">Avg penalty</th>
            <th style="width:70px;"></th>
        </tr>
        @foreach ($by_step as $i => $row)
        <tr>
            <td class="idx">{{ $i + 1 }}</td>
            <td class="name">{{ $row['step_label'] }}</td>
            <td class="env">{{ ucfirst($row['environment']) }}</td>
            <td class="num-col">{{ $row['times_run'] }}</td>
            <td class="num-col">{{ $row['times_missed'] }}</td>
            <td class="num-col
                @if ($row['failure_rate'] >= 50) rate-high
                @elseif ($row['failure_rate'] >= 25) rate-mid
                @else rate-low @endif">
                {{ $row['failure_rate'] }}%
            </td>
            <td class="num-col">
                {{ $row['avg_penalty'] > 0 ? $row['avg_penalty'] . 's' : '—' }}
            </td>
            <td>
                <div class="track">
                    <div class="fill" style="width: {{ $row['failure_rate'] }}%;"></div>
                </div>
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