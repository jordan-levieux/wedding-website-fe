import { Rsvp } from "./api";
import {
  AdminGuest,
  adminSummary,
  answerSummary,
  changedFieldLabels,
  GuestHistory,
  GuestHistoryEntry,
  guestTimeline,
  nextGroupId,
  RsvpChange,
  groupGuests,
  groupLabel,
  inviteLink,
  matchesFilter,
  matchesSearch,
  toGuestFilter,
} from "./admin";

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
  email: null,
  tokenName: null,
  signUpUuid: "invite",
  signedUpAt: null,
  updatedBy: null,
  roles: [],
  rsvp: null,
  ...overrides,
});

const alice = guest({ signedUpAt: "2026-10-01T10:00:00.000Z", rsvp: coming });
const bob = guest({ guestId: 2, name: "Bob", rsvp: { ...coming, shuttle: null } });
const zoë = guest({ guestId: 3, groupId: 2, name: "Zoë", surname: "Ndlovu" });
const carl = guest({
  guestId: 4,
  groupId: 2,
  name: "Carl",
  surname: "Botha",
  rsvp: { ...coming, attending: false, dietary: null, shuttle: null, accommodation: null },
});

describe("admin guest helpers", () => {
  it("filters by answer, sign-up and missing details", () => {
    const all = [alice, bob, zoë, carl];
    const names = (filter: Parameters<typeof matchesFilter>[1]) =>
      all.filter((g) => matchesFilter(g, filter)).map((g) => g.name);
    expect(names("all")).toEqual(["Alice", "Bob", "Zoë", "Carl"]);
    expect(names("attending")).toEqual(["Alice", "Bob"]);
    expect(names("declined")).toEqual(["Carl"]);
    expect(names("awaiting")).toEqual(["Zoë"]);
    expect(names("not-signed-up")).toEqual(["Bob", "Zoë", "Carl"]);
    expect(names("missing-details")).toEqual(["Bob"]);
  });

  it("treats unknown filters in the URL as showing everyone", () => {
    expect(toGuestFilter("declined")).toBe("declined");
    expect(toGuestFilter("nonsense")).toBe("all");
    expect(toGuestFilter(undefined)).toBe("all");
  });

  it("searches names and emails, ignoring case and accents", () => {
    expect(matchesSearch(zoë, "zoe")).toBe(true);
    expect(matchesSearch(zoë, "ZOË ndl")).toBe(true);
    expect(matchesSearch(alice, "zoe")).toBe(false);
    expect(matchesSearch(guest({ email: "al@example.com" }), "example")).toBe(true);
    expect(matchesSearch(alice, "  ")).toBe(true);
  });

  it("labels groups by their members", () => {
    expect(groupLabel([alice])).toBe("Alice Smith");
    expect(groupLabel([alice, bob])).toBe("Alice & Bob Smith");
    expect(groupLabel([alice, bob, guest({ name: "Cleo" })])).toBe("Alice, Bob & Cleo Smith");
    expect(groupLabel([zoë, carl])).toBe("Zoë Ndlovu & Carl Botha");
  });

  it("groups the shown guests but labels each group by everyone in it", () => {
    expect(groupGuests([alice, bob, zoë, carl], [bob, carl])).toEqual([
      { groupId: 1, label: "Alice & Bob Smith", guests: [bob] },
      { groupId: 2, label: "Zoë Ndlovu & Carl Botha", guests: [carl] },
    ]);
  });

  it("summarises answers, counting dietary, shuttle and staying over the guests who are coming", () => {
    const summary = adminSummary([alice, bob, zoë, carl]);
    expect(summary).toEqual(
      expect.objectContaining({
        invited: 4,
        signedUp: 1,
        answered: 3,
        attending: 2,
        declined: 1,
        awaiting: 1,
        missingDetails: 1,
        shuttle: { yes: 1, no: 0, unanswered: 1 },
        staying: { pinned: 2, unanswered: 0 },
      }),
    );
    expect(summary.dietary).toEqual({ none: 0, vegetarian: 2, halaal: 0, kosher: 0, other: 0 });
  });

  it("builds invite links for the login page", () => {
    expect(inviteLink("https://hj-wedding-day.co.za", "abc-123")).toBe(
      "https://hj-wedding-day.co.za/login?sign-up-token=abc-123",
    );
  });

  it("puts a new group after the highest existing one", () => {
    expect(nextGroupId([alice, zoë])).toBe(3);
    expect(nextGroupId([])).toBe(1);
  });

  it("summarises an answer in a line", () => {
    expect(answerSummary(coming)).toBe("Vegetarian · Shuttle: yes · Staying: pinned");
    expect(
      answerSummary({
        ...coming,
        dietary: "other",
        dietaryOtherDetails: "No nuts",
        shuttle: null,
        accommodation: null,
      }),
    ).toBe("Other: No nuts · Shuttle: not sure · Staying: no answer");
    expect(answerSummary(carl.rsvp!)).toBe("Not coming");
  });

  it("names the parts of an RSVP that changed", () => {
    const change = { changedFields: "attending, dietary, dietary_other_details, accommodation" };
    expect(changedFieldLabels(change as RsvpChange)).toEqual(["Attendance", "Dietary", "Staying"]);
  });
});

describe("guest timeline", () => {
  const details = (overrides: Partial<GuestHistoryEntry>): GuestHistoryEntry => ({
    historyId: 1,
    groupId: 1,
    name: "Alice",
    surname: "Smith",
    signUpUuid: "invite",
    email: null,
    tokenName: null,
    signedUpAt: null,
    updatedBy: 9,
    recordedAt: "2026-10-01T10:00:00.000Z",
    ...overrides,
  });
  const names = (guestId: number | null) =>
    guestId === null
      ? null
      : ({ 1: "Alice Smith", 9: "Jordan Admin" } as Record<number, string>)[guestId];
  const timeline = (history: Partial<GuestHistory>) =>
    guestTimeline(
      { details: [], roles: [], rsvps: [], ...history },
      names,
      (groupId) => `Group ${groupId}`,
    ).map(({ at, title, detail, by }) => [at.slice(5, 10), title, detail, by]);

  it("tells the story of the guest's details, newest first", () => {
    expect(
      timeline({
        details: [
          details({}),
          details({
            historyId: 2,
            signedUpAt: "x",
            email: "alice@example.com",
            updatedBy: 1,
            recordedAt: "2026-10-02T10:00:00.000Z",
          }),
          details({
            historyId: 3,
            surname: "Jones",
            groupId: 2,
            signedUpAt: "x",
            email: "alice@example.com",
            recordedAt: "2026-10-03T10:00:00.000Z",
          }),
          details({
            historyId: 4,
            surname: "Jones",
            groupId: 2,
            recordedAt: "2026-10-04T10:00:00.000Z",
          }),
          details({
            historyId: 5,
            surname: "Jones",
            groupId: 2,
            signUpUuid: "new-invite",
            recordedAt: "2026-10-05T10:00:00.000Z",
          }),
          details({
            historyId: 6,
            surname: "Jones",
            groupId: 2,
            signUpUuid: "new-invite",
            recordedAt: "2026-10-06T10:00:00.000Z",
          }),
        ],
      }),
    ).toEqual([
      ["10-06", "Details updated", null, "Jordan Admin"],
      ["10-05", "New invite link made", null, "Jordan Admin"],
      ["10-04", "Google account unlinked", "alice@example.com", "Jordan Admin"],
      ["10-03", "Moved to another group", "Group 2", "Jordan Admin"],
      ["10-03", "Renamed", "Alice Smith → Alice Jones", "Jordan Admin"],
      ["10-02", "Signed up", "alice@example.com", null],
      ["10-01", "Added to the guest list", null, "Jordan Admin"],
    ]);
  });

  it("includes roles being given and taken away", () => {
    expect(
      timeline({
        roles: [
          {
            role: "viewer",
            grantedBy: 9,
            grantedAt: "2026-10-01T10:00:00.000Z",
            revokedBy: 9,
            revokedAt: "2026-10-03T10:00:00.000Z",
          },
          {
            role: "admin",
            grantedBy: null,
            grantedAt: "2026-10-02T10:00:00.000Z",
            revokedBy: null,
            revokedAt: null,
          },
        ],
      }),
    ).toEqual([
      ["10-03", "Viewer role removed", null, "Jordan Admin"],
      ["10-02", "Given the Admin role", null, null],
      ["10-01", "Given the Viewer role", null, "Jordan Admin"],
    ]);
  });

  it("shows the first answer, what changed after it, and skips saves that changed nothing", () => {
    const at = (day: number) => `2026-10-0${day}T10:00:00.000Z`;
    expect(
      timeline({
        rsvps: [
          { ...coming, historyId: 1, respondedAt: at(1) },
          { ...coming, historyId: 2, respondedAt: at(2), respondedBy: 9 },
          {
            ...coming,
            historyId: 3,
            respondedAt: at(3),
            dietary: "none",
            shuttle: false,
            accommodation: null,
          },
          { ...carl.rsvp!, historyId: 4, respondedAt: at(4) },
        ],
      }),
    ).toEqual([
      ["10-04", "Changed to not coming", "Not coming", "Alice Smith"],
      [
        "10-03",
        "Updated RSVP",
        "Dietary: Vegetarian → No dietary requirements · Shuttle: yes → no · Staying: pin removed",
        "Alice Smith",
      ],
      ["10-01", "RSVPed: coming", "Vegetarian · Shuttle: yes · Staying: pinned", "Alice Smith"],
    ]);
  });
});
