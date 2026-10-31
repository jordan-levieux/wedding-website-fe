import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Routes, withComponentInputBinding } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { environment } from "../../environments/environment";
import { AdminGuest } from "../models/admin";
import { Role, Rsvp } from "../models/api";
import { GroupService } from "../services/groupService";

export const adminApi = `${environment.apiUrl}/admin`;

export const COMING: Rsvp = {
  attending: true,
  dietary: "vegetarian",
  dietaryOtherDetails: null,
  shuttle: true,
  accommodation: { lat: -33.9, lng: 22.6 },
  respondedBy: 1,
  respondedAt: "2026-10-24T10:00:00.000Z",
};

export const adminGuest = (overrides: Partial<AdminGuest>): AdminGuest => ({
  guestId: 1,
  groupId: 1,
  name: "Alice",
  surname: "Smith",
  email: null,
  tokenName: null,
  signUpUuid: null,
  signedUpAt: null,
  updatedBy: null,
  roles: [],
  rsvp: null,
  ...overrides,
});

// signed in as guest 1 with the given roles, on one of the admin pages
export const setupAdminPage = async (roles: Role[], routes: Routes, url: string) => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter(routes, withComponentInputBinding()),
    ],
  });
  TestBed.inject(GroupService).setGroup({
    selfId: 1,
    roles,
    rsvpDeadline: "2099-01-01T00:00:00.000Z",
    guests: [],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  // the loaders resolve promises, which the fixture doesn't wait for on its own
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  };
  return {
    harness,
    http: TestBed.inject(HttpTestingController),
    settle,
    element: () => harness.routeNativeElement as HTMLElement,
    text: () => (harness.routeNativeElement as HTMLElement).textContent!.replace(/\s+/g, " "),
  };
};
