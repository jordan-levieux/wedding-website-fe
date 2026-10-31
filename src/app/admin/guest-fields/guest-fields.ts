import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { FieldTree, FormField, maxLength, schema, validate } from "@angular/forms/signals";
import { MatCheckbox } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { AdminGuest, GuestGroup, ROLE_LABELS, ROLES } from "../../models/admin";
import { Role } from "../../models/api";

const MAX_NAME_LENGTH = 100;

// a native select, so the group is the id as a string
export const NEW_GROUP = "new";

export type GuestDraft = {
  name: string;
  surname: string;
  groupId: string;
  roles: Record<Role, boolean>;
};

export const toGuestDraft = (guest?: AdminGuest): GuestDraft => ({
  name: guest?.name ?? "",
  surname: guest?.surname ?? "",
  groupId: guest ? String(guest.groupId) : NEW_GROUP,
  roles: Object.fromEntries(ROLES.map((role) => [role, !!guest?.roles.includes(role)])) as Record<
    Role,
    boolean
  >,
});

export const draftRoles = (draft: GuestDraft) => ROLES.filter((role) => draft.roles[role]);

export const guestDraftSchema = schema<GuestDraft>((path) => {
  for (const field of [path.name, path.surname]) {
    validate(field, ({ value }) =>
      value().trim() ? undefined : { kind: "required", message: "Required" },
    );
    maxLength(field, MAX_NAME_LENGTH, {
      message: `Please keep it under ${MAX_NAME_LENGTH} characters`,
    });
  }
});

const ROLE_HINTS: Record<Role, string> = {
  admin: "Can see and change everything in Admin",
  viewer: "Can see everything in Admin, but not change it",
  venue_accommodation: "Asked to book a room at the venue",
};

@Component({
  selector: "app-guest-fields",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./guest-fields.scss",
  templateUrl: "./guest-fields.html",
  imports: [FormField, MatCheckbox, MatFormFieldModule, MatInputModule],
})
export class GuestFields {
  fields = input.required<FieldTree<GuestDraft>>();
  groups = input.required<GuestGroup[]>();

  protected readonly newGroup = NEW_GROUP;
  protected readonly roles = ROLES;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly roleHints = ROLE_HINTS;

  protected errorOf<T>(field: FieldTree<T>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }
}
