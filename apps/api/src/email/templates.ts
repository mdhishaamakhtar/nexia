export function buildVerificationEmailHTML(verifyURL: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Nexia email</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <!-- Preheader -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Verify your email to activate your Nexia account &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:48px 16px;">
    <tr>
      <td align="center">
        <!-- Card with slight tilt -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffbf5;border-radius:24px;border:1px solid rgba(148,163,184,0.28);box-shadow:0 4px 24px rgba(0,0,0,0.06);transform:rotate(-0.5deg);padding:0;">
          <tr>
            <td style="position:relative;padding:40px 40px 0;">
              <!-- Washi tape strip -->
              <div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%) rotate(-2deg);width:80px;height:18px;background:#c4b5fd;border-radius:4px;opacity:0.85;"></div>
              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <p style="margin:0;font-size:24px;font-weight:800;color:#1f2937;letter-spacing:-0.01em;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Nexia</p>
                    <p style="margin:4px 0 0;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">your digital slambook</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(148,163,184,0.2);padding:24px 40px 0;">
              <!-- Sticker chip label -->
              <p style="margin:0 0 16px;display:inline-block;">
                <span style="background:rgba(196,181,253,0.25);color:#5b21b6;border-radius:999px;padding:3px 12px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Verify your email</span>
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                Thanks for signing up! Click the button below to verify your email address and activate your Nexia account.
              </p>
              <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.5;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                This link expires in <strong style="color:#1f2937;">24 hours</strong> and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <a href="${verifyURL}" style="display:inline-block;background:#007aff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:12px;padding:14px 32px;letter-spacing:0.01em;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Verify Email Address</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:12px;color:#6b7280;line-height:1.5;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                If you didn't create a Nexia account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(148,163,184,0.2);padding:20px 40px;">
              <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">✦ Nexia · your digital slambook</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildPasswordResetEmailHTML(token: string, resetURL: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Nexia password</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <!-- Preheader -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Reset your Nexia password — expires in 15 minutes &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:48px 16px;">
    <tr>
      <td align="center">
        <!-- Card with slight tilt -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffbf5;border-radius:24px;border:1px solid rgba(148,163,184,0.28);box-shadow:0 4px 24px rgba(0,0,0,0.06);transform:rotate(-0.5deg);padding:0;">
          <tr>
            <td style="position:relative;padding:40px 40px 0;">
              <!-- Washi tape strip (peach) -->
              <div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%) rotate(-2deg);width:80px;height:18px;background:#fdba74;border-radius:4px;opacity:0.85;"></div>
              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <p style="margin:0;font-size:24px;font-weight:800;color:#1f2937;letter-spacing:-0.01em;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Nexia</p>
                    <p style="margin:4px 0 0;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">your digital slambook</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(148,163,184,0.2);padding:24px 40px 0;">
              <!-- Sticker chip label -->
              <p style="margin:0 0 16px;display:inline-block;">
                <span style="background:rgba(196,181,253,0.25);color:#5b21b6;border-radius:999px;padding:3px 12px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Password reset</span>
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                We received a request to reset your Nexia password. Use the code below or click the button to set a new password.
              </p>
              <!-- Reset token box (lavender-tinted) -->
              <p style="margin:0 0 8px;display:inline-block;">
                <span style="background:rgba(196,181,253,0.25);color:#5b21b6;border-radius:999px;padding:3px 12px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Reset token</span>
              </p>
              <div style="background:rgba(196,181,253,0.12);border:1px solid rgba(196,181,253,0.4);border-radius:12px;padding:14px 16px;margin-bottom:20px;font-family:ui-monospace,'SF Mono','Fira Code',monospace;font-size:13px;color:#1f2937;letter-spacing:0.08em;word-break:break-all;">${token}</div>
              <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.5;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                This link expires in <strong style="color:#1f2937;">15 minutes</strong> and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <a href="${resetURL}" style="display:inline-block;background:#007aff;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:12px;padding:14px 32px;letter-spacing:0.01em;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:12px;color:#6b7280;line-height:1.5;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(148,163,184,0.2);padding:20px 40px;">
              <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">✦ Nexia · your digital slambook</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
