// Mirrors the backend's admin responses (wedding-website-be/src/admin-store.ts).
import { DIETARY_OPTIONS, DietaryOption, Role, Rsvp } from "./api";
import { DIETARY_LABELS } from "./rsvp";

export type AdminGuest = {
  guestId: number;
  groupId: number;
  name: string;
  surname: string;
  email: string | null;
  tokenName: string | null;
  // null for viewers: an invite lets whoever holds it claim the guest
  signUpUuid: string | null;
  signedUpAt: string | null;
  updatedBy: number | null;
  roles: Role[];
  rsvp: Rsvp | null;
};

export type AdminStatus = "attending" | "declined" | "awaiting";

export const adminStatus = (guest: AdminGuest): AdminStatus =>
  !guest.rsvp ? "awaiting" : guest.rsvp.attending ? "attending" : "declined";

export const ADMIN_STATUS_DISPLAY: Record<AdminStatus, { label: string; icon: string }> = {
  attending: { label: "Attending", icon: "check_circle" },
  declined: { label: "Declined", icon: "cancel" },
  awaiting: { label: "Awaiting", icon: "schedule" },
};

// coming, but we'd still like to know about the shuttle or where they're staying
export const missingDetails = (guest: AdminGuest) =>
  !!guest.rsvp?.attending && (guest.rsvp.shuttle === null || guest.rsvp.accommodation === null);

export const GUEST_FILTERS = [
  "all",
  "awaiting",
  "attending",
  "declined",
  "not-signed-up",
  "missing-details",
] as const;
export type GuestFilter = (typeof GUEST_FILTERS)[number];

export const GUEST_FILTER_LABELS: Record<GuestFilter, string> = {
  all: "All",
  awaiting: "Awaiting",
  attending: "Attending",
  declined: "Declined",
  "not-signed-up": "Not signed up",
  "missing-details": "Missing details",
};

export const toGuestFilter = (value: string | undefined): GuestFilter =>
  GUEST_FILTERS.includes(value as GuestFilter) ? (value as GuestFilter) : "all";

export const matchesFilter = (guest: AdminGuest, filter: GuestFilter) => {
  switch (filter) {
    case "all":
      return true;
    case "not-signed-up":
      return !guest.signedUpAt;
    case "missing-details":
      return missingDetails(guest);
    default:
      return adminStatus(guest) === filter;
  }
};

const normalise = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const matchesSearch = (guest: AdminGuest, search: string) => {
  const terms = normalise(search).split(/\s+/).filter(Boolean);
  const haystack = normalise(`${guest.name} ${guest.surname} ${guest.email ?? ""}`);
  return terms.every((term) => haystack.includes(term));
};

export type GuestGroup = {
  groupId: number;
  label: string;
  guests: AdminGuest[];
};

// "Alice & Bob Smith", or full names when the surnames differ
export const groupLabel = (guests: AdminGuest[]) => {
  const surnames = new Set(guests.map((guest) => guest.surname));
  const names =
    surnames.size === 1
      ? guests.map((guest) => guest.name)
      : guests.map((guest) => `${guest.name} ${guest.surname}`);
  const listed =
    names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : (names[0] ?? "");
  return surnames.size === 1 ? `${listed} ${guests[0].surname}` : listed;
};

const byGroup = (guests: AdminGuest[]) => {
  const groups = new Map<number, AdminGuest[]>();
  guests.forEach((guest) =>
    groups.set(guest.groupId, [...(groups.get(guest.groupId) ?? []), guest]),
  );
  return groups;
};

// keeps the API's order (by group, then guest), labelling each group by all of its members
export const groupGuests = (all: AdminGuest[], shown: AdminGuest[]): GuestGroup[] => {
  const members = byGroup(all);
  return [...byGroup(shown)].map(([groupId, guests]) => ({
    groupId,
    label: groupLabel(members.get(groupId) ?? guests),
    guests,
  }));
};

export const nextGroupId = (guests: AdminGuest[]) =>
  Math.max(0, ...guests.map((guest) => guest.groupId)) + 1;

export type AdminSummary = {
  invited: number;
  signedUp: number;
  answered: number;
  attending: number;
  declined: number;
  awaiting: number;
  missingDetails: number;
  // the rest are counted over the guests who are coming
  dietary: Record<DietaryOption, number>;
  shuttle: { yes: number; no: number; unanswered: number };
  staying: { pinned: number; unanswered: number };
};

export const adminSummary = (guests: AdminGuest[]): AdminSummary => {
  const attending = guests.filter((guest) => guest.rsvp?.attending).map((guest) => guest.rsvp!);
  const count = (predicate: (guest: AdminGuest) => boolean) => guests.filter(predicate).length;
  return {
    invited: guests.length,
    signedUp: count((guest) => !!guest.signedUpAt),
    answered: count((guest) => !!guest.rsvp),
    attending: attending.length,
    declined: count((guest) => adminStatus(guest) === "declined"),
    awaiting: count((guest) => !guest.rsvp),
    missingDetails: count(missingDetails),
    dietary: Object.fromEntries(
      DIETARY_OPTIONS.map((option) => [
        option,
        attending.filter((rsvp) => rsvp.dietary === option).length,
      ]),
    ) as Record<DietaryOption, number>,
    shuttle: {
      yes: attending.filter((rsvp) => rsvp.shuttle === true).length,
      no: attending.filter((rsvp) => rsvp.shuttle === false).length,
      unanswered: attending.filter((rsvp) => rsvp.shuttle === null).length,
    },
    staying: {
      pinned: attending.filter((rsvp) => rsvp.accommodation).length,
      unanswered: attending.filter((rsvp) => !rsvp.accommodation).length,
    },
  };
};

export const inviteLink = (origin: string, signUpUuid: string) =>
  `${origin}/login?sign-up-token=${encodeURIComponent(signUpUuid)}`;

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  viewer: "Viewer",
  venue_accommodation: "Venue stay",
};

export const ROLES = Object.keys(ROLE_LABELS) as Role[];

export type NewGuest = {
  // null puts the guest in a new group of their own
  groupId: number | null;
  name: string;
  surname: string;
  roles: Role[];
};

export type GuestUpdate = Partial<{
  groupId: number;
  name: string;
  surname: string;
  roles: Role[];
  regenerateInvite: boolean;
  unlinkGoogleAccount: boolean;
}>;

export type GuestHistoryEntry = {
  historyId: number;
  groupId: number;
  name: string;
  surname: string;
  signUpUuid: string | null;
  email: string | null;
  tokenName: string | null;
  signedUpAt: string | null;
  updatedBy: number | null;
  recordedAt: string;
};

export type RoleHistoryEntry = {
  role: Role;
  grantedBy: number | null;
  grantedAt: string;
  revokedBy: number | null;
  revokedAt: string | null;
};

export type GuestHistory = {
  details: GuestHistoryEntry[];
  roles: RoleHistoryEntry[];
  // respondedAt is when that version was recorded
  rsvps: (Rsvp & { historyId: number })[];
};

export type RsvpChange = {
  recordedAt: string;
  guestId: number;
  guest: string;
  previousAnswerBy: string;
  changedBy: string;
  // comma separated column names, e.g. "attending, dietary"
  changedFields: string;
  wasAttending: boolean;
  nowAttending: boolean;
  prevHistoryId: number;
  historyId: number;
};

const FIELD_LABELS: Record<string, string> = {
  attending: "Attendance",
  dietary: "Dietary",
  dietary_other_details: "Dietary",
  shuttle: "Shuttle",
  accommodation: "Staying",
};

export const changedFieldLabels = (change: RsvpChange) => [
  ...new Set(change.changedFields.split(", ").map((field) => FIELD_LABELS[field] ?? field)),
];

const dietaryText = (rsvp: Rsvp) =>
  rsvp.dietary === "other" ? `Other: ${rsvp.dietaryOtherDetails}` : DIETARY_LABELS[rsvp.dietary!];

const shuttleText = (shuttle: boolean | null) =>
  shuttle === null ? "not sure" : shuttle ? "yes" : "no";

export const answerSummary = (rsvp: Rsvp) =>
  rsvp.attending
    ? [
        dietaryText(rsvp),
        `Shuttle: ${shuttleText(rsvp.shuttle)}`,
        rsvp.accommodation ? "Staying: pinned" : "Staying: no answer",
      ].join(" · ")
    : "Not coming";

export type TimelineEntry = {
  at: string;
  icon: string;
  title: string;
  detail: string | null;
  by: string | null;
};

const sameLocation = (a: Rsvp["accommodation"], b: Rsvp["accommodation"]) =>
  a?.lat === b?.lat && a?.lng === b?.lng;

const rsvpChanges = (before: Rsvp, after: Rsvp) => {
  if (!after.attending) {
    return [];
  }
  return [
    dietaryText(before) !== dietaryText(after) &&
      `Dietary: ${before.attending ? dietaryText(before) : "—"} → ${dietaryText(after)}`,
    before.shuttle !== after.shuttle &&
      `Shuttle: ${shuttleText(before.shuttle)} → ${shuttleText(after.shuttle)}`,
    !sameLocation(before.accommodation, after.accommodation) &&
      (after.accommodation ? "Staying: new pin" : "Staying: pin removed"),
  ].filter((change) => change !== false);
};

/**
 * One newest-first story of a guest's details, roles and RSVP. `names` resolves guest ids to names
 * and `groups` group ids to their labels.
 */
export const guestTimeline = (
  history: GuestHistory,
  names: (guestId: number | null) => string | null,
  groups: (groupId: number) => string,
): TimelineEntry[] => {
  const entries: TimelineEntry[] = [];
  const add = (at: string, icon: string, title: string, by: number | null, detail?: string) =>
    entries.push({ at, icon, title, detail: detail ?? null, by: names(by) });

  history.details.forEach((entry, index) => {
    const before = history.details[index - 1];
    const { recordedAt: at, updatedBy: by } = entry;
    if (!before) {
      add(at, "person_add", "Added to the guest list", by);
      return;
    }
    const count = entries.length;
    if (!before.signedUpAt && entry.signedUpAt) {
      add(at, "login", "Signed up", null, entry.email ?? undefined);
    }
    if (before.signedUpAt && !entry.signedUpAt) {
      add(at, "link_off", "Google account unlinked", by, before.email ?? undefined);
    }
    if (before.name !== entry.name || before.surname !== entry.surname) {
      add(
        at,
        "edit",
        "Renamed",
        by,
        `${before.name} ${before.surname} → ${entry.name} ${entry.surname}`,
      );
    }
    if (before.groupId !== entry.groupId) {
      add(at, "group", "Moved to another group", by, groups(entry.groupId));
    }
    if (before.signUpUuid && entry.signUpUuid && before.signUpUuid !== entry.signUpUuid) {
      add(at, "autorenew", "New invite link made", by);
    }
    // e.g. a new invite link, which viewers can't see
    if (entries.length === count) {
      add(at, "edit", "Details updated", by);
    }
  });

  history.roles.forEach((role) => {
    const label = ROLE_LABELS[role.role];
    add(role.grantedAt, "verified_user", `Given the ${label} role`, role.grantedBy);
    if (role.revokedAt) {
      add(role.revokedAt, "remove_moderator", `${label} role removed`, role.revokedBy);
    }
  });

  history.rsvps.forEach((rsvp, index) => {
    const before = history.rsvps[index - 1];
    const icon = rsvp.attending ? "check_circle" : "cancel";
    if (!before) {
      add(
        rsvp.respondedAt,
        icon,
        rsvp.attending ? "RSVPed: coming" : "RSVPed: not coming",
        rsvp.respondedBy,
        answerSummary(rsvp),
      );
    } else if (before.attending !== rsvp.attending) {
      add(
        rsvp.respondedAt,
        icon,
        rsvp.attending ? "Changed to coming" : "Changed to not coming",
        rsvp.respondedBy,
        answerSummary(rsvp),
      );
    } else {
      const changes = rsvpChanges(before, rsvp);
      if (changes.length) {
        add(rsvp.respondedAt, "edit_note", "Updated RSVP", rsvp.respondedBy, changes.join(" · "));
      }
    }
  });

  return entries
    .map((entry, order) => ({ entry, order }))
    .sort((a, b) => b.entry.at.localeCompare(a.entry.at) || b.order - a.order)
    .map(({ entry }) => entry);
};
