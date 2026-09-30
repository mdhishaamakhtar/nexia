import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, test } from "vitest";
import { withQueryClient } from "@test/query";
import { API, mockApi } from "@test/server";
import * as auth from "./api";
import { rememberPendingEmail } from "./pending-email";
import ResendVerification from "./ResendVerification";

const server = mockApi();

afterEach(() => sessionStorage.clear());

describe("auth requests", () => {
  test("each sends what its endpoint expects", async () => {
    const bodies: Record<string, unknown> = {};
    server.use(
      http.post(`${API}/auth/:action`, async ({ params, request }) => {
        bodies[params.action as string] = await request.json().catch(() => null);
        return HttpResponse.json({ message: "ok" });
      }),
      http.get(`${API}/auth/verify-email`, ({ request }) => {
        bodies["verify-email"] = new URL(request.url).searchParams.get("token");
        return HttpResponse.json({ message: "ok" });
      })
    );
    await auth.signup("a@b.co", "password1");
    await auth.login("a@b.co", "password1");
    await auth.verifyEmail("t0k");
    await auth.resendVerification("a@b.co");
    await auth.forgotPassword("a@b.co");
    await auth.resetPassword("t0k", "password2");
    await auth.logoutSession();

    expect(bodies).toEqual({
      signup: { email: "a@b.co", password: "password1" },
      login: { email: "a@b.co", password: "password1" },
      "verify-email": "t0k",
      "resend-verification": { email: "a@b.co" },
      "forgot-password": { email: "a@b.co" },
      "reset-password": { token: "t0k", new_password: "password2" },
      logout: null,
    });
  });

  test("the session is null when signed out, and other failures are errors", async () => {
    server.use(http.get(`${API}/auth/me`, () => new HttpResponse(null, { status: 401 })));
    expect(await auth.getSession()).toBeNull();
    server.use(http.get(`${API}/auth/me`, () => new HttpResponse(null, { status: 500 })));
    await expect(auth.getSession()).rejects.toThrow();
  });
});

describe("asking for a new confirmation link", () => {
  function renderForm() {
    const Query = withQueryClient();
    render(
      <Query>
        <ResendVerification label="Send me a new link" />
      </Query>
    );
    return userEvent.setup();
  }

  test("starts with the address just signed up with, and confirms without revealing anything", async () => {
    rememberPendingEmail("asha@example.com");
    let sent: unknown;
    server.use(
      http.post(`${API}/auth/resend-verification`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ message: "ok" });
      })
    );
    const user = renderForm();
    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveValue("asha@example.com"));
    await user.click(screen.getByRole("button", { name: "Send me a new link" }));
    expect(await screen.findByText(/a new link is on its way/)).toBeInTheDocument();
    expect(sent).toEqual({ email: "asha@example.com" });
  });

  test("checks the address, and says when sending failed", async () => {
    server.use(
      http.post(`${API}/auth/resend-verification`, () =>
        HttpResponse.json(
          { error: { code: "EMAIL_UNAVAILABLE", message: "Email is unavailable right now" } },
          { status: 503 }
        )
      )
    );
    const user = renderForm();
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send me a new link" }));
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "asha@example.com");
    await user.click(screen.getByRole("button", { name: "Send me a new link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't send that");
  });
});
