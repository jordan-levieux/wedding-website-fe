import { Clipboard } from "@angular/cdk/clipboard";
import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { MatChipListboxHarness } from "@angular/material/chips/testing";
import { provideRouter, Router, withComponentInputBinding } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { environment } from "../../../environments/environment";
import { AdminGuest } from "../../models/admin";
import { Role, Rsvp } from "../../models/api";
import { GroupService } from "../../services/groupService";
import { GuestsPage } from "./guests-page";

const coming: Rsvp = {
  attending: true,
  dietary: "other",
  dietaryOtherDetails: "No mushrooms",
  shuttle: null,
  accommodation: null,
  respondedBy: 1,
  respondedAt: "2026-10-24T10:00:00.000Z",
};

const guest = (overrides: Partial<AdminGuest>): AdminGuest => ({
  guestId: 1,
  groupId: 1,
  name: "Alice",
  surname: "Smith",
  email: "alice@example.com",
  tokenName: "Alice",
  signUpUuid: "invite-alice",
  signedUpAt: "2026-10-01T10:00:00.000Z",
  updatedBy: null,
  roles: ["admin"],
  rsvp: coming,
  ...overrides,
});

const GUESTS: AdminGuest[] = [
  guest({}),
  guest({
    guestId: 2,
    name: "Bob",
    email: null,
    signUpUuid: "invite-bob",
    signedUpAt: null,
    roles: [],
    rsvp: { ...coming, dietary: "none", dietaryOtherDetails: null },
  }),
  guest({
    guestId: 3,
    groupId: 2,
    name: "Carl",
    surname: "Botha",
    email: null,
    signUpUuid: "invite-carl",
    signedUpAt: null,
    roles: [],
    rsvp: null,
  }),
];

describe("GuestsPage", () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  const setup = async (roles: Role[], url = "/admin/guests") => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: "admin/guests", component: GuestsPage }],
          withComponentInputBinding(),
        ),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(GroupService).setGroup({
      selfId: 1,
      roles,
      rsvpDeadline: "2099-01-01T00:00:00.000Z",
      guests: [],
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
  };

  // the loader resolves a promise, which the fixture doesn't wait for on its own
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  };
  const flushGuests = async (guests = GUESTS) => {
    http.expectOne(`${environment.apiUrl}/admin/guests`).flush(guests);
    await settle();
  };
  const text = () => (harness.routeNativeElement as HTMLElement).textContent!.replace(/\s+/g, " ");
  const figure = (label: string) =>
    [...harness.routeNativeElement!.querySelectorAll(".hero, .tile")]
      .find((el) => el.querySelector(".label")!.textContent!.trim() === label)
      ?.querySelector(".hero-value, .value")
      ?.textContent!.trim();
  const groupLabels = () =>
    [...harness.routeNativeElement!.querySelectorAll(".group-label")].map((el) =>
      el.textContent!.trim(),
    );

  it("summarises the answers and lists guests by group", async () => {
    await setup(["admin"]);
    expect(text()).toContain("Loading guests");
    await flushGuests();

    expect(figure("Attending")).toBe("2");
    expect(text()).toContain("2 of 3 guests have answered");
    expect(figure("Awaiting")).toBe("1");
    expect(figure("Signed up")).toBe("1");
    expect(figure("Missing details")).toBe("2");
    expect(groupLabels()).toEqual(["Alice & Bob Smith", "Carl Botha"]);
    expect(text()).toContain("Signed up as alice@example.com");
    expect(text()).toContain("No mushrooms");
    expect(text()).toContain("by Alice Smith");
  });

  it("filters from the URL and writes the chosen filter back to it", async () => {
    await setup(["admin"], "/admin/guests?status=awaiting");
    await flushGuests();
    expect(groupLabels()).toEqual(["Carl Botha"]);
    expect(text()).toContain("Showing 1 of 3 guests");

    const chips = await TestbedHarnessEnvironment.loader(harness.fixture).getHarness(
      MatChipListboxHarness,
    );
    await chips.selectChips({ text: /Attending/ });
    await settle();
    expect(TestBed.inject(Router).url).toBe("/admin/guests?status=attending");
    expect(groupLabels()).toEqual(["Alice & Bob Smith"]);
  });

  it("searches by name", async () => {
    await setup(["admin"], "/admin/guests?q=carl");
    await flushGuests();
    expect(groupLabels()).toEqual(["Carl Botha"]);
  });

  it("lets admins copy the invite link of guests who haven't signed up", async () => {
    await setup(["admin"]);
    await flushGuests();
    const copy = vi.spyOn(TestBed.inject(Clipboard), "copy").mockReturnValue(true);
    const buttons = harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>(
      "button[aria-label^='Copy invite link']",
    );
    expect([...buttons].map((button) => button.getAttribute("aria-label"))).toEqual([
      "Copy invite link for Bob",
      "Copy invite link for Carl",
    ]);
    buttons[0].click();
    expect(copy).toHaveBeenCalledWith(`${location.origin}/login?sign-up-token=invite-bob`);
  });

  it("doesn't offer invite links to viewers", async () => {
    await setup(["viewer"]);
    await flushGuests(GUESTS.map((g) => ({ ...g, signUpUuid: null })));
    expect(
      harness.routeNativeElement!.querySelector("button[aria-label^='Copy invite link']"),
    ).toBeNull();
  });

  it("explains a failed load and can try again", async () => {
    await setup(["viewer"]);
    http
      .expectOne(`${environment.apiUrl}/admin/guests`)
      .flush(
        { error: "requires one of the roles: admin, viewer" },
        { status: 403, statusText: "" },
      );
    await settle();
    expect(text()).toContain("requires one of the roles: admin, viewer");

    (harness.routeNativeElement!.querySelector(".problem button") as HTMLButtonElement).click();
    await flushGuests();
    expect(groupLabels()).toEqual(["Alice & Bob Smith", "Carl Botha"]);
  });
});
