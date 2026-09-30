import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";
import SignedInRedirect from "@/components/atoms/SignedInRedirect";
import { CSRF_COOKIE_NAME } from "@/shared/api/cookies";
import { testQueryClient, withQueryClient } from "@test/query";
import { API, mockApi } from "@test/server";
import { AuthProvider, useAuth } from "./AuthContext";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const server = mockApi();

function renderAuth(client = testQueryClient()) {
  const Query = withQueryClient(client);
  return renderHook(() => useAuth(), {
    wrapper: ({ children }) => (
      <Query>
        <AuthProvider>{children}</AuthProvider>
      </Query>
    ),
  });
}

const signedInCookie = () => {
  document.cookie = `${CSRF_COOKIE_NAME}=tok`;
};
const me = (status: number) =>
  http.get(`${API}/auth/me`, () =>
    status === 200
      ? HttpResponse.json({ authenticated: true, user_id: 42 })
      : new HttpResponse(null, { status })
  );

beforeEach(() => replace.mockReset());

describe("the session", () => {
  test("with no session cookie, it is signed out without asking the server", () => {
    const { result } = renderAuth();
    expect(result.current.status).toBe("signed-out");
    expect(result.current.userId).toBeNull();
  });

  test("with one, it asks, and is signed in", async () => {
    signedInCookie();
    server.use(me(200));
    const { result } = renderAuth();
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("signed-in"));
    expect(result.current.userId).toBe(42);
  });

  test("a cookie the server no longer accepts means signed out", async () => {
    signedInCookie();
    server.use(me(401));
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe("signed-out"));
  });

  test("an unreachable server is its own state, and can be retried", async () => {
    signedInCookie();
    server.use(me(503));
    const { result } = renderAuth();
    // The provider retries once, a second later, before calling it unreachable.
    await waitFor(() => expect(result.current.status).toBe("unreachable"), { timeout: 3000 });

    server.use(me(200));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("signed-in"));
  });

  test("signing in loads the session; signing out forgets it and goes to sign-in", async () => {
    server.use(
      me(200),
      http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 }))
    );
    const client = testQueryClient();
    client.setQueryData(["profiles"], "someone else's list");
    const { result } = renderAuth(client);

    await act(() => result.current.signedIn());
    // React Query tells its observers on the next tick.
    await waitFor(() => expect(result.current.status).toBe("signed-in"));
    expect(client.getQueryData(["profiles"])).toBeUndefined();

    client.setQueryData(["profiles"], "my list");
    await act(() => result.current.signOut());
    await waitFor(() => expect(result.current.status).toBe("signed-out"));
    expect(client.getQueryData(["profiles"])).toBeUndefined();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  test("signing out still ends things locally when the server can't be reached", async () => {
    server.use(http.post(`${API}/auth/logout`, () => HttpResponse.error()));
    const { result } = renderAuth();
    await act(() => result.current.signOut().catch(() => {}));
    expect(replace).toHaveBeenCalledWith("/login");
  });

  test("is a programming error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/within an AuthProvider/);
  });
});

describe("the landing page", () => {
  test("sends a signed-in visitor into the app, and leaves everyone else", async () => {
    const Query = withQueryClient();
    const { unmount } = render(
      <Query>
        <AuthProvider>
          <SignedInRedirect />
        </AuthProvider>
      </Query>
    );
    expect(replace).not.toHaveBeenCalled();
    unmount();

    signedInCookie();
    server.use(me(200));
    render(
      <Query>
        <AuthProvider>
          <SignedInRedirect />
          <p>landing</p>
        </AuthProvider>
      </Query>
    );
    expect(screen.getByText("landing")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/profiles"));
  });
});
