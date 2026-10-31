import { Coordinates, DietaryOption, Group, GroupGuest, RsvpInput } from "./api";

// a guest's own place wins over their group's
export const stayingAt = (
  guest: GroupGuest,
  group: Pick<Group, "accommodation">,
): Coordinates | null => guest.ownAccommodation ?? group.accommodation;

export type YesNo = "yes" | "no";

// form-friendly version of an RSVP: the toggle groups bind to strings
export type RsvpDraft = {
  attending: YesNo | null;
  dietary: DietaryOption | null;
  dietaryOtherDetails: string;
  shuttle: YesNo | "unsure";
};

export type PrefilledField = "shuttle";

const toYesNo = (value: boolean): YesNo => (value ? "yes" : "no");

/**
 * The draft to show for a guest. The shuttle answer of anyone else in the group is filled in from the
 * caller's own RSVP when they haven't given one, so families only change what differs.
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
  };
  const prefilled: PrefilledField[] = [];
  const source = guest.guestId === self?.guestId ? undefined : self?.rsvp;
  if (source?.attending && rsvp?.shuttle == null && source.shuttle != null) {
    draft.shuttle = toYesNo(source.shuttle);
    prefilled.push("shuttle");
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
  };
};

export type GuestStatus = "unanswered" | "incomplete" | "complete";

// optional answers we'd still like from guests who are coming
export const guestStatus = (
  guest: GroupGuest,
  group: Pick<Group, "accommodation">,
): GuestStatus => {
  if (!guest.rsvp) {
    return "unanswered";
  }
  if (guest.rsvp.attending && (guest.rsvp.shuttle === null || !stayingAt(guest, group))) {
    return "incomplete";
  }
  return "complete";
};

export const rsvpAttention = (group: Group | null) => {
  const statuses = group?.guests.map((guest) => guestStatus(guest, group)) ?? [];
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
  other: "Other",
};
