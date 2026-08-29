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
                                        @if ($plainPassword)
                                            <p style="font-size:19px; font-weight:700; color:#111827; margin:0 0 8px;">Your FireOps account is ready</p>
                                            <p style="font-size:13px; color:#6b7280; margin:0; line-height:1.5;">Hello, <strong style="color:#111827;">{{ $participant->name }}</strong>. An account has been created for you and you are registered for the training event below.</p>
                                        @else
                                            <p style="font-size:19px; font-weight:700; color:#111827; margin:0 0 8px;">You&rsquo;re registered for a training event</p>
                                            <p style="font-size:13px; color:#6b7280; margin:0; line-height:1.5;">Hello, <strong style="color:#111827;">{{ $participant->name }}</strong>. You have been added to the fire safety training event below.</p>
                                        @endif
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
                                @if ($plainPassword)
                                    Please attend the session below. Your login details are included so you can sign in to the FireOps training app on your Android device.
                                @else
                                    Please attend the session below. Sign in to the FireOps app using the account you already have &mdash; your existing password has not changed.
                                @endif
                            </p>

                            {{-- Event details label --}}
                            <p style="font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#9ca3af; margin:0 0 12px;">
                                Event details
                            </p>

                            {{-- Event card --}}
                            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin-bottom:24px;">
                                <tr>
                                    <td style="padding:14px 18px; border-bottom:1px solid #f3f4f6;">
                                        <p style="font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9ca3af; margin:0 0 5px;">Event</p>
                                        <p style="font-size:14px; color:#111827; font-weight:600; margin:0;">{{ $event->name }}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 18px; border-bottom:1px solid #f3f4f6;">
                                        <p style="font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9ca3af; margin:0 0 5px;">Date</p>
                                        <p style="font-size:14px; color:#111827; font-weight:600; margin:0;">
                                            {{ \Carbon\Carbon::parse($event->date)->format('F j, Y') }}
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 18px;">
                                        <p style="font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9ca3af; margin:0 0 5px;">Venue</p>
                                        <p style="font-size:14px; color:#111827; font-weight:600; margin:0;">{{ $event->location_name ?: 'To be announced' }}</p>
                                    </td>
                                </tr>
                            </table>

                            {{-- Credentials label --}}
                            <p style="font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#9ca3af; margin:0 0 12px;">
                                @if ($plainPassword) Login credentials @else Your login email @endif
                            </p>

                            {{-- Credentials card --}}
                            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin-bottom:24px;">
                                {{-- Email row --}}
                                <tr>
                                    <td style="padding:14px 18px; @if ($plainPassword) border-bottom:1px solid #f3f4f6; @endif">
                                        <p style="font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9ca3af; margin:0 0 5px;">Email address</p>
                                        <p style="font-size:14px; color:#111827; font-weight:600; margin:0;">{{ $participant->email }}</p>
                                    </td>
                                </tr>
                                {{-- Password row: brand new accounts only --}}
                                @if ($plainPassword)
                                <tr>
                                    <td style="padding:14px 18px 10px;">
                                        <p style="font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#9ca3af; margin:0 0 5px;">Password</p>
                                        <p style="margin:0;">
                                            <span style="font-family:'Courier New',monospace; font-size:16px; font-weight:700; color:#c0392b; background:#fdf2f2; padding:4px 12px; border-radius:5px; letter-spacing:3px;">{{ $plainPassword }}</span>
                                        </p>
                                    </td>
                                </tr>
                                {{-- Change password link --}}
                                <tr>
                                    <td style="padding:0 18px 16px;">
                                        <a href="{{ $changePasswordUrl }}" style="font-size:12px; font-weight:600; color:#c0392b; text-decoration:underline;">
                                            Change this password &rarr;
                                        </a>
                                    </td>
                                </tr>
                                @endif
                            </table>

                            {{-- Getting started --}}
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:24px;">
                                <tr>
                                    <td width="6" style="background:#c0392b; border-radius:8px 0 0 8px;">&nbsp;</td>
                                    <td style="padding:14px 16px;">
                                        <p style="font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#6b7280; margin:0 0 8px;">Getting started</p>
                                        <p style="font-size:12px; color:#6b7280; line-height:1.7; margin:0;">
                                            Open the <strong style="color:#374151;">FireOps</strong> app on your Android device and sign in with the email address above.
                                            @if ($plainPassword)
                                                This password was auto-generated &mdash; keep it private and do not share it with anyone. You can replace it with one you&rsquo;ll remember using the link above.
                                            @endif
                                            If you did not expect this email, please contact your station administrator.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="background:#f9fafb; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 12px 12px; padding:18px 36px; text-align:center;">
                            <p style="font-size:11px; color:#9ca3af; line-height:1.7; margin:0;">
                                This is an automated message from FireOps.<br>
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