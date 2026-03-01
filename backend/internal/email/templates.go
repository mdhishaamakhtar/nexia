package email

import "fmt"

func buildVerificationEmailHTML(verifyURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Nexia email</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Plus Jakarta Sans','Segoe UI',sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:40px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#1d1d1f;letter-spacing:-0.01em;">Nexia</p>
              <p style="margin:4px 0 0;font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#6e6e73;">your digital slambook</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(0,0,0,0.08);padding-top:24px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#6e6e73;">Verify your email</p>
              <p style="margin:0 0 20px;font-size:15px;color:#1d1d1f;line-height:1.5;">
                Thanks for signing up! Click the button below to verify your email address and activate your Nexia account.
              </p>
              <p style="margin:0 0 20px;font-size:13px;color:#6e6e73;line-height:1.5;">
                This link expires in <strong style="color:#1d1d1f;">24 hours</strong> and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%%">
                <tr>
                  <td align="center">
                    <a href="%s" style="display:inline-block;background:#007aff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:12px;padding:14px 32px;letter-spacing:0.01em;">Verify Email Address</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#6e6e73;line-height:1.5;">
                If you didn't create a Nexia account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(0,0,0,0.08);padding-top:20px;margin-top:24px;">
              <p style="margin:0;font-size:12px;color:#6e6e73;text-align:center;">© Nexia · your digital slambook</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, verifyURL)
}

func buildPasswordResetEmailHTML(token, resetURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Nexia password</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Plus Jakarta Sans','Segoe UI',sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:40px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#1d1d1f;letter-spacing:-0.01em;">Nexia</p>
              <p style="margin:4px 0 0;font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#6e6e73;">your digital slambook</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(0,0,0,0.08);padding-top:24px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#6e6e73;">Password reset</p>
              <p style="margin:0 0 20px;font-size:15px;color:#1d1d1f;line-height:1.5;">
                We received a request to reset your Nexia password. Use the code below or click the button to set a new password.
              </p>
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#6e6e73;">Reset token</p>
              <div style="background:#f5f5f7;border-radius:12px;padding:14px 16px;margin-bottom:20px;font-family:ui-monospace,'SF Mono','Fira Code',monospace;font-size:13px;color:#1d1d1f;letter-spacing:0.08em;word-break:break-all;">%s</div>
              <p style="margin:0 0 20px;font-size:13px;color:#6e6e73;line-height:1.5;">
                This link expires in <strong style="color:#1d1d1f;">15 minutes</strong> and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%%">
                <tr>
                  <td align="center">
                    <a href="%s" style="display:inline-block;background:#007aff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:12px;padding:14px 32px;letter-spacing:0.01em;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#6e6e73;line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(0,0,0,0.08);padding-top:20px;margin-top:24px;">
              <p style="margin:0;font-size:12px;color:#6e6e73;text-align:center;">© Nexia · your digital slambook</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, token, resetURL)
}
