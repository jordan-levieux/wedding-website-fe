import { Group, GroupGuest, Rsvp } from "./api";
import { draftFor, guestStatus, rsvpAttention, stayingAt, toRsvpInput } from "./rsvp";

const rsvp = (overrides: Partial<Rsvp> = {}): Rsvp => ({
  attending: true,
  dietary: "none",
  dietaryOtherDetails: null,
  shuttle: true,
  respondedBy: 1,
  respondedAt: "2026-10-24T10:00:00.000Z",
  ...overrides,
});
const guest = (
  guestId: number,
  answer: Rsvp | null = null,
  ownAccommodation: GroupGuest["ownAccommodation"] = null,
): GroupGuest => ({
  guestId,
  name: `Guest ${guestId}`,
  surname: "Smith",
  rsvp: answer,
  ownAccommodation,
});

describe("draftFor", () => {
  it("copies the caller's shuttle answer to someone who hasn't answered", () => {
    const self = guest(1, rsvp());
    expect(draftFor(guest(2), self)).toEqual({
      draft: { attending: null, dietary: null, dietaryOtherDetails: "", shuttle: "yes" },
      prefilled: ["shuttle"],
    });
  });

  it("keeps someone else's own shuttle answer", () => {
    const { draft, prefilled } = draftFor(guest(2, rsvp({ shuttle: false })), guest(1, rsvp()));
    expect(draft.shuttle).toBe("no");
    expect(prefilled).toEqual([]);
  });

  it("copies nothing from a caller who isn't coming, or into their own form", () => {
    expect(draftFor(guest(2), guest(1, rsvp({ attending: false }))).prefilled).toEqual([]);
    const self = guest(1, rsvp({ shuttle: null }));
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
      }),
    ).toEqual({
      guestId: 2,
      attending: false,
      dietary: null,
      dietaryOtherDetails: null,
      shuttle: null,
    });
  });

  it("turns 'not sure' into no shuttle answer and keeps details only for 'other'", () => {
    expect(
      toRsvpInput(2, {
        attending: "yes",
        dietary: "vegetarian",
        dietaryOtherDetails: "left over",
        shuttle: "unsure",
      }),
    ).toEqual({
      guestId: 2,
      attending: true,
      dietary: "vegetarian",
      dietaryOtherDetails: null,
      shuttle: null,
    });
  });
});

describe("stayingAt", () => {
  it("is the guest's own place, or else the group's", () => {
    const group = { accommodation: { lat: 1, lng: 2 } };
    expect(stayingAt(guest(1), group)).toEqual({ lat: 1, lng: 2 });
    expect(stayingAt(guest(1, null, { lat: 3, lng: 4 }), group)).toEqual({ lat: 3, lng: 4 });
    expect(stayingAt(guest(1), { accommodation: null })).toBeNull();
  });
});

describe("guestStatus and rsvpAttention", () => {
  it("counts people who haven't answered and coming guests missing optional answers", () => {
    const group: Group = {
      selfId: 1,
      roles: [],
      rsvpDeadline: "2027-01-31T21:59:59.000Z",
      accommodation: { lat: -33.9, lng: 22.6 },
      guests: [
        guest(1, rsvp()),
        guest(2),
        guest(3, rsvp({ shuttle: null })),
        guest(4, rsvp({ attending: false, shuttle: null, dietary: null })),
      ],
    };
    expect(group.guests.map((member) => guestStatus(member, group))).toEqual([
      "complete",
      "unanswered",
      "incomplete",
      "complete",
    ]);
    expect(rsvpAttention(group)).toEqual({ unanswered: 1, incomplete: 1 });
  });

  it("counts a coming guest as incomplete until there's a place for them", () => {
    const coming = guest(1, rsvp());
    expect(guestStatus(coming, { accommodation: null })).toBe("incomplete");
    expect(guestStatus(guest(1, rsvp(), { lat: 1, lng: 2 }), { accommodation: null })).toBe(
      "complete",
    );
  });
});
