import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { environment } from "../environments/environment";
import { authGuard, landingGuard } from "./auth-guard";
import { Group } from "./models/api";
import { AuthService } from "./services/authService";
import { GroupService } from "./services/groupService";

@Component({ template: "" })
class Blank {}

const group = (answered: boolean): Group => ({
  selfId: 1,
  roles: [],
  rsvpDeadline: "2099-01-01T00:00:00.000Z",
  guests: [
    {
      guestId: 1,
      name: "Alice",
      surname: "Smith",
      rsvp: answered
        ? {
            attending: false,
            dietary: null,
            dietaryOtherDetails: null,
            shuttle: null,
            accommodation: null,
            respondedBy: 1,
            respondedAt: "2026-10-24T10:00:00.000Z",
          }
        : null,
    },
  ],
});

describe("guards", () => {
  let http: HttpTestingController;

  const setup = (token: string | null) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { accessToken: signal(token) } },
        provideRouter([
          { path: "login", component: Blank },
          {
            path: "",
            canActivate: [authGuard],
            children: [
              { path: "", pathMatch: "full", canActivate: [landingGuard], children: [] },
              { path: "home", component: Blank },
              { path: "rsvp", component: Blank },
            ],
          },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  };
  const url = () => TestBed.inject(Router).url;

  it("sends guests who haven't answered for themselves to the RSVP page", async () => {
    setup("token");
    TestBed.inject(GroupService).setGroup(group(false));
    await (await RouterTestingHarness.create()).navigateByUrl("/");
    expect(url()).toBe("/rsvp");
  });

  it("sends guests who have answered to the home page", async () => {
    setup("token");
    TestBed.inject(GroupService).setGroup(group(true));
    await (await RouterTestingHarness.create()).navigateByUrl("/");
    expect(url()).toBe("/home");
  });

  it("loads the group for a token restored from an earlier visit", async () => {
    setup("token");
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl("/");
    await new Promise((resolve) => setTimeout(resolve));
    http.expectOne(`${environment.apiUrl}/group`).flush(group(true));
    await navigation;
    expect(url()).toBe("/home");
  });

  it("goes back to the login page when the group can't be loaded or there's no token", async () => {
    setup("expired");
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl("/rsvp");
    await new Promise((resolve) => setTimeout(resolve));
    http
      .expectOne(`${environment.apiUrl}/group`)
      .flush({ error: "invalid token" }, { status: 401, statusText: "" });
    await navigation;
    expect(url()).toBe("/login");
  });
});
