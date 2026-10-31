import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { TestBed } from "@angular/core/testing";
import { MatButtonHarness } from "@angular/material/button/testing";
import { MatButtonToggleHarness } from "@angular/material/button-toggle/testing";
import { MatCheckboxHarness } from "@angular/material/checkbox/testing";
import { MatInputHarness } from "@angular/material/input/testing";
import { Router } from "@angular/router";
import { AdminGuest, GuestHistory } from "../../models/admin";
import { Role } from "../../models/api";
import { adminApi, adminGuest, COMING, setupAdminPage } from "../admin-testing";
import { GuestPage } from "./guest-page";

const GUESTS: AdminGuest[] = [
  adminGuest({
    roles: ["admin"],
    email: "alice@example.com",
    signedUpAt: "2026-10-01T10:00:00.000Z",
    rsvp: COMING,
  }),
  adminGuest({ guestId: 2, name: "Bob", signUpUuid: "invite-bob", rsvp: null }),
  adminGuest({ guestId: 3, groupId: 2, name: "Carl", surname: "Botha", signUpUuid: "invite-carl" }),
];

const HISTORY: GuestHistory = {
  details: [
    {
      historyId: 1,
      groupId: 1,
      name: "Bob",
      surname: "Smith",
      signUpUuid: "invite-bob",
      email: null,
      tokenName: null,
      signedUpAt: null,
      updatedBy: 1,
      recordedAt: "2026-10-01T10:00:00.000Z",
    },
  ],
  roles: [],
  rsvps: [],
};

describe("GuestPage", () => {
  const open = async (roles: Role[], guestId: number, guests = GUESTS) => {
    const page = await setupAdminPage(
      roles,
      [{ path: "admin/guests/:guestId", component: GuestPage }],
      `/admin/guests/${guestId}`,
    );
    page.http.expectOne(`${adminApi}/guests`).flush(guests);
    page.http.expectOne(`${adminApi}/guests/${guestId}/history`).flush(HISTORY);
    await page.settle();
    const loader = TestbedHarnessEnvironment.loader(page.harness.fixture);
    return { ...page, loader };
  };

  it("shows the guest's answer, sign-in, group and history", async () => {
    const { text } = await open(["admin"], 1);
    expect(text()).toContain("Alice Smith");
    expect(text()).toContain("In a group with Bob Smith");
    expect(text()).toContain("Vegetarian");
    expect(text()).toContain("Signed in with Google as alice@example.com");

    const { text: bobText } = await (TestBed.resetTestingModule(), open(["admin"], 2));
    expect(bobText()).toContain("No answer yet");
    expect(bobText()).toContain("Hasn't signed up yet");
    expect(bobText()).toContain(`${location.origin}/login?sign-up-token=invite-bob`);
    expect(bobText()).toContain("Added to the guest list");
    expect(bobText()).toContain("by Alice Smith");
  });

  it("saves only the details that changed", async () => {
    const { loader, http, settle } = await open(["admin"], 2);
    const surname = await loader.getHarness(MatInputHarness.with({ value: "Smith" }));
    await surname.setValue("Jones");
    await (await loader.getHarness(MatCheckboxHarness.with({ label: "Viewer" }))).check();
    await (await loader.getHarness(MatButtonHarness.with({ text: "Save details" }))).click();

    const request = http.expectOne(`${adminApi}/guests/2`);
    expect(request.request.method).toBe("PATCH");
    expect(request.request.body).toEqual({ surname: "Jones", roles: ["viewer"] });
    request.flush({ ...GUESTS[1], surname: "Jones", roles: ["viewer"] });
    await settle();
    http.expectOne(`${adminApi}/guests/2/history`);
  });

  it("won't let admins remove their own admin role", async () => {
    const { loader, text } = await open(["admin"], 1);
    expect(
      await (await loader.getHarness(MatCheckboxHarness.with({ label: "Admin" }))).isDisabled(),
    ).toBe(true);
    expect(text()).toContain("You can't remove your own admin role");
  });

  it("asks before unlinking a Google account", async () => {
    const { loader, http, text } = await open(["admin"], 1);
    await (
      await loader.getHarness(MatButtonHarness.with({ text: /Unlink Google account/ }))
    ).click();
    expect(text()).toContain("Unlink Alice's Google account?");
    http.expectNone(`${adminApi}/guests/1`);

    await (await loader.getHarness(MatButtonHarness.with({ text: "Unlink" }))).click();
    const request = http.expectOne(`${adminApi}/guests/1`);
    expect(request.request.body).toEqual({ unlinkGoogleAccount: true });
  });

  it("lets admins answer for a guest", async () => {
    const { loader, http } = await open(["admin"], 3);
    await (await loader.getHarness(MatButtonHarness.with({ text: /Answer for Carl/ }))).click();
    await (
      await loader.getHarness(MatButtonToggleHarness.with({ text: "Regretfully decline" }))
    ).check();
    await (await loader.getHarness(MatButtonHarness.with({ text: /Send RSVP/ }))).click();

    const request = http.expectOne(`${adminApi}/rsvps`);
    expect(request.request.method).toBe("PUT");
    expect(request.request.body).toEqual({
      rsvps: [
        {
          guestId: 3,
          attending: false,
          dietary: null,
          dietaryOtherDetails: null,
          shuttle: null,
          accommodation: null,
        },
      ],
    });
  });

  it("is read-only for viewers", async () => {
    const { loader, text } = await open(
      ["viewer"],
      2,
      GUESTS.map((guest) => ({ ...guest, signUpUuid: null })),
    );
    expect(
      await loader.getAllHarnesses(
        MatButtonHarness.with({ text: /Answer for|Save details|new link/ }),
      ),
    ).toEqual([]);
    expect(text()).toContain("Only admins can see invite links");
  });

  it("links to the other people in the group", async () => {
    const { element, http, settle, text } = await open(["admin"], 1);
    const link = element().querySelector<HTMLAnchorElement>(".intro a")!;
    expect(link.textContent!.trim()).toBe("Bob Smith");
    link.click();
    await settle();
    expect(TestBed.inject(Router).url).toBe("/admin/guests/2");
    http.expectOne(`${adminApi}/guests/2/history`);
    expect(text()).toContain("Hasn't signed up yet");
  });
});
