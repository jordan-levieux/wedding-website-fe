import { Clipboard } from "@angular/cdk/clipboard";
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar } from "@angular/material/snack-bar";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import {
  AdminGuest,
  adminStatus,
  adminSummary,
  GUEST_FILTER_LABELS,
  GUEST_FILTERS,
  GuestFilter,
  groupGuests,
  inviteLink,
  matchesFilter,
  matchesSearch,
  missingDetails,
  ROLE_LABELS,
  toGuestFilter,
} from "../../models/admin";
import { DIETARY_OPTIONS } from "../../models/api";
import { mapsLink } from "../../models/coordinates";
import { DIETARY_LABELS } from "../../models/rsvp";
import { AdminService } from "../../services/adminService";
import { apiErrorMessage } from "../../services/authService";
import { StatusPill } from "../status-pill/status-pill";

@Component({
  selector: "app-guests-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./guests-page.scss",
  templateUrl: "./guests-page.html",
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    RouterLink,
    StatusPill,
  ],
})
export class GuestsPage {
  // query params, so a filtered view survives a reload and can be shared
  status = input<string>();
  q = input<string>();

  private adminService = inject(AdminService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private clipboard = inject(Clipboard);
  private snackBar = inject(MatSnackBar);

  protected readonly filters = GUEST_FILTERS;
  protected readonly filterLabels = GUEST_FILTER_LABELS;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly dietaryOptions = DIETARY_OPTIONS;
  protected readonly dietaryLabels = { ...DIETARY_LABELS, none: "None" };
  protected readonly adminStatus = adminStatus;
  protected readonly missingDetails = missingDetails;
  protected readonly mapsLink = mapsLink;

  protected guests = this.adminService.guests;
  protected canEdit = this.adminService.canEdit;
  protected filter = computed(() => toGuestFilter(this.status()));
  protected search = computed(() => this.q() ?? "");

  private all = computed(() => this.guests.value() ?? []);
  protected summary = computed(() => adminSummary(this.all()));
  protected filterCounts = computed(
    () =>
      Object.fromEntries(
        GUEST_FILTERS.map((filter) => [
          filter,
          this.all().filter((guest) => matchesFilter(guest, filter)).length,
        ]),
      ) as Record<GuestFilter, number>,
  );
  protected shown = computed(() =>
    this.all().filter(
      (guest) => matchesFilter(guest, this.filter()) && matchesSearch(guest, this.search()),
    ),
  );
  protected groups = computed(() => groupGuests(this.all(), this.shown()));
  protected errorMessage = computed(() =>
    apiErrorMessage(this.guests.error(), "We couldn't load the guest list"),
  );
  private names = computed(
    () => new Map(this.all().map((guest) => [guest.guestId, `${guest.name} ${guest.surname}`])),
  );

  constructor() {
    // refreshes on every visit; anything already loaded stays on screen meanwhile
    this.guests.reload();
  }

  protected answeredBySomeoneElse(guest: AdminGuest) {
    const respondedBy = guest.rsvp?.respondedBy;
    return respondedBy && respondedBy !== guest.guestId ? this.names().get(respondedBy) : null;
  }

  protected setFilter(filter: GuestFilter | undefined) {
    this.updateQuery({ status: !filter || filter === "all" ? null : filter });
  }

  protected setSearch(text: string) {
    this.updateQuery({ q: text.trim() ? text : null });
  }

  protected copyInvite(guest: AdminGuest) {
    if (!guest.signUpUuid) {
      return;
    }
    const copied = this.clipboard.copy(inviteLink(location.origin, guest.signUpUuid));
    this.snackBar.open(
      copied ? `Invite link for ${guest.name} copied` : "Couldn't copy the link",
      undefined,
      { duration: 3000 },
    );
  }

  private updateQuery(queryParams: Record<string, string | null>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }
}
