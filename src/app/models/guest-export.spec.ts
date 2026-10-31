import { AdminGuest } from "./admin";
import { Rsvp } from "./api";
import { guestsCsv, spreadsheetDate } from "./guest-export";

const coming: Rsvp = {
  attending: true,
  dietary: "vegetarian",
  dietaryOtherDetails: null,
  shuttle: true,
  accommodation: { lat: -33.9, lng: 22.6 },
  respondedBy: 1,
  respondedAt: "2026-10-24T10:00:00.000Z",
};

const guest = (overrides: Partial<AdminGuest>): AdminGuest => ({
  guestId: 1,
  groupId: 1,
  name: "Alice",
  surname: "Smith",
  email: "alice@example.com",
  tokenName: null,
  signUpUuid: "invite-alice",
  signedUpAt: "2026-10-01T10:00:00.000Z",
  updatedBy: null,
  roles: ["admin", "venue_accommodation"],
  rsvp: coming,
  ...overrides,
});

const rows = (csv: string) => csv.replace(/^﻿/, "").trimEnd().split("\r\n");

describe("guestsCsv", () => {
  const alice = guest({});
  const bob = guest({
    guestId: 2,
    name: "Bob",
    email: null,
    signedUpAt: null,
    roles: [],
    rsvp: {
      ...coming,
      dietary: "other",
      dietaryOtherDetails: 'No "fun", please',
      shuttle: null,
      accommodation: null,
    },
  });
  const carl = guest({
    guestId: 3,
    groupId: 2,
    name: "Carl",
    surname: "Botha",
    roles: [],
    rsvp: {
      ...coming,
      attending: false,
      dietary: null,
      shuttle: null,
      accommodation: null,
      respondedBy: 3,
    },
  });

  it("starts with a byte order mark and a header row", () => {
    const csv = guestsCsv([alice], [alice]);
    expect(csv.startsWith("﻿Group,First name,Surname,Status,Dietary,")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("writes one row per guest, quoting where needed", () => {
    const [, ...lines] = rows(guestsCsv([alice, bob, carl], [alice, bob, carl]));
    expect(lines[0]).toBe(
      [
        "Alice & Bob Smith",
        "Alice",
        "Smith",
        "Attending",
        "Vegetarian",
        "",
        "Yes",
        '"https://www.google.com/maps/search/?api=1&query=-33.9,22.6"',
        "-33.9",
        "22.6",
        "Alice Smith",
        spreadsheetDate(coming.respondedAt),
        spreadsheetDate(alice.signedUpAt!),
        "alice@example.com",
        '"Admin, Venue stay"',
      ].join(","),
    );
    expect(lines[1]).toContain(',Other,"No ""fun"", please",Not sure,,,,Alice Smith,');
    // not coming: no dietary, shuttle or location
    expect(lines[2]).toMatch(/^Carl Botha,Carl,Botha,Declined,,,,,,,Carl Botha,/);
  });

  it("keeps a guest's text from running as a formula", () => {
    const sneaky = guest({
      rsvp: { ...coming, dietary: "other", dietaryOtherDetails: "=HYPERLINK(1)" },
    });
    expect(rows(guestsCsv([sneaky], [sneaky]))[1]).toContain(",'=HYPERLINK(1),");
  });

  it("never includes invite links", () => {
    expect(guestsCsv([alice], [alice])).not.toContain("invite-alice");
  });
});
