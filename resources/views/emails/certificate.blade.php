<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background:#eeeeee; font-family:'Segoe UI',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#eeeeee; padding:24px 12px;">
<tr><td align="center">

    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px; background:#ffffff; border-radius:12px; overflow:hidden;">

        <!-- Header -->
        <tr>
            <td style="background:#b8271a; padding:22px 26px; text-align:center;">
                <div style="font-size:12px; font-weight:bold; color:#ffffff; letter-spacing:2px;">
                    BUREAU OF FIRE PROTECTION
                </div>
                <div style="font-size:11px; color:#f6d5d1; margin-top:4px; letter-spacing:.6px;">
                    Natividad Station &middot; FireOps Training System
                </div>
            </td>
        </tr>

        <!-- Body -->
        <tr>
            <td style="padding:30px 26px 8px;">
                <div style="font-size:20px; font-weight:bold; color:#0a0a0a;">
                    Congratulations, {{ $participantName }}!
                </div>
                <div style="font-size:14px; color:#2e2e2e; line-height:1.7; margin-top:12px;">
                    You've successfully completed the
                    <strong style="color:#b8271a;">{{ ucfirst($environment) }}</strong>
                    fire safety simulation during <strong>{{ $eventName }}</strong>.
                </div>
            </td>
        </tr>

        <!-- Score summary -->
        <tr>
            <td style="padding:20px 26px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5; border-radius:9px;">
                    <tr>
                        <td style="padding:14px 18px; text-align:center; border-right:1px solid #e2e2e2;">
                            <div style="font-size:10px; color:#8f8f8f; letter-spacing:1.2px;">SCORE</div>
                            <div style="font-size:20px; font-weight:bold; color:#14562a; margin-top:3px;">
                                {{ $percentageScore }}%
                            </div>
                        </td>
                        <td style="padding:14px 18px; text-align:center;">
                            <div style="font-size:10px; color:#8f8f8f; letter-spacing:1.2px;">RATING</div>
                            <div style="font-size:20px; font-weight:bold; color:#14562a; margin-top:3px;">
                                {{ $scoreLabel }}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Attachment note -->
        <tr>
            <td style="padding:22px 26px 0;">
                <div style="font-size:13.5px; color:#2e2e2e; line-height:1.7;">
                    Your certificate is attached to this email as a PDF. You can save it,
                    print it, or share it as proof of completion.
                </div>
            </td>
        </tr>

        <!-- Verify -->
        <tr>
            <td style="padding:22px 26px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf3f2; border-left:3px solid #b8271a;">
                    <tr>
                        <td style="padding:14px 16px;">
                            <div style="font-size:12px; font-weight:bold; color:#7d1a10;">
                                Verify this certificate
                            </div>
                            <div style="font-size:12.5px; color:#616161; line-height:1.6; margin-top:5px;">
                                Anyone can confirm this certificate is genuine at:
                            </div>
                            <div style="margin-top:8px;">
                                <a href="{{ $verifyUrl }}" style="font-size:12.5px; color:#b8271a; word-break:break-all;">
                                    {{ $verifyUrl }}
                                </a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="padding:26px; text-align:center;">
                <div style="border-top:1px solid #e2e2e2; padding-top:16px; font-size:11px; color:#8f8f8f; line-height:1.7;">
                    This is an automated message from the FireOps Training System.<br>
                    Bureau of Fire Protection &middot; Natividad Station
                </div>
            </td>
        </tr>

    </table>

</td></tr>
</table>

</body>
</html>