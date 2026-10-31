import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { TestBed } from "@angular/core/testing";
import { MatChipListboxHarness } from "@angular/material/chips/testing";
import { Router } from "@angular/router";
import { AccommodationChange, RsvpChange } from "../../models/admin";
import { adminApi, adminGuest, setupAdminPage } from "../admin-testing";
import { ChangesPage } from "./changes-page";

const change = (overrides: Partial<RsvpChange>): RsvpChange => ({
  recordedAt: "2026-10-20T10:00:00.000Z",
  guestId: 2,
  guest: "Bob Smith",
  previousAnswerBy: "Bob Smith",
  changedBy: "Bob Smith",
  changedFields: "shuttle",
  wasAttending: true,
  nowAttending: true,
  prevHistoryId: 1,
  historyId: 2,
  ...overrides,
});

// the API lists changes oldest first
const CHANGES = [
  change({
    recordedAt: "2026-10-19T10:00:00.000Z",
    previousAnswerBy: null,
    changedBy: "Bob Smith",
    changedFields: "",
    wasAttending: null,
    prevHistoryId: null,
    historyId: 1,
  }),
  change({}),
  change({
    historyId: 4,
    recordedAt: "2026-10-21T10:00:00.000Z",
    changedFields: "attending, dietary",
    nowAttending: false,
  }),
  change({
    historyId: 6,
    recordedAt: "2026-10-22T10:00:00.000Z",
    guestId: 3,
    guest: "Carl Botha",
    changedBy: "Alice Smith",
    previousAnswerBy: "Carl Botha",
    changedFields: "dietary",
  }),
];

const PLACE_CHANGES: AccommodationChange[] = [
  {
    recordedAt: "2026-10-23T10:00:00.000Z",
    groupId: 1,
    guestId: null,
    previousSetBy: "Bob Smith",
    changedBy: "Alice Smith",
    hadPlace: true,
    hasPlace: true,
    prevHistoryId: 1,
    historyId: 2,
  },
];

const GUESTS = [adminGuest({}), adminGuest({ guestId: 2, name: "Bob" })];

describe("ChangesPage", () => {
  const open = async (url: string) => {
    const page = await setupAdminPage(
      ["viewer"],
      [{ path: "admin/changes", component: ChangesPage }],
      url,
    );
    page.http.expectOne(`${adminApi}/rsvp-changes`).flush(CHANGES);
    page.http.expectOne(`${adminApi}/accommodation-changes`).flush(PLACE_CHANGES);
    page.http.expectOne(`${adminApi}/guests`).flush(GUESTS);
    await page.settle();
    const rows = () =>
      [...page.element().querySelectorAll(".row")].map((row) =>
        row.textContent!.replace(/\s+/g, " ").trim(),
      );
    return { ...page, rows };
  };

  it("lists changes newest first, calling out attendance and who changed it", async () => {
    const { rows } = await open("/admin/changes");
    expect(rows().map((row) => row.match(/Alice & Bob Smith|Bob Smith|Carl Botha/)![0])).toEqual([
      "Alice & Bob Smith",
      "Carl Botha",
      "Bob Smith",
      "Bob Smith",
      "Bob Smith",
    ]);
    expect(rows()[4]).toContain("Coming");
    expect(rows()[4]).toContain("First RSVP");
    expect(rows()[4]).not.toContain("before that");
    expect(rows()[0]).toContain("Group's place moved");
    expect(rows()[0]).toContain("by Alice Smith · before that by Bob Smith");
    expect(rows()[1]).toContain("by Alice Smith · before that by Carl Botha");
    expect(rows()[2]).toContain("No longer coming");
    expect(rows()[2]).toContain("Attendance");
    expect(rows()[3]).not.toContain("before that");
  });

  it("can hide first answers", async () => {
    const { rows } = await open("/admin/changes?changes=true");
    expect(rows()).toHaveLength(4);
    expect(rows().join()).not.toContain("First RSVP");
  });

  it("filters from the URL and writes the filters back to it", async () => {
    const { rows, harness, settle } = await open("/admin/changes?attendance=true");
    expect(rows()).toHaveLength(1);

    const chips = await TestbedHarnessEnvironment.loader(harness.fixture).getHarness(
      MatChipListboxHarness,
    );
    await chips.selectChips({ text: "Changed by someone else" });
    await settle();
    expect(TestBed.inject(Router).url).toBe("/admin/changes?attendance=true&others=true");
    expect(rows()).toEqual([]);
  });
});
