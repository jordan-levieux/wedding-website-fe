import { formatCoordinates, parseCoordinates } from "./coordinates";
import { DietaryOption, Group, GroupGuest, RsvpInput } from "./api";

export type YesNo = "yes" | "no";

// form-friendly version of an RSVP: radio groups bind to strings, the location is free text
export type RsvpDraft = {
  attending: YesNo | null;
  dietary: DietaryOption | null;
  dietaryOtherDetails: string;
  shuttle: YesNo | "unsure";
  accommodation: string;
};

export type PrefilledField = "shuttle" | "accommodation";

const toYesNo = (value: boolean): YesNo => (value ? "yes" : "no");

/**
 * The draft to show for a guest. The shuttle and accommodation answers of anyone else in the group are
 * filled in from the caller's own RSVP when they haven't given one, so families only change what differs.
 */
export const draftFor = (
  guest: GroupGuest,
  self: GroupGuest | undefined,
): { draft: RsvpDraft; prefilled: PrefilledField[] } => {
  const rsvp = guest.rsvp;
  const draft: RsvpDraft = {
    attending: rsvp ? toYesNo(rsvp.attending) : null,
    dietary: rsvp?.dietary ?? null,
    dietaryOtherDetails: rsvp?.dietaryOtherDetails ?? "",
    shuttle: rsvp?.shuttle == null ? "unsure" : toYesNo(rsvp.shuttle),
    accommodation: formatCoordinates(rsvp?.accommodation ?? null),
  };
  const prefilled: PrefilledField[] = [];
  const source = guest.guestId === self?.guestId ? undefined : self?.rsvp;
  if (source?.attending) {
    if (rsvp?.shuttle == null && source.shuttle != null) {
      draft.shuttle = toYesNo(source.shuttle);
      prefilled.push("shuttle");
    }
    if (!rsvp?.accommodation && source.accommodation) {
      draft.accommodation = formatCoordinates(source.accommodation);
      prefilled.push("accommodation");
    }
  }
  return { draft, prefilled };
};

export const toRsvpInput = (guestId: number, draft: RsvpDraft): RsvpInput => {
  const attending = draft.attending === "yes";
  return {
    guestId,
    attending,
    dietary: attending ? draft.dietary : null,
    dietaryOtherDetails:
      attending && draft.dietary === "other" ? draft.dietaryOtherDetails.trim() : null,
    shuttle: !attending || draft.shuttle === "unsure" ? null : draft.shuttle === "yes",
    accommodation: attending ? parseCoordinates(draft.accommodation) : null,
  };
};

export type GuestStatus = "unanswered" | "incomplete" | "complete";

// optional answers we'd still like from guests who are coming
export const guestStatus = (guest: GroupGuest): GuestStatus => {
  if (!guest.rsvp) {
    return "unanswered";
  }
  if (guest.rsvp.attending && (guest.rsvp.shuttle === null || guest.rsvp.accommodation === null)) {
    return "incomplete";
  }
  return "complete";
};

export const rsvpAttention = (group: Group | null) => {
  const statuses = group?.guests.map(guestStatus) ?? [];
  return {
    unanswered: statuses.filter((status) => status === "unanswered").length,
    incomplete: statuses.filter((status) => status === "incomplete").length,
  };
};

export const DIETARY_LABELS: Record<DietaryOption, string> = {
  none: "No dietary requirements",
  vegetarian: "Vegetarian",
  halaal: "Halaal",
  kosher: "Kosher",
  other: "Other (tell us more)",
};
