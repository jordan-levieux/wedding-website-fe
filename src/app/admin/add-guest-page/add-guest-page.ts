import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from "@angular/core";
import { apply, form, submit } from "@angular/forms/signals";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router, RouterLink } from "@angular/router";
import { groupGuests } from "../../models/admin";
import { AdminService } from "../../services/adminService";
import { apiErrorMessage } from "../../services/authService";
import {
  draftRoles,
  GuestDraft,
  guestDraftSchema,
  GuestFields,
  NEW_GROUP,
  toGuestDraft,
} from "../guest-fields/guest-fields";

@Component({
  selector: "app-add-guest-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./add-guest-page.scss",
  templateUrl: "./add-guest-page.html",
  imports: [
    GuestFields,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
})
export class AddGuestPage {
  // query param, so a group's "add" button can preselect it
  group = input<string>();

  private adminService = inject(AdminService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  protected guests = this.adminService.guests;
  protected groups = computed(() => {
    const guests = this.guests.value() ?? [];
    return groupGuests(guests, guests);
  });
  protected model = linkedSignal<GuestDraft>(() => ({
    ...toGuestDraft(),
    groupId: this.group() ?? NEW_GROUP,
  }));
  protected guestForm = form(this.model, (path) => apply(path, guestDraftSchema));
  protected saving = signal(false);
  protected error = signal<string | null>(null);

  constructor() {
    if (!this.guests.hasValue()) {
      this.guests.reload();
    }
  }

  protected onSubmit(event: Event) {
    event.preventDefault();
    submit(this.guestForm, async () => {
      const draft = this.model();
      this.saving.set(true);
      this.error.set(null);
      try {
        const guest = await this.adminService.createGuest({
          groupId: draft.groupId === NEW_GROUP ? null : Number(draft.groupId),
          name: draft.name.trim(),
          surname: draft.surname.trim(),
          roles: draftRoles(draft),
        });
        this.snackBar.open(`${guest.name} is on the list`, undefined, { duration: 3000 });
        this.router.navigate(["/admin/guests", guest.guestId], { replaceUrl: true });
      } catch (error) {
        this.error.set(apiErrorMessage(error, "We couldn't add the guest, please try again"));
      } finally {
        this.saving.set(false);
      }
      return undefined;
    });
  }
}
