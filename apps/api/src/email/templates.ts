/**
 * Transactional emails, drawn with the app's own paper: cream page, one white
 * sheet on a warm hairline, a strip of tape, peach for the one action. No
 * shadow and no tilt — the app has neither, so its emails don't either.
 * Everything is inline because mail clients strip <style>.
 */

const FONT = "'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const INK_1 = "#292524";
const INK_2 = "#57534e";
const INK_3 = "#6f6660";
const LINE = "#e7ddd1";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface Layout {
  title: string;
  preheader: string;
  tape: string;
  label: string;
  body: string;
  action: { label: string; url: string };
  note: string;
}

function layout({ title, preheader, tape, label, body, action, note }: Layout): string {
  // The web app serves the mark as a PNG (mail clients drop SVG), from the
  // same origin the action link points at.
  const mark = new URL("/icons/mark-96.png", action.url).href;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:${FONT};">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="height:18px;">
              <div style="width:84px;height:18px;background:${tape};margin:0 auto -9px;"></div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid ${LINE};border-radius:24px;padding:36px 36px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;"><img src="${mark}" width="32" height="32" alt="" style="display:block;border:0;" /></td>
                  <td style="vertical-align:middle;"><p style="margin:0;font-size:24px;font-weight:800;color:${INK_1};letter-spacing:-0.01em;font-family:${FONT};">Nexia</p></td>
                </tr>
              </table>
              <p style="margin:2px 0 24px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${INK_3};font-family:${FONT};">your digital slambook</p>
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${INK_3};font-family:${FONT};">${label}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${INK_2};font-family:${FONT};">${body}</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:12px;background:#fdba74;">
                    <a href="${action.url}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#7c2d12;text-decoration:none;font-family:${FONT};">${action.label}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${INK_3};font-family:${FONT};">${note}</p>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${INK_3};word-break:break-all;font-family:${FONT};">If the button doesn't work, paste this into your browser:<br><a href="${action.url}" style="color:${INK_2};">${action.url}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verificationEmail(verifyURL: string): EmailContent {
  return {
    subject: "Verify your Nexia email address",
    html: layout({
      title: "Verify your Nexia email",
      preheader: "One click to open your slambook.",
      tape: "#c4b5fd",
      label: "Verify your email",
      body: "Thanks for starting a slambook. Confirm this is your address and you can sign in.",
      action: { label: "Verify my email", url: verifyURL },
      note: "The link works once and expires in 24 hours. If you didn't sign up for Nexia, you can ignore this email.",
    }),
    text: `Verify your Nexia email address\n\nOpen this link to confirm your address:\n${verifyURL}\n\nThe link works once and expires in 24 hours. If you didn't sign up for Nexia, ignore this email.`,
  };
}

export function passwordResetEmail(resetURL: string): EmailContent {
  return {
    subject: "Reset your Nexia password",
    html: layout({
      title: "Reset your Nexia password",
      preheader: "Choose a new password. The link expires in 15 minutes.",
      tape: "#fdba74",
      label: "Password reset",
      body: "Someone asked to reset the password for this Nexia account. If it was you, choose a new one.",
      action: { label: "Choose a new password", url: resetURL },
      note: "The link works once and expires in 15 minutes. Resetting signs you out everywhere else. If you didn't ask for this, you can ignore this email.",
    }),
    text: `Reset your Nexia password\n\nOpen this link to choose a new password:\n${resetURL}\n\nThe link works once and expires in 15 minutes. If you didn't ask for this, ignore this email.`,
  };
}
