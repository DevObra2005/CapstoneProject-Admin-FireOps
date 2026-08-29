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
    .metric { text-align: center; padding: 14px 4px; width: 20%; }
    .metric .num { font-size: 23px; font-weight: bold; color: #111827; }
    .metric .cap {
        font-size: 7.5px; color: #6b7280; letter-spacing: 0.6px;
        text-transform: uppercase; margin-top: 3px;
    }
    .metric .cap-sub { font-size: 7px; color: #b0b0b0; margin-top: 1px; }
    .divider { border-left: 1px solid #e5e7eb; }

    .note { font-size: 8.5px; color: #9ca3af; margin-top: 8px; line-height: 1.6; }

    .data th {
        text-align: left; font-size: 7.5px; color: #9ca3af;
        letter-spacing: 0.7px; text-transform: uppercase;
        border-bottom: 1.5px solid #d1d5db; padding: 0 7px 6px 7px;
    }

    /* .data th is 0,1,1 and beats .num-col at 0,1,0, so a numeric
       header stayed left-aligned while its column sat right. This
       matches the specificity to put them back over each other. */
    .data th.num-col { text-align: right; }
    .data td { padding: 7px; border-bottom: 1px solid #f3f4f6; }
    .data tr:last-child td { border-bottom: none; }
    .num-col { text-align: right; }
    .name { font-weight: bold; color: #111827; }
    .idx { color: #d1d5db; font-size: 9px; }
    .sub { color: #6b7280; font-size: 8.5px; }
    .blank { color: #d1d5db; }

    .track { width: 62px; height: 5px; background: #f3f4f6; }
    .fill { height: 5px; background: #c0392b; }

    .tag {
        font-size: 7.5px; letter-spacing: 0.4px;
        text-transform: uppercase; font-weight: bold;
    }
    .tag-pass { color: #15803d; }
    .tag-fail { color: #b91c1c; }

    .tier-name { font-weight: bold; color: #111827; }
    .tier-range { color: #9ca3af; font-size: 8.5px; }
    .tier-count { font-size: 13px; font-weight: bold; }

    .flag {
        background: #fafafa; border: 1px solid #e5e7eb;
        margin-top: 20px;
    }
    .flag td { padding: 11px 14px; font-size: 9.5px; color: #374151; }

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

@if ($overview['registered'] === 0)

    <p class="empty">No participants were registered for this event.</p>

@else

    <h2>Overview</h2>
    <table class="metrics">
        <tr>
            <td class="metric">
                <div class="num">{{ $overview['registered'] }}</div>
                <div class="cap">Registered</div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $overview['played'] }}</div>
                <div class="cap">Played</div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $overview['passed'] }}</div>
                <div class="cap">Passed</div>
                <div class="cap-sub">at least one</div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $overview['completed_all'] }}</div>
                <div class="cap">Completed all</div>
                <div class="cap-sub">
                    {{ $overview['environments_count'] }}
                    {{ $overview['environments_count'] === 1 ? 'simulation' : 'simulations' }}
                </div>
            </td>
            <td class="metric divider">
                <div class="num">{{ $overview['average_score'] }}%</div>
                <div class="cap">Average score</div>
            </td>
        </tr>
    </table>

    {{-- The absence gap goes here rather than in its own box. The metrics
         show 8 and 2 but leave the reader to spot the difference; this
         states it without adding another block to the page. --}}
    @if ($overview['played'] === 0)
        <p class="note">
            None of the {{ $overview['registered'] }} registered
            {{ $overview['registered'] === 1 ? 'participant' : 'participants' }}
            played the simulation at this event.
        </p>
    @else
        <p class="note">
            {{ $overview['total_simulations'] }}
            {{ $overview['total_simulations'] === 1 ? 'simulation was' : 'simulations were' }}
            completed across {{ $overview['played'] }}
            {{ $overview['played'] === 1 ? 'participant' : 'participants' }},
            from {{ $overview['total_attempts'] }} total
            {{ $overview['total_attempts'] === 1 ? 'attempt' : 'attempts' }}.
            @if ($overview['registered'] > $overview['played'])
                {{ $overview['registered'] - $overview['played'] }} registered
                {{ ($overview['registered'] - $overview['played']) === 1 ? 'participant' : 'participants' }}
                did not play.
            @endif
            Scores reflect each participant's final attempt in each environment.
        </p>
    @endif

    @if ($overview['played'] > 0)

        <h2>Score breakdown by environment</h2>
        <table class="data">
            <tr>
                <th>Rating</th>
                @foreach ($environments as $env)
                    <th class="num-col">{{ ucfirst($env) }}</th>
                @endforeach
            </tr>
            <tr>
                <td><span class="tier-name">Excellent</span>
                    <span class="tier-range">&nbsp; 90&ndash;100%</span></td>
                @foreach ($environments as $env)
                    <td class="num-col tier-count">{{ $breakdown[$env]['excellent'] }}</td>
                @endforeach
            </tr>
            <tr>
                <td><span class="tier-name">Good</span>
                    <span class="tier-range">&nbsp; 75&ndash;89%</span></td>
                @foreach ($environments as $env)
                    <td class="num-col tier-count">{{ $breakdown[$env]['good'] }}</td>
                @endforeach
            </tr>
            <tr>
                <td><span class="tier-name">Passed</span>
                    <span class="tier-range">&nbsp; 50&ndash;74%</span></td>
                @foreach ($environments as $env)
                    <td class="num-col tier-count">{{ $breakdown[$env]['passed'] }}</td>
                @endforeach
            </tr>
            <tr>
                <td><span class="tier-name">Did not pass yet</span></td>
                @foreach ($environments as $env)
                    <td class="num-col tier-count">{{ $breakdown[$env]['not_yet'] }}</td>
                @endforeach
            </tr>
            <tr>
                <td class="sub">Participants who played</td>
                @foreach ($environments as $env)
                    <td class="num-col sub">{{ $breakdown[$env]['total'] }}</td>
                @endforeach
            </tr>
        </table>

        <h2>Performance by environment</h2>
        <table class="data">
            <tr>
                <th>Environment</th>
                <th class="num-col">Participants</th>
                <th class="num-col">Passed</th>
                <th class="num-col">Avg score</th>
            </tr>
            @foreach ($by_environment as $row)
            <tr>
                <td class="name">{{ ucfirst($row['environment']) }}</td>
                <td class="num-col">{{ $row['simulations'] }}</td>
                <td class="num-col">{{ $row['passed'] }}</td>
                <td class="num-col">
                    {{ $row['average_score'] > 0 ? $row['average_score'] . '%' : '—' }}
                </td>
            </tr>
            @endforeach
        </table>

        {{-- Only worth a section when both groups attended. One row and
             one empty row tells the reader nothing. --}}
        @if ($by_organization->count() > 1)
        <h2>Performance by organization</h2>
        <table class="data">
            <tr>
                <th>Organization</th>
                <th class="num-col">Registered</th>
                <th class="num-col">Played</th>
                <th class="num-col">Passed</th>
                <th class="num-col">Pass rate</th>
                <th class="num-col">Avg score</th>
            </tr>
            @foreach ($by_organization as $row)
            <tr>
                <td class="name">{{ $row['organization'] }}</td>
                <td class="num-col">{{ $row['registered'] }}</td>
                <td class="num-col">{{ $row['played'] }}</td>
                <td class="num-col">{{ $row['passed'] }}</td>
                <td class="num-col">{{ $row['pass_rate'] }}%</td>
                <td class="num-col">
                    {{ $row['average_score'] > 0 ? $row['average_score'] . '%' : '—' }}
                </td>
            </tr>
            @endforeach
        </table>
        @endif

        {{-- One row per PERSON. Environment columns come from the fixed
             list, so Classroom is present now and fills automatically
             once it is playable. --}}
        <h2>Participant results</h2>
        <table class="data">
            <tr>
                <th style="width:20px;">#</th>
                <th>Participant</th>
                <th>Organization</th>
                @foreach ($environments as $env)
                    <th class="num-col">{{ ucfirst($env) }}</th>
                @endforeach
            </tr>
            @foreach ($participants as $i => $p)
            <tr>
                <td class="idx">{{ $i + 1 }}</td>
                <td class="name">{{ $p['name'] }}</td>
                <td class="sub">{{ $p['organization'] }}</td>
                @foreach ($environments as $env)
                    @php $r = $p['results'][$env] ?? null; @endphp
                    <td class="num-col">
                        @if ($r)
                            <div>{{ $r['score'] }}%</div>
                            <div class="tag {{ $r['passed'] ? 'tag-pass' : 'tag-fail' }}">
                                {{ $r['label'] }}
                            </div>
                        @else
                            <span class="blank">&mdash;</span>
                        @endif
                    </td>
                @endforeach
            </tr>
            @endforeach
        </table>

    @endif

    @if ($did_not_play->count() > 0)
        <h2>Did not play</h2>
        @if ($did_not_play->count() <= 15)
            <table class="data">
                <tr>
                    <th style="width:20px;">#</th>
                    <th>Participant</th>
                    <th>Organization</th>
                </tr>
                @foreach ($did_not_play as $i => $p)
                <tr>
                    <td class="idx">{{ $i + 1 }}</td>
                    <td class="name">{{ $p['name'] }}</td>
                    <td class="sub">{{ $p['organization'] }}</td>
                </tr>
                @endforeach
            </table>
        @else
            <p class="note">
                {{ $did_not_play->count() }} registered participants did not play
                the simulation. The full list is available in the participants
                view for this event.
            </p>
        @endif
    @endif

    @if ($follow_up_count > 0)
    <table class="flag">
        <tr><td>
            {{ $follow_up_count }}
            {{ $follow_up_count === 1 ? 'participant needs' : 'participants need' }}
            more training. See the Needs More Training report for this event.
        </td></tr>
    </table>
    @endif

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