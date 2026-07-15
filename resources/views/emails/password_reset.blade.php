<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #f4f6f8; font-family: Arial, sans-serif; padding: 32px 16px; }
    </style>
</head>
<body>
    <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;">

                    <tr>
                        <td height="4" style="background:#c0392b; border-radius:4px 4px 0 0; font-size:0;">&nbsp;</td>
                    </tr>

                    <tr>
                        <td style="background:#ffffff; border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb; padding:32px 36px 28px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <span style="display:inline-block; background:#fdf2f2; border:1px solid #fcd5d5; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:#9b1c1c; letter-spacing:1px; text-transform:uppercase;">
                                            Bureau of Fire Protection &mdash; Natividad Station
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top:16px;">
                                        <p style="font-size:19px; font-weight:700; color:#111827; margin:0 0 8px;">Password reset request</p>
                                        <p style="font-size:13px; color:#6b7280; margin:0; line-height:1.5;">Hello, <strong style="color:#111827;">{{ $firstName }}</strong>. We received a request to reset your FireOps account password.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td height="1" style="background:#f0f0f0; border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb; font-size:0;">&nbsp;</td>
                    </tr>

                    <tr>
                        <td style="background:#ffffff; border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb; padding:28px 36px;">

                            <p style="font-size:13px; color:#374151; line-height:1.7; margin:0 0 24px; padding-bottom:24px; border-bottom:1px solid #f3f4f6;">
                                Click the button below to reset your password. This link is valid for <strong>60 minutes</strong> only.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $resetUrl }}" style="display:inline-block; background:#c0392b; color:#ffffff; text-align:center; padding:14px 32px; border-radius:8px; font-size:14px; font-weight:600; text-decoration:none;">
                                            Reset my password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
                                <tr>
                                    <td width="6" style="background:#f59e0b; border-radius:8px 0 0 8px;">&nbsp;</td>
                                    <td style="background:#f9fafb; border:1px solid #e5e7eb; border-left:none; border-radius:0 8px 8px 0; padding:14px 16px;">
                                        <p style="font-size:12px; color:#6b7280; line-height:1.6; margin:0;">
                                            If you did not request a password reset, ignore this email. Your password will not change.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <tr>
                        <td style="background:#f9fafb; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 12px 12px; padding:18px 36px; text-align:center;">
                            <p style="font-size:11px; color:#9ca3af; line-height:1.7; margin:0;">
                                This is an automated message from FireOps Admin.<br>
                                Do not reply to this email &mdash; &copy; {{ date('Y') }} BFP Natividad Station
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>