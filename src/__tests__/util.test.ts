import { expect, test, describe, vi, afterEach } from 'vitest';

import { ethers } from "ethers";

import { hexToBytes, bytesToHex, fetchJSON, FetchError } from "../utils";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Utils', () => {
  test.each([
    new Uint8Array([0, 1, 2, 3]),
    new Uint8Array([42, 69, 255]),
    new Uint8Array([255]),
    new Uint8Array([255, 255]),
    new Uint8Array([0, 255, 0, 255]),
  ])("bytesToHex %s", (bytes) => {
    expect(bytesToHex(bytes)).toStrictEqual(ethers.hexlify(bytes));
  });

  test("bytesToHex padding", () => {
    expect(bytesToHex(new Uint8Array([0]), 20)).toStrictEqual("0x0000000000000000000000000000000000000000");
    expect(bytesToHex(new Uint8Array([255, 255, 255]), 20)).toStrictEqual("0x0000000000000000000000000000000000ffffff");
  });


  test.each([
    "0x00010203",
    "0x0000102030",
    "0x2a45ff",
    "0xff",
    "0xffff",
    "0x00ff00ff",
  ])("hexToBytes %s", (hex) => {
    expect(hexToBytes(hex)).toStrictEqual(ethers.getBytes(hex));
  });

});

describe("fetchJSON retry", () => {
  const url = "https://example.test/abi";

  function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });
  }

  test("retries HTTP 429 and then returns JSON", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: "slow down" }, 429, { "Retry-After": "0" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJSON(url)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(url, {
      headers: { "Content-Type": "application/json" },
    });
  });

  test("gives up after 3 retries on HTTP 429", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(
      { error: "slow down" },
      429,
      { "Retry-After": "0" },
    ));
    vi.stubGlobal("fetch", fetchMock);

    const error = await fetchJSON(url).then(
      () => undefined,
      (err) => err,
    );
    expect(error).toBeInstanceOf(FetchError);
    expect(error.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test("does not retry non-429 responses", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", {
      status: 500,
      statusText: "Server Error",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const error = await fetchJSON(url).then(
      () => undefined,
      (err) => err,
    );
    expect(error).toBeInstanceOf(FetchError);
    expect(error.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("honors Retry-After at 0s and at the 10s boundary", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "Retry-After": "0" },
      }))
      .mockResolvedValueOnce(new Response("", {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "Retry-After": "10" },
      }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchJSON(url);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(9999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("backs off 1s when Retry-After is blank", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "Retry-After": "  " },
      }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchJSON(url);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("backs off linearly when Retry-After is missing or too large", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 429, statusText: "Too Many Requests" }))
      .mockResolvedValueOnce(new Response("", {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "Retry-After": "30" },
      }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchJSON(url);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 30s is outside the 0-10s window, so the second retry waits 2s.
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
