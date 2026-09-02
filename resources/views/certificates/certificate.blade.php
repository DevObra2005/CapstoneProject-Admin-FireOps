{{--
    FireOps — Certificate of Completion (PDF template)

    dompdf does NOT support flexbox or CSS grid.
    Layout uses tables and absolute positioning only.

    ------------------------------------------------------------------
    STILL REQUIRES BFP SIGN-OFF (search "BFP-APPROVAL" to find each one)
    ------------------------------------------------------------------
    1. Government letterhead hierarchy — confirm exact office naming
    2. Signatory title (name is hand-signed, not printed)
    3. Body paragraph wording
    4. Whether the scope disclaimer is acceptable to them

    The wording currently in this file is a PROPOSAL drafted for BFP
    to approve or amend. It is not yet approved.

    SIGNATURE: the space above the signature line is left blank for a
    handwritten signature on printed copies. To switch to a scanned
    signature later, pass $signatureImage as a base64 data URI —
    dompdf cannot fetch images over HTTP.
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

    .content { position:absolute; top:62px; left:74px; right:74px; text-align:center; }

    .logos { width:100%; border-collapse:collapse; margin-bottom:10px; }
    .logos td { vertical-align:middle; }
    .logo-l { text-align:left;  width:96px; }
    .logo-r { text-align:right; width:96px; }
    .logo-img { width:74px; height:74px; }

    /* Government letterhead hierarchy — smallest to largest */
    .gov-1 { font-size:9px;  color:#616161; letter-spacing:0.8px; }
    .gov-2 { font-size:8px;  color:#8f8f8f; letter-spacing:0.6px; margin-top:2px; }
    .org-1 { font-size:15px; font-weight:bold; color:#b8271a; letter-spacing:2.6px; margin-top:5px; }
    .org-2 { font-size:10px; color:#616161; letter-spacing:1.2px; margin-top:3px; }
    .org-3 { font-size:10px; font-weight:bold; color:#3d3d3d; letter-spacing:1.4px; margin-top:2px; }

    .rule { width:190px; height:2px; background:#b8271a; margin:14px auto 0; }

    .title { font-size:44px; font-weight:bold; color:#1a1a1a; letter-spacing:1px; margin:16px 0 6px; }
    .subtitle { font-size:12px; color:#616161; letter-spacing:3.4px; }

    .presented { font-size:12px; color:#616161; margin-top:26px; }

    .name-wrap { margin-top:8px; }
    .name {
        font-size:40px; font-weight:bold; color:#0a0a0a;
        padding-bottom:10px; display:inline-block;
        border-bottom:2px solid #b8271a; min-width:440px;
    }

    .body-txt { font-size:13px; color:#2e2e2e; line-height:1.8; margin-top:18px; }
    .env { font-weight:bold; color:#b8271a; }
    .evt { font-weight:bold; color:#0a0a0a; }

    .chips { margin:20px auto 0; border-collapse:separate; border-spacing:9px 0; }
    .chip { background:#f5f5f5; border:1px solid #d6d6d6; padding:9px 22px; text-align:center; }
    .chip-l { font-size:9px; color:#8f8f8f; letter-spacing:1.5px; }
    .chip-v { font-size:18px; font-weight:bold; color:#14562a; margin-top:3px; }
    .chip-date .chip-v { color:#0a0a0a; font-size:13px; }

    .footer { position:absolute; left:74px; right:74px; bottom:72px; }
    .foot-tbl { width:100%; border-collapse:collapse; }
    .foot-tbl td { vertical-align:bottom; }

    .sig-cell { text-align:left; width:290px; }

    /* Reserved room for a handwritten signature. Empty by design.
       font-size/line-height forced to 1px so the div cannot collapse
       or inherit a text line box in dompdf. */
    .sig-space { width:250px; height:54px; font-size:1px; line-height:1px; }
    .sig-img   { height:50px; }

    .sig-line { border-top:1.5px solid #0a0a0a; padding-top:6px; width:250px; }
    .sig-role { font-size:11px; font-weight:bold; color:#0a0a0a; letter-spacing:0.4px; }
    .sig-org  { font-size:9px;  color:#616161; margin-top:3px; }

    .code-cell { text-align:center; }
    .code-l { font-size:8px; color:#8f8f8f; letter-spacing:1.4px; }
    .code-v { font-size:9px; color:#616161; margin-top:3px; }

    .qr-cell { text-align:right; width:200px; }
    .qr-img { width:86px; height:86px; }
    .qr-cap { font-size:8px; color:#8f8f8f; margin-top:5px; }

    .disclaimer {
        position:absolute; left:74px; right:74px; bottom:42px;
        text-align:center; font-size:7.5px; color:#9a9a9a;
        line-height:1.5;
    }
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
                    @if(!empty($bfpLogo))
                        <img class="logo-img" src="{{ $bfpLogo }}">
                    @endif
                </td>
                <td style="text-align:center;">
                    {{-- BFP-APPROVAL #1: letterhead hierarchy and exact office naming --}}
                    <div class="gov-1">Republic of the Philippines</div>
                    <div class="gov-2">Department of the Interior and Local Government</div>
                    <div class="org-1">BUREAU OF FIRE PROTECTION</div>
                    <div class="org-2">Region I &middot; Pangasinan Provincial Office</div>
                    <div class="org-3">NATIVIDAD FIRE STATION</div>
                </td>
                <td class="logo-r">
                    @if(!empty($fireopsLogo))
                        <img class="logo-img" src="{{ $fireopsLogo }}">
                    @endif
                </td>
            </tr>
        </table>

        <div class="rule"></div>

        <div class="title">Certificate of Completion</div>
        <div class="subtitle">SIMULATION-BASED FIRE SAFETY TRAINING</div>

        <div class="presented">This certificate is proudly presented to</div>
        <div class="name-wrap">
            <span class="name">{{ $participantName ?? '—' }}</span>
        </div>

        {{-- BFP-APPROVAL #3: body paragraph wording --}}
        <div class="body-txt">
            for successfully completing the
            <span class="env">{{ ucfirst($environment ?? 'fire safety') }}</span>
            simulation module and demonstrating competency in hazard identification,
            fire suppression procedure, and emergency evacuation,<br>
            conducted during <span class="evt">{{ $eventName ?? 'a FireOps training activity' }}</span>.
        </div>

        <table class="chips" align="center">
            <tr>
                <td class="chip">
                    <div class="chip-l">SCORE</div>
                    <div class="chip-v">{{ $percentageScore ?? 0 }}%</div>
                </td>
                <td class="chip">
                    <div class="chip-l">RATING</div>
                    <div class="chip-v">{{ $scoreLabel ?? '—' }}</div>
                </td>
                <td class="chip chip-date">
                    <div class="chip-l">DATE ISSUED</div>
                    <div class="chip-v">{{ $issuedAt ?? '—' }}</div>
                </td>
            </tr>
        </table>

    </div>

    <div class="footer">
        <table class="foot-tbl">
            <tr>
                <td class="sig-cell">

                    {{-- Blank signing room. Drops in a scanned signature
                         automatically if $signatureImage is ever provided. --}}
                    <div class="sig-space">
                        @if(!empty($signatureImage))
                            <img class="sig-img" src="{{ $signatureImage }}">
                        @endif
                    </div>

                    <div class="sig-line">
                        {{-- BFP-APPROVAL #2: signatory title --}}
                        <div class="sig-role">{{ $signatoryTitle ?? 'Municipal Fire Marshal' }}</div>
                        <div class="sig-org">Bureau of Fire Protection &middot; Natividad Fire Station</div>
                    </div>
                </td>
                <td class="code-cell">
                    <div class="code-l">VERIFICATION CODE</div>
                    <div class="code-v">{{ $verificationCode ?? '—' }}</div>
                </td>
                <td class="qr-cell">
                    @if(!empty($qrCode))
                        <img class="qr-img" src="{{ $qrCode }}">
                    @endif
                    <div class="qr-cap">Scan to verify</div>
                </td>
            </tr>
        </table>
    </div>

    {{-- BFP-APPROVAL #4: scope disclaimer --}}
    <div class="disclaimer">
        This certificate recognizes completion of a simulation-based training exercise conducted through the FireOps
        training system. It does not constitute a fire safety inspection certificate, occupancy permit, or professional
        fire safety certification under RA 9514.
    </div>

</body>
</html>