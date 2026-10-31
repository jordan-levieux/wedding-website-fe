import { DatePipe } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  signal,
  untracked,
} from "@angular/core";
import { apply, disabled, form, submit } from "@angular/forms/signals";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar } from "@angular/material/snack-bar";
import { RouterLink } from "@angular/router";
import {
  adminStatus,
  groupGuests,
  groupLabel,
  guestTimeline,
  GuestUpdate,
  nextGroupId,
  ROLE_LABELS,
} from "../../models/admin";
import { GroupGuest, RsvpInput } from "../../models/api";
import { mapsLink } from "../../models/coordinates";
import { DIETARY_LABELS, draftFor } from "../../models/rsvp";
import { AdminService } from "../../services/adminService";
import { apiErrorMessage } from "../../services/authService";
import { loader } from "../../services/loader";
import { RsvpForm } from "../../rsvp-page/rsvp-form/rsvp-form";
import {
  draftRoles,
  guestDraftSchema,
  GuestFields,
  NEW_GROUP,
  toGuestDraft,
} from "../guest-fields/guest-fields";
import { InviteLink } from "../invite-link/invite-link";
import { StatusPill } from "../status-pill/status-pill";

const sameDraft = <T>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

@Component({
  selector: "app-guest-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./guest-page.scss",
  templateUrl: "./guest-page.html",
  imports: [
    DatePipe,
    GuestFields,
    InviteLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
    RsvpForm,
    StatusPill,
  ],
})
export class GuestPage {
  guestId = input.required({ transform: numberAttribute });

  private adminService = inject(AdminService);
  private snackBar = inject(MatSnackBar);

  protected readonly roleLabels = ROLE_LABELS;
  protected readonly dietaryLabels = DIETARY_LABELS;
  protected readonly mapsLink = mapsLink;
  protected readonly adminStatus = adminStatus;

  protected guests = this.adminService.guests;
  protected canEdit = this.adminService.canEdit;
  private all = computed(() => this.guests.value() ?? []);
  protected guest = computed(() => this.all().find((guest) => guest.guestId === this.guestId()));
  protected groups = computed(() => groupGuests(this.all(), this.all()));
  protected groupMates = computed(() =>
    this.all().filter(
      (other) => other.groupId === this.guest()?.groupId && other.guestId !== this.guestId(),
    ),
  );
  private names = computed(
    () => new Map(this.all().map((guest) => [guest.guestId, `${guest.name} ${guest.surname}`])),
  );
  protected nameOf = (guestId: number | null) =>
    guestId === null ? null : (this.names().get(guestId) ?? "someone no longer listed");
  protected isSelf = computed(() => this.guestId() === this.adminService.selfId());
  protected busy = signal(false);
  // the account actions are confirmed inline, rather than in a dialog
  protected confirming = signal<"unlink" | "regenerate" | null>(null);

  protected history = loader(() => this.adminService.history(this.guestId()));
  protected timeline = computed(() => {
    const history = this.history.value();
    const others = this.all().filter((guest) => guest.guestId !== this.guestId());
    return history
      ? guestTimeline(history, this.nameOf, (groupId) => {
          const members = others.filter((guest) => guest.groupId === groupId);
          return members.length ? `With ${groupLabel(members)}` : "A group of their own";
        })
      : [];
  });
  protected historyError = computed(() =>
    apiErrorMessage(this.history.error(), "We couldn't load the history"),
  );

  // only resets the form when the saved details actually change, not on every list refresh
  private savedDraft = computed(() => toGuestDraft(this.guest()), { equal: sameDraft });
  protected detailsModel = linkedSignal(() => this.savedDraft());
  protected detailsForm = form(this.detailsModel, (path) => {
    apply(path, guestDraftSchema);
    disabled(path.roles.admin, () => this.isSelf() && this.savedDraft().roles.admin);
  });
  protected detailsChanged = computed(() => !sameDraft(this.detailsModel(), this.savedDraft()));

  protected editingRsvp = signal(false);
  protected savingRsvp = signal(false);
  protected rsvpGuest = computed<GroupGuest | undefined>(() => {
    const guest = this.guest();
    return (
      guest && {
        guestId: guest.guestId,
        name: guest.name,
        surname: guest.surname,
        rsvp: guest.rsvp,
      }
    );
  });
  protected rsvpDraft = computed(() => {
    const guest = this.rsvpGuest();
    return guest && draftFor(guest, undefined).draft;
  });
  protected venueAccommodation = computed(
    () => this.guest()?.roles.includes("venue_accommodation") ?? false,
  );

  constructor() {
    this.guests.reload();
    effect(() => {
      this.guestId();
      untracked(() => {
        this.editingRsvp.set(false);
        this.confirming.set(null);
        this.history.reset();
        this.history.reload();
      });
    });
  }

  protected saveDetails(event: Event) {
    event.preventDefault();
    submit(this.detailsForm, async () => {
      const draft = this.detailsModel();
      const saved = this.savedDraft();
      const update: GuestUpdate = {};
      if (draft.name.trim() !== saved.name) {
        update.name = draft.name.trim();
      }
      if (draft.surname.trim() !== saved.surname) {
        update.surname = draft.surname.trim();
      }
      if (draft.groupId !== saved.groupId) {
        update.groupId =
          draft.groupId === NEW_GROUP ? nextGroupId(this.all()) : Number(draft.groupId);
      }
      if (!sameDraft(draft.roles, saved.roles)) {
        update.roles = draftRoles(draft);
      }
      if (Object.keys(update).length) {
        await this.update(update, "Details saved");
      }
      return undefined;
    });
  }

  protected resetDetails() {
    this.detailsModel.set(this.savedDraft());
  }

  protected saveRsvp(rsvp: RsvpInput) {
    this.savingRsvp.set(true);
    this.adminService
      .submitRsvps([rsvp])
      .then(() => {
        this.editingRsvp.set(false);
        this.snackBar.open("RSVP saved", undefined, { duration: 3000 });
        this.history.reload();
      })
      .catch((error: unknown) =>
        this.snackBar.open(apiErrorMessage(error, "We couldn't save the RSVP"), "OK"),
      )
      .finally(() => this.savingRsvp.set(false));
  }

  protected unlinkGoogle() {
    return this.update({ unlinkGoogleAccount: true }, "Google account unlinked");
  }

  protected regenerateInvite() {
    return this.update({ regenerateInvite: true }, "New invite link ready");
  }

  private async update(update: GuestUpdate, done: string) {
    this.busy.set(true);
    try {
      await this.adminService.updateGuest(this.guestId(), update);
      this.confirming.set(null);
      this.snackBar.open(done, undefined, { duration: 3000 });
      this.history.reload();
    } catch (error) {
      this.snackBar.open(apiErrorMessage(error, "We couldn't save that, please try again"), "OK");
    } finally {
      this.busy.set(false);
    }
  }
}
