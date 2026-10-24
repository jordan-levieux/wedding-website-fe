import { HttpClient, provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { environment } from "../environments/environment";
import { authInterceptor } from "./auth-interceptor";
import { AuthService } from "./services/authService";

describe("authInterceptor", () => {
  let http: HttpTestingController;
  let client: HttpClient;
  const logout = vi.fn();
  const navigate = vi.fn();

  beforeEach(() => {
    logout.mockReset();
    navigate.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { accessToken: signal("stored-token"), logout } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => http.verify());

  it("adds the stored token to API calls only", () => {
    client.get(`${environment.apiUrl}/group`).subscribe();
    client.get("https://example.com/other").subscribe();
    expect(http.expectOne(`${environment.apiUrl}/group`).request.headers.get("authorization")).toBe(
      "Bearer stored-token",
    );
    expect(http.expectOne("https://example.com/other").request.headers.has("authorization")).toBe(
      false,
    );
  });

  it("keeps an explicit token, as used when logging in", () => {
    client
      .post(`${environment.apiUrl}/auth/login`, null, { headers: { authorization: "Bearer new" } })
      .subscribe();
    expect(
      http.expectOne(`${environment.apiUrl}/auth/login`).request.headers.get("authorization"),
    ).toBe("Bearer new");
  });

  it("logs out and returns to the login page when the token is rejected", async () => {
    const request = firstValueFrom(client.get(`${environment.apiUrl}/group`));
    http
      .expectOne(`${environment.apiUrl}/group`)
      .flush({ error: "invalid token" }, { status: 401, statusText: "" });
    await expect(request).rejects.toBeTruthy();
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(["/login"]);
  });

  it("leaves login failures to the login page", async () => {
    const request = firstValueFrom(client.post(`${environment.apiUrl}/auth/login`, null));
    http
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ error: "invalid token" }, { status: 401, statusText: "" });
    await expect(request).rejects.toBeTruthy();
    expect(logout).not.toHaveBeenCalled();
  });
});
