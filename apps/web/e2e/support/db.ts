import postgres from "postgres";
import { E2E_DATABASE, POSTGRES_URL } from "./env";

/**
 * Marks an account's email as confirmed. The one step a browser test cannot
 * take for itself: the link is sent by email (in E2E, only written to the API
 * log), and everything after it is exercised through the UI.
 */
export async function confirmEmail(email: string): Promise<void> {
  const sql = postgres(`${POSTGRES_URL}/${E2E_DATABASE}`, { onnotice: () => {} });
  try {
    await sql`UPDATE users SET email_verified = true WHERE email = ${email}`;
  } finally {
    await sql.end();
  }
}
