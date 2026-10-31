import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import { TestBed } from "@angular/core/testing";
import { MatChipListboxHarness } from "@angular/material/chips/testing";
import { Router } from "@angular/router";
import { RsvpChange } from "../../models/admin";
import { adminApi, setupAdminPage } from "../admin-testing";
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

describe("ChangesPage", () => {
  const open = async (url: string) => {
    const page = await setupAdminPage(
      ["viewer"],
      [{ path: "admin/changes", component: ChangesPage }],
      url,
    );
    page.http.expectOne(`${adminApi}/rsvp-changes`).flush(CHANGES);
    await page.settle();
    const rows = () =>
      [...page.element().querySelectorAll(".row")].map((row) =>
        row.textContent!.replace(/\s+/g, " ").trim(),
      );
    return { ...page, rows };
  };

  it("lists changes newest first, calling out attendance and who changed it", async () => {
    const { rows } = await open("/admin/changes");
    expect(rows().map((row) => row.match(/Bob Smith|Carl Botha/)![0])).toEqual([
      "Carl Botha",
      "Bob Smith",
      "Bob Smith",
    ]);
    expect(rows()[0]).toContain("by Alice Smith · first answered by Carl Botha");
    expect(rows()[1]).toContain("No longer coming");
    expect(rows()[1]).toContain("Attendance");
    expect(rows()[2]).not.toContain("first answered by");
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
