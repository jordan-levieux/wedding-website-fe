import { Group, GroupGuest, Rsvp } from "./api";
import { draftFor, guestStatus, rsvpAttention, toRsvpInput } from "./rsvp";

const rsvp = (overrides: Partial<Rsvp> = {}): Rsvp => ({
  attending: true,
  dietary: "none",
  dietaryOtherDetails: null,
  shuttle: true,
  accommodation: { lat: -33.9249, lng: 18.4241 },
  respondedBy: 1,
  respondedAt: "2026-10-24T10:00:00.000Z",
  ...overrides,
});
const guest = (guestId: number, answer: Rsvp | null = null): GroupGuest => ({
  guestId,
  name: `Guest ${guestId}`,
  surname: "Smith",
  rsvp: answer,
});

describe("draftFor", () => {
  it("copies the caller's shuttle and accommodation to someone who hasn't answered", () => {
    const self = guest(1, rsvp());
    expect(draftFor(guest(2), self)).toEqual({
      draft: {
        attending: null,
        dietary: null,
        dietaryOtherDetails: "",
        shuttle: "yes",
        accommodation: { lat: -33.9249, lng: 18.4241 },
      },
      prefilled: ["shuttle", "accommodation"],
    });
  });

  it("only fills in what's missing from someone else's answer", () => {
    const self = guest(1, rsvp());
    const other = guest(2, rsvp({ shuttle: false, accommodation: null }));
    const { draft, prefilled } = draftFor(other, self);
    expect(draft.shuttle).toBe("no");
    expect(draft.accommodation).toEqual({ lat: -33.9249, lng: 18.4241 });
    expect(prefilled).toEqual(["accommodation"]);
  });

  it("copies nothing from a caller who isn't coming, or into their own form", () => {
    expect(draftFor(guest(2), guest(1, rsvp({ attending: false }))).prefilled).toEqual([]);
    const self = guest(1, rsvp({ shuttle: null, accommodation: null }));
    expect(draftFor(self, self).prefilled).toEqual([]);
  });
});

describe("toRsvpInput", () => {
  it("drops everything but the answer for someone who isn't coming", () => {
    expect(
      toRsvpInput(2, {
        attending: "no",
        dietary: "other",
        dietaryOtherDetails: "nuts",
        shuttle: "yes",
        accommodation: { lat: -33.9, lng: 18.4 },
      }),
    ).toEqual({
      guestId: 2,
      attending: false,
      dietary: null,
      dietaryOtherDetails: null,
      shuttle: null,
      accommodation: null,
    });
  });

  it("turns 'not sure' into no shuttle answer and keeps details only for 'other'", () => {
    expect(
      toRsvpInput(2, {
        attending: "yes",
        dietary: "vegetarian",
        dietaryOtherDetails: "left over",
        shuttle: "unsure",
        accommodation: null,
      }),
    ).toEqual({
      guestId: 2,
      attending: true,
      dietary: "vegetarian",
      dietaryOtherDetails: null,
      shuttle: null,
      accommodation: null,
    });
  });
});

describe("guestStatus and rsvpAttention", () => {
  it("counts people who haven't answered and coming guests missing optional answers", () => {
    const group: Group = {
      selfId: 1,
      roles: [],
      rsvpDeadline: "2027-01-31T21:59:59.000Z",
      guests: [
        guest(1, rsvp()),
        guest(2),
        guest(3, rsvp({ shuttle: null })),
        guest(4, rsvp({ attending: false, shuttle: null, accommodation: null, dietary: null })),
      ],
    };
    expect(group.guests.map(guestStatus)).toEqual([
      "complete",
      "unanswered",
      "incomplete",
      "complete",
    ]);
    expect(rsvpAttention(group)).toEqual({ unanswered: 1, incomplete: 1 });
  });
});
