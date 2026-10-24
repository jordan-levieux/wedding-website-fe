import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { AuthService, tokenExpiresAt } from "./authService";

const fakeToken = (exp: number) => {
  const payload = btoa(JSON.stringify({ exp }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
};
const inSeconds = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;

describe("AuthService token handling", () => {
  const restore = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return TestBed.inject(AuthService);
  };

  afterEach(() => sessionStorage.clear());

  it("reads the expiry from an ID token", () => {
    expect(tokenExpiresAt(fakeToken(1_900_000_000))).toBe(1_900_000_000_000);
    expect(tokenExpiresAt("not a token")).toBeNull();
  });

  it("keeps a signed-in guest signed in across a refresh while the token is valid", () => {
    const token = fakeToken(inSeconds(30 * 60));
    sessionStorage.setItem("wedding-id-token", token);
    expect(restore().accessToken()).toBe(token);
  });

  it("drops a token that has expired or is about to", () => {
    sessionStorage.setItem("wedding-id-token", fakeToken(inSeconds(30)));
    expect(restore().accessToken()).toBeNull();
    expect(sessionStorage.getItem("wedding-id-token")).toBeNull();
  });
});
