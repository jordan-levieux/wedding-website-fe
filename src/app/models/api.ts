// Mirrors the backend's response and request shapes (wedding-website-be/src/model.ts and guest-store.ts).

export const DIETARY_OPTIONS = ["none", "vegetarian", "halaal", "kosher", "other"] as const;
export type DietaryOption = (typeof DIETARY_OPTIONS)[number];

export type Role = "admin" | "viewer" | "venue_accommodation";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type Rsvp = {
  attending: boolean;
  dietary: DietaryOption | null;
  dietaryOtherDetails: string | null;
  shuttle: boolean | null;
  respondedBy: number;
  respondedAt: string;
};

export type GroupGuest = {
  guestId: number;
  name: string;
  surname: string;
  rsvp: Rsvp | null;
  // where this guest is staying when it isn't with the rest of the group
  ownAccommodation: Coordinates | null;
};

export type Group = {
  selfId: number;
  roles: Role[];
  // where the group is staying; editable after the RSVP deadline too
  accommodation: Coordinates | null;
  guests: GroupGuest[];
  rsvpDeadline: string;
};

export type RsvpInput = {
  guestId: number;
  attending: boolean;
  dietary: DietaryOption | null;
  dietaryOtherDetails: string | null;
  shuttle: boolean | null;
};

export type ApiError = {
  error: string;
};
