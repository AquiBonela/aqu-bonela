import { afterEach, describe, expect, it } from "vitest";
import { getTrustedClientIp, isValidIp } from "./antispam.server";

const env = process.env;
afterEach(() => { delete env["VERCEL"]; delete env["TRUSTED_CLIENT_IP_HEADER"]; });

describe("trusted client IP", () => {
  it("validates IP syntax", () => {
    expect(isValidIp("203.0.113.7")).toBe(true);
    expect(isValidIp("2001:db8::1")).toBe(true);
    expect(isValidIp("999.1.1.1")).toBe(false);
    expect(isValidIp("unknown")).toBe(false);
  });
  it("uses cf-connecting-ip outside Vercel and ignores client x-forwarded-for", () => {
    expect(getTrustedClientIp(new Headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4" }))).toBe("203.0.113.7");
    expect(getTrustedClientIp(new Headers({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
  });
  it("uses x-forwarded-for on Vercel and ignores cf-connecting-ip", () => {
    env["VERCEL"] = "1";
    expect(getTrustedClientIp(new Headers({ "x-forwarded-for": "198.51.100.2, 10.0.0.1", "cf-connecting-ip": "1.2.3.4" }))).toBe("198.51.100.2");
  });
  it("returns null instead of a shared placeholder when no valid IP", () => {
    expect(getTrustedClientIp(new Headers({ "cf-connecting-ip": "garbage" }))).toBeNull();
  });
});
