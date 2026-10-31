import { AdminGuest } from "./admin";
import { Coordinates } from "./api";

export type GuestPlace = {
  key: string;
  position: Coordinates;
  guests: AdminGuest[];
  // as the crow flies
  distanceKm: number;
};

const EARTH_RADIUS_KM = 6371;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

export const distanceKm = (a: Coordinates, b: Coordinates) => {
  const h =
    Math.sin(radians(b.lat - a.lat) / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

// where the guests who are coming are staying, one place per pin and nearest the venue first
export const guestPlaces = (guests: AdminGuest[], venue: Coordinates): GuestPlace[] => {
  const places = new Map<string, GuestPlace>();
  guests.forEach((guest) => {
    const position = guest.rsvp?.attending ? guest.rsvp.accommodation : null;
    if (!position) {
      return;
    }
    const key = `${position.lat},${position.lng}`;
    const place = places.get(key);
    if (place) {
      place.guests.push(guest);
    } else {
      places.set(key, { key, position, guests: [guest], distanceKm: distanceKm(venue, position) });
    }
  });
  return [...places.values()].sort((a, b) => a.distanceKm - b.distanceKm);
};

export const unpinnedGuests = (guests: AdminGuest[]) =>
  guests.filter((guest) => guest.rsvp?.attending && !guest.rsvp.accommodation);
