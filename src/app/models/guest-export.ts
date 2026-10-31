import { ADMIN_STATUS_DISPLAY, AdminGuest, adminStatus, groupLabel, ROLE_LABELS } from "./admin";
import { mapsLink } from "./coordinates";
import { DIETARY_LABELS } from "./rsvp";

const COLUMNS = [
  "Group",
  "First name",
  "Surname",
  "Status",
  "Dietary",
  "Dietary details",
  "Shuttle",
  "Staying",
  "Latitude",
  "Longitude",
  "Answered by",
  "Answered on",
  "Signed up",
  "Email",
  "Roles",
];

const pad = (value: number) => String(value).padStart(2, "0");

// local time in a form spreadsheets read as a date
export const spreadsheetDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const cell = (value: string | number | null) => {
  let text = value === null ? "" : String(value);
  // guests type their own dietary details: don't let a spreadsheet run them as a formula
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/**
 * Every given guest as a CSV row, for the organisers' spreadsheets. `all` is the whole guest list,
 * used to label groups and name who answered. Invite links are left out, since anyone holding one
 * can sign up as that guest.
 */
export const guestsCsv = (guests: AdminGuest[], all: AdminGuest[]) => {
  const names = new Map(all.map((guest) => [guest.guestId, `${guest.name} ${guest.surname}`]));
  const groups = new Map<number, AdminGuest[]>();
  all.forEach((guest) => groups.set(guest.groupId, [...(groups.get(guest.groupId) ?? []), guest]));

  const rows = guests.map((guest) => {
    const rsvp = guest.rsvp;
    const coming = rsvp?.attending ? rsvp : null;
    const location = coming?.accommodation ?? null;
    return [
      groupLabel(groups.get(guest.groupId) ?? [guest]),
      guest.name,
      guest.surname,
      ADMIN_STATUS_DISPLAY[adminStatus(guest)].label,
      coming ? DIETARY_LABELS[coming.dietary!] : null,
      coming?.dietaryOtherDetails ?? null,
      coming ? (coming.shuttle === null ? "Not sure" : coming.shuttle ? "Yes" : "No") : null,
      location && mapsLink(location),
      location?.lat ?? null,
      location?.lng ?? null,
      rsvp ? (names.get(rsvp.respondedBy) ?? null) : null,
      rsvp && spreadsheetDate(rsvp.respondedAt),
      guest.signedUpAt && spreadsheetDate(guest.signedUpAt),
      guest.email,
      guest.roles.map((role) => ROLE_LABELS[role]).join(", "),
    ];
  });
  // the byte order mark tells Excel it's UTF-8, so names like Zoë survive
  return `﻿${[COLUMNS, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
};
