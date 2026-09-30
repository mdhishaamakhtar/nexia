import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { makeProfile, makeSummary } from "@test/fixtures";
import { testQueryClient, withQueryClient } from "@test/query";
import { API, mockApi } from "@test/server";
import {
  PROFILE_PAGE_SIZE,
  isNotFound,
  profileKeys,
  useCreateProfile,
  useDeleteProfile,
  useProfile,
  useProfileList,
  useUpdateProfile,
} from "./hooks";

const server = mockApi();

describe("the slambook list", () => {
  test("loads a page at a time with the search and filter", async () => {
    const seen: URLSearchParams[] = [];
    server.use(
      http.get(`${API}/profiles`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        seen.push(params);
        const page = Number(params.get("page"));
        return HttpResponse.json({
          data: [makeSummary({ id: page })],
          total: PROFILE_PAGE_SIZE + 1,
          page,
          limit: PROFILE_PAGE_SIZE,
        });
      })
    );
    const { result } = renderHook(() => useProfileList("asha", "Friend"), {
      wrapper: withQueryClient(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seen[0]!.get("search")).toBe("asha");
    expect(seen[0]!.get("relationship_type")).toBe("Friend");
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(false);
  });

  test("an unfiltered list sends no filters", async () => {
    let params: URLSearchParams | undefined;
    server.use(
      http.get(`${API}/profiles`, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ data: [], total: 0, page: 1, limit: PROFILE_PAGE_SIZE });
      })
    );
    const { result } = renderHook(() => useProfileList("", ""), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(params!.has("search")).toBe(false);
    expect(params!.has("relationship_type")).toBe(false);
  });
});

describe("one profile", () => {
  test("loads by id", async () => {
    server.use(http.get(`${API}/profiles/7`, () => HttpResponse.json(makeProfile())));
    const { result } = renderHook(() => useProfile("7"), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.data?.full_name).toBe("Asha Kumar"));
  });

  test("a missing one is not asked for twice", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/profiles/99`, () => {
        calls += 1;
        return HttpResponse.json({ error: { code: "NOT_FOUND", message: "x" } }, { status: 404 });
      })
    );
    const client = testQueryClient();
    client.setDefaultOptions({ queries: { retry: undefined } });
    const { result } = renderHook(() => useProfile("99"), { wrapper: withQueryClient(client) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isNotFound(result.current.error)).toBe(true);
    expect(calls).toBe(1);
  });

  test("without an id, nothing is fetched", () => {
    const { result } = renderHook(() => useProfile(undefined), { wrapper: withQueryClient() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(isNotFound(new Error("x"))).toBe(false);
  });
});

describe("changes", () => {
  test("creating, updating and deleting keep the cache current", async () => {
    const client = testQueryClient();
    client.setQueryData(profileKeys.list("", ""), { pages: [], pageParams: [] });
    client.setQueryData(profileKeys.detail(7), makeProfile());
    const updated = makeProfile({ full_name: "Asha K." });
    server.use(
      http.post(`${API}/profiles`, () => HttpResponse.json({ id: 8 }, { status: 201 })),
      http.put(`${API}/profiles/7`, () => HttpResponse.json(updated)),
      http.delete(`${API}/profiles/7`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/profiles`, () =>
        HttpResponse.json({ data: [], total: 0, page: 1, limit: PROFILE_PAGE_SIZE })
      )
    );
    const wrapper = withQueryClient(client);
    const payload = { full_name: "Asha", relationship_type: "Friend" as const };

    const create = renderHook(() => useCreateProfile(), { wrapper });
    await act(() => create.result.current.mutateAsync(payload));
    expect(client.getQueryState(profileKeys.list("", ""))?.isInvalidated).toBe(true);

    const update = renderHook(() => useUpdateProfile("7"), { wrapper });
    await act(() => update.result.current.mutateAsync(payload));
    expect(client.getQueryData(profileKeys.detail(7))).toEqual(updated);

    const remove = renderHook(() => useDeleteProfile(), { wrapper });
    await act(() => remove.result.current.mutateAsync("7"));
    expect(client.getQueryData(profileKeys.detail(7))).toBeUndefined();
  });
});
