import { BRAND } from "@nexia/shared/brand";

/**
 * Transactional emails, drawn like the app: a white page, one neutral rounded
 * panel, the mark, and a tangerine pill for the one action. No shadow, no
 * border — the app has neither, so its emails don't either. Everything is
 * inline because mail clients strip <style>.
 */

const FONT = "'Alan Sans','Avenir Next',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const { ink: INK_1, ink2: INK_2, ink3: INK_3, panel: PANEL, page: PAGE } = BRAND;
const { action: ACTION, actionInk: ACTION_INK } = BRAND;

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface Layout {
  title: string;
  preheader: string;
  heading: string;
  body: string;
  action: { label: string; url: string };
  note: string;
}

function layout({ title, preheader, heading, body, action, note }: Layout): string {
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
<body style="margin:0;padding:0;background:${PAGE};font-family:${FONT};">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td style="padding:0 8px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;"><img src="${mark}" width="32" height="32" alt="" style="display:block;border:0;" /></td>
                  <td style="vertical-align:middle;"><p style="margin:0;font-size:22px;font-weight:700;color:${INK_1};letter-spacing:-0.02em;font-family:${FONT};">Nexia</p></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${PANEL};border-radius:28px;padding:36px 32px 32px;">
              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.15;font-weight:700;letter-spacing:-0.02em;color:${INK_1};font-family:${FONT};">${heading}</h1>
              <p style="margin:0 0 26px;font-size:16px;line-height:1.55;color:${INK_2};font-family:${FONT};">${body}</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px;background:${ACTION};">
                    <a href="${action.url}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:${ACTION_INK};text-decoration:none;font-family:${FONT};">${action.label}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:26px 0 0;font-size:14px;line-height:1.5;color:${INK_3};font-family:${FONT};">${note}</p>
              <p style="margin:14px 0 0;font-size:14px;line-height:1.5;color:${INK_3};word-break:break-all;font-family:${FONT};">If the button doesn't work, paste this into your browser:<br><a href="${action.url}" style="color:${INK_1};">${action.url}</a></p>
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
      heading: "Verify your email",
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
      heading: "Reset your password",
      body: "Someone asked to reset the password for this Nexia account. If it was you, choose a new one.",
      action: { label: "Choose a new password", url: resetURL },
      note: "The link works once and expires in 15 minutes. Resetting signs you out everywhere else. If you didn't ask for this, you can ignore this email.",
    }),
    text: `Reset your Nexia password\n\nOpen this link to choose a new password:\n${resetURL}\n\nThe link works once and expires in 15 minutes. If you didn't ask for this, ignore this email.`,
  };
}
