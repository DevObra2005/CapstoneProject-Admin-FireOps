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

                    {{-- Top red bar --}}
                    <tr>
                        <td height="4" style="background:#c0392b; border-radius:4px 4px 0 0; font-size:0;">&nbsp;</td>
                    </tr>

                    {{-- Header --}}
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
                                        <p style="font-size:19px; font-weight:700; color:#111827; margin:0 0 8px;">Your FireOps account is ready</p>
                                        <p style="font-size:13px; color:#6b7280; margin:0; line-height:1.5;">Hello, <strong style="color:#111827;">{{ $staffName }}</strong>. Your staff account has been created by the system administrator.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Divider --}}
                    <tr>
                        <td height="1" style="background:#f0f0f0; border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb; font-size:0;">&nbsp;</td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td style="background:#ffffff; border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb; padding:28px 36px;">

                            {{-- Intro --}}
                            <p style="font-size:13px; color:#374151; line-height:1.7; margin:0 0 24px; padding-bottom:24px; border-bottom:1px solid #f3f4f6;">
                                Use the credentials below to sign in to FireOps Admin Portal. Keep your password private and do not share it with anyone.
                            </p>

                            {{-- Credentials label --}}
                            <p style="font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#9ca3af; margin:0 0 12px;">
                                Login credentials
                            </p>

                            {{-- Credentials card --}}
                            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin-bottom:24px;">
                                {{-- Email row --}}
                                <tr>
                                    <td style="padding:14px 18px; border-bottom:1px solid #f3f4f6;">
                                        <p style="font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9ca3af; margin:0 0 5px;">Email address</p>
                                        <p style="font-size:14px; color:#111827; font-weight:600; margin:0;">{{ $email }}</p>
                                    </td>
                                </tr>
                                {{-- Password row --}}
                                <tr>
                                    <td style="padding:14px 18px;">
                                        <p style="font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9ca3af; margin:0 0 5px;">Password</p>
                                        <p style="margin:0;">
                                            <span style="font-family:'Courier New',monospace; font-size:16px; font-weight:700; color:#c0392b; background:#fdf2f2; padding:4px 12px; border-radius:5px; letter-spacing:3px;">{{ $plainPassword }}</span>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            {{-- Notice --}}
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:24px;">
                                <tr>
                                    <td width="6" style="background:#c0392b; border-radius:8px 0 0 8px;">&nbsp;</td>
                                    <td style="padding:14px 16px;">
                                        <p style="font-size:12px; color:#6b7280; line-height:1.6; margin:0;">
                                            This password was auto-generated. You may change it after signing in. If you did not expect this email, please contact your station administrator.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            {{-- Button --}}
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="{{ config('app.url') }}" style="display:block; background:#c0392b; color:#ffffff; text-align:center; padding:14px 20px; border-radius:8px; font-size:14px; font-weight:600; text-decoration:none;">
                                            Sign in to FireOps Admin
                                        </a>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    {{-- Footer --}}
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