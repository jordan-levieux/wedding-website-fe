import { AdminGuest } from "./admin";
import { Rsvp } from "./api";
import { distanceKm, guestPlaces, unpinnedGuests } from "./guest-map";

const venue = { lat: -33.936306, lng: 22.666 };
const near = { lat: -33.95, lng: 22.66 };
const far = { lat: -33.96, lng: 22.46 };

const coming = (accommodation: Rsvp["accommodation"]): Rsvp => ({
  attending: true,
  dietary: "none",
  dietaryOtherDetails: null,
  shuttle: true,
  accommodation,
  respondedBy: 1,
  respondedAt: "2026-10-24T10:00:00.000Z",
});

const guest = (guestId: number, rsvp: Rsvp | null): AdminGuest => ({
  guestId,
  groupId: guestId,
  name: `Guest${guestId}`,
  surname: "Smith",
  email: null,
  tokenName: null,
  signUpUuid: null,
  signedUpAt: null,
  updatedBy: null,
  roles: [],
  rsvp,
});

describe("guest map", () => {
  it("measures distances in km", () => {
    expect(distanceKm(venue, venue)).toBe(0);
    // George to Oudtshoorn is about 50 km
    expect(distanceKm({ lat: -33.963, lng: 22.4617 }, { lat: -33.5907, lng: 22.2014 })).toBeCloseTo(
      47.4,
      0,
    );
  });

  it("puts guests on the same pin together, nearest the venue first", () => {
    const guests = [
      guest(1, coming(far)),
      guest(2, coming(near)),
      guest(3, coming(far)),
      guest(4, { ...coming(null), attending: false }),
      guest(5, coming(null)),
      guest(6, null),
    ];
    const places = guestPlaces(guests, venue);
    expect(places.map((place) => place.guests.map((g) => g.guestId))).toEqual([[2], [1, 3]]);
    expect(places[0].distanceKm).toBeLessThan(places[1].distanceKm);
    expect(unpinnedGuests(guests).map((g) => g.guestId)).toEqual([5]);
  });
});
