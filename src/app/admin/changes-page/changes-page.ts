import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { changedFieldLabels, RsvpChange } from "../../models/admin";
import { AdminService } from "../../services/adminService";
import { apiErrorMessage } from "../../services/authService";

const CHANGE_FILTERS = {
  attendance: "Attendance changed",
  others: "Changed by someone else",
} as const;
type ChangeFilter = keyof typeof CHANGE_FILTERS;

export const changedBySomeoneElse = (change: RsvpChange) =>
  change.changedBy !== change.previousAnswerBy;

@Component({
  selector: "app-changes-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./changes-page.scss",
  templateUrl: "./changes-page.html",
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
})
export class ChangesPage {
  // query params, like the guest list's filters
  attendance = input<string>();
  others = input<string>();

  private adminService = inject(AdminService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected readonly filterOptions = Object.entries(CHANGE_FILTERS) as [ChangeFilter, string][];
  protected readonly changedFieldLabels = changedFieldLabels;
  protected readonly changedBySomeoneElse = changedBySomeoneElse;

  protected changes = this.adminService.changes;
  protected filters = computed(() =>
    (["attendance", "others"] as const).filter((filter) => this[filter]() === "true"),
  );
  private all = computed(() => [...(this.changes.value() ?? [])].reverse());
  protected shown = computed(() => {
    const filters = this.filters();
    return this.all().filter(
      (change) =>
        (!filters.includes("attendance") || change.wasAttending !== change.nowAttending) &&
        (!filters.includes("others") || changedBySomeoneElse(change)),
    );
  });
  protected errorMessage = computed(() =>
    apiErrorMessage(this.changes.error(), "We couldn't load the changes"),
  );

  constructor() {
    this.changes.reload();
  }

  protected setFilters(filters: ChangeFilter[]) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        attendance: filters.includes("attendance") ? "true" : null,
        others: filters.includes("others") ? "true" : null,
      },
      replaceUrl: true,
    });
  }
}
