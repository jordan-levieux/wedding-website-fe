import { Coordinates, DietaryOption, Group, GroupGuest, Rsvp, RsvpInput } from "./api";

// a guest's own place wins over their group's
export const stayingAt = (
  guest: GroupGuest,
  group: Pick<Group, "accommodation">,
): Coordinates | null => guest.ownAccommodation ?? group.accommodation;

export type YesNo = "yes" | "no";

export type MaybeAnswer = YesNo | "unsure";

// the yes/no/not sure questions asked of guests who are coming, which they can leave for later
export const OPTIONAL_ANSWERS = ["shuttle", "braai", "brunch"] as const;
export type OptionalAnswer = (typeof OPTIONAL_ANSWERS)[number];

// form-friendly version of an RSVP: the toggle groups bind to strings
export type RsvpDraft = {
  attending: YesNo | null;
  dietary: DietaryOption | null;
  dietaryOtherDetails: string;
} & Record<OptionalAnswer, MaybeAnswer>;

const toYesNo = (value: boolean): YesNo => (value ? "yes" : "no");

const toMaybeAnswer = (value: boolean | null | undefined): MaybeAnswer =>
  value == null ? "unsure" : toYesNo(value);

/**
 * The draft to show for a guest. The optional answers of anyone else in the group are filled in from
 * the caller's own RSVP when they haven't given them, so families only change what differs.
 */
export const draftFor = (
  guest: GroupGuest,
  self: GroupGuest | undefined,
): { draft: RsvpDraft; prefilled: OptionalAnswer[] } => {
  const rsvp = guest.rsvp;
  const draft: RsvpDraft = {
    attending: rsvp ? toYesNo(rsvp.attending) : null,
    dietary: rsvp?.dietary ?? null,
    dietaryOtherDetails: rsvp?.dietaryOtherDetails ?? "",
    shuttle: toMaybeAnswer(rsvp?.shuttle),
    braai: toMaybeAnswer(rsvp?.braai),
    brunch: toMaybeAnswer(rsvp?.brunch),
  };
  const source = guest.guestId === self?.guestId ? undefined : self?.rsvp;
  const prefilled = OPTIONAL_ANSWERS.filter(
    (field) => source?.attending && rsvp?.[field] == null && source[field] != null,
  );
  prefilled.forEach((field) => (draft[field] = toMaybeAnswer(source![field])));
  return { draft, prefilled };
};

export const toRsvpInput = (guestId: number, draft: RsvpDraft): RsvpInput => {
  const attending = draft.attending === "yes";
  const answer = (field: OptionalAnswer) =>
    !attending || draft[field] === "unsure" ? null : draft[field] === "yes";
  return {
    guestId,
    attending,
    dietary: attending ? draft.dietary : null,
    dietaryOtherDetails:
      attending && draft.dietary === "other" ? draft.dietaryOtherDetails.trim() : null,
    shuttle: answer("shuttle"),
    braai: answer("braai"),
    brunch: answer("brunch"),
  };
};

export const hasOpenAnswers = (rsvp: Rsvp) =>
  OPTIONAL_ANSWERS.some((field) => rsvp[field] === null);

export type GuestStatus = "unanswered" | "incomplete" | "complete";

// optional answers we'd still like from guests who are coming
export const guestStatus = (
  guest: GroupGuest,
  group: Pick<Group, "accommodation">,
): GuestStatus => {
  if (!guest.rsvp) {
    return "unanswered";
  }
  if (guest.rsvp.attending && (hasOpenAnswers(guest.rsvp) || !stayingAt(guest, group))) {
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
