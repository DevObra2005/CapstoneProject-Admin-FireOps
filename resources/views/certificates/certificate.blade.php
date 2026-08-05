{{--
    FireOps — Certificate of Completion (PDF template)

    NOTE: dompdf does NOT support flexbox or CSS grid.
    Layout uses tables and absolute positioning only.

    Values marked "PENDING BFP APPROVAL" are placeholders
    and should be updated once BFP confirms the wording.
--}}
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 0; size: A4 landscape; }

    body {
        margin: 0;
        font-family: DejaVu Sans, sans-serif;
        width: 1123px;
        height: 794px;
        position: relative;
    }

    .frame-outer { position:absolute; top:14px; left:14px; right:14px; bottom:14px; border:6px solid #b8271a; }
    .frame-inner { position:absolute; top:26px; left:26px; right:26px; bottom:26px; border:1px solid #d8a49e; }

    .tick { position:absolute; width:34px; height:34px; border:0 solid #b8271a; }
    .tick-tl { top:36px;  left:36px;  border-top-width:4px; border-left-width:4px; }
    .tick-tr { top:36px;  right:36px; border-top-width:4px; border-right-width:4px; }
    .tick-bl { bottom:36px; left:36px;  border-bottom-width:4px; border-left-width:4px; }
    .tick-br { bottom:36px; right:36px; border-bottom-width:4px; border-right-width:4px; }

    .content { position:absolute; top:70px; left:74px; right:74px; text-align:center; }

    .logos { width:100%; border-collapse:collapse; margin-bottom:14px; }
    .logos td { vertical-align:middle; }
    .logo-l { text-align:left;  width:96px; }
    .logo-r { text-align:right; width:96px; }
    .logo-img { width:74px; height:74px; }

    .org-1 { font-size:15px; font-weight:bold; color:#b8271a; letter-spacing:2.6px; }
    .org-2 { font-size:11px; color:#616161; letter-spacing:1.4px; margin-top:3px; }

    .rule { width:190px; height:2px; background:#b8271a; margin:16px auto 0; }

    .title { font-size:44px; font-weight:bold; color:#1a1a1a; letter-spacing:1px; margin:18px 0 6px; }
    .subtitle { font-size:12px; color:#616161; letter-spacing:3.4px; }

    .presented { font-size:12px; color:#616161; margin-top:32px; }

    .name-wrap { margin-top:8px; }
    .name {
        font-size:40px; font-weight:bold; color:#0a0a0a;
        padding-bottom:10px; display:inline-block;
        border-bottom:2px solid #b8271a; min-width:440px;
    }

    .body-txt { font-size:13px; color:#2e2e2e; line-height:1.85; margin-top:20px; }
    .env { font-weight:bold; color:#b8271a; }
    .evt { font-weight:bold; color:#0a0a0a; }

    .chips { margin:24px auto 0; border-collapse:separate; border-spacing:9px 0; }
    .chip { background:#f5f5f5; border:1px solid #d6d6d6; padding:9px 22px; text-align:center; }
    .chip-l { font-size:9px; color:#8f8f8f; letter-spacing:1.5px; }
    .chip-v { font-size:18px; font-weight:bold; color:#14562a; margin-top:3px; }
    .chip-date .chip-v { color:#0a0a0a; font-size:13px; }

    .footer { position:absolute; left:74px; right:74px; bottom:74px; }
    .foot-tbl { width:100%; border-collapse:collapse; }
    .foot-tbl td { vertical-align:bottom; }

    .sig-cell { text-align:left; width:290px; }
    .sig-line { border-top:1.5px solid #0a0a0a; padding-top:7px; width:250px; }
    .sig-role { font-size:11px; font-weight:bold; color:#0a0a0a; }
    .sig-org  { font-size:10px; color:#616161; margin-top:2px; }

    .code-cell { text-align:center; }
    .code-l { font-size:8px; color:#8f8f8f; letter-spacing:1.4px; }
    .code-v { font-size:9px; color:#616161; margin-top:3px; }

    .qr-cell { text-align:right; width:200px; }
    .qr-img { width:86px; height:86px; }
    .qr-cap { font-size:8px; color:#8f8f8f; margin-top:5px; }
</style>
</head>
<body>

    <div class="frame-outer"></div>
    <div class="frame-inner"></div>
    <div class="tick tick-tl"></div>
    <div class="tick tick-tr"></div>
    <div class="tick tick-bl"></div>
    <div class="tick tick-br"></div>

    <div class="content">

        <table class="logos">
            <tr>
                <td class="logo-l">
                    @if($bfpLogo)
                        <img class="logo-img" src="{{ $bfpLogo }}">
                    @endif
                </td>
                <td style="text-align:center;">
                    {{-- PENDING BFP APPROVAL — exact header wording --}}
                    <div class="org-1">BUREAU OF FIRE PROTECTION</div>
                    <div class="org-2">NATIVIDAD STATION &middot; REPUBLIC OF THE PHILIPPINES</div>
                </td>
                <td class="logo-r">
                    @if($fireopsLogo)
                        <img class="logo-img" src="{{ $fireopsLogo }}">
                    @endif
                </td>
            </tr>
        </table>

        <div class="rule"></div>

        <div class="title">Certificate of Completion</div>
        <div class="subtitle">FIRE SAFETY SIMULATION TRAINING</div>

        <div class="presented">This certificate is proudly presented to</div>
        <div class="name-wrap">
            <span class="name">{{ $participantName }}</span>
        </div>

        {{-- PENDING BFP APPROVAL — body wording --}}
        <div class="body-txt">
            for successfully completing the <span class="env">{{ ucfirst($environment) }}</span>
            fire safety simulation and demonstrating proficiency in hazard identification
            and emergency response,<br>
            conducted during <span class="evt">{{ $eventName }}</span>.
        </div>

        <table class="chips" align="center">
            <tr>
                <td class="chip">
                    <div class="chip-l">SCORE</div>
                    <div class="chip-v">{{ $percentageScore }}%</div>
                </td>
                <td class="chip">
                    <div class="chip-l">RATING</div>
                    <div class="chip-v">{{ $scoreLabel }}</div>
                </td>
                <td class="chip chip-date">
                    <div class="chip-l">DATE ISSUED</div>
                    <div class="chip-v">{{ $issuedAt }}</div>
                </td>
            </tr>
        </table>

    </div>

    <div class="footer">
        <table class="foot-tbl">
            <tr>
                <td class="sig-cell">
                    <div class="sig-line">
                        {{-- PENDING BFP APPROVAL — signatory title --}}
                        <div class="sig-role">Chief, Fire Safety Enforcement</div>
                        <div class="sig-org">Bureau of Fire Protection &middot; Natividad Station</div>
                    </div>
                </td>
                <td class="code-cell">
                    <div class="code-l">VERIFICATION CODE</div>
                    <div class="code-v">{{ $verificationCode }}</div>
                </td>
                <td class="qr-cell">
                    <img class="qr-img" src="{{ $qrCode }}">
                    <div class="qr-cap">Scan to verify</div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>