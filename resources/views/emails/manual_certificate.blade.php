{{--
    Email body for a manually issued certificate.
    Emails use TABLES and INLINE styles because Gmail and Outlook
    strip <style> blocks and ignore flexbox. Old-school, but it's
    the only layout that looks the same in every inbox.
--}}
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:#f4f4f4; font-family:Arial, Helvetica, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4; padding:32px 12px;">
    <tr>
        <td align="center">

            <table width="100%" cellpadding="0" cellspacing="0"
                   style="max-width:560px; background:#ffffff; border-radius:10px; overflow:hidden;">

                {{-- Red top bar --}}
                <tr>
                    <td style="background:#c0392b; height:6px; font-size:0; line-height:0;">&nbsp;</td>
                </tr>

                <tr>
                    <td style="padding:32px 36px 8px;">
                        <div style="font-size:12px; color:#c0392b; font-weight:bold; letter-spacing:1px;">
                            BUREAU OF FIRE PROTECTION - NATIVIDAD STATION
                        </div>
                        <h1 style="margin:10px 0 0; font-size:22px; color:#1a1a1a;">
                            Your certificate is attached
                        </h1>
                    </td>
                </tr>

                <tr>
                    <td style="padding:16px 36px 28px; font-size:14px; line-height:1.6; color:#333333;">
                        <p style="margin:0 0 14px;">
                            Good day, <strong>{{ $cert->recipient_name }}</strong>.
                        </p>
                        <p style="margin:0 0 14px;">
                            The Bureau of Fire Protection - Natividad Fire Station has issued a
                            certificate to you, given on
                            <strong>{{ $cert->given_date->format('F j, Y') }}</strong>.
                        </p>
                        <p style="margin:0;">
                            Please find the certificate attached to this email as a PDF.
                            You may print it on A4 paper in landscape orientation.
                        </p>
                    </td>
                </tr>

                <tr>
                    <td style="padding:18px 36px 28px; border-top:1px solid #eeeeee;
                               font-size:12px; color:#888888; line-height:1.5;">
                        This is an automated message from FireOps, the fire safety training
                        system of BFP Natividad. Please do not reply to this email.
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>
</html>