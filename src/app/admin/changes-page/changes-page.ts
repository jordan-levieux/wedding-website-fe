import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { changeLog } from "../../models/admin";
import { AdminService } from "../../services/adminService";
import { apiErrorMessage } from "../../services/authService";

const CHANGE_FILTERS = {
  changes: "Changes only",
  attendance: "Attendance changed",
  others: "Changed by someone else",
} as const;
type ChangeFilter = keyof typeof CHANGE_FILTERS;

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
  changes = input<string>();
  attendance = input<string>();
  others = input<string>();

  private adminService = inject(AdminService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected readonly filterOptions = Object.entries(CHANGE_FILTERS) as [ChangeFilter, string][];

  private rsvpChanges = this.adminService.changes;
  private placeChanges = this.adminService.accommodationChanges;
  private guests = this.adminService.guests;
  protected loaded = computed(() => this.rsvpChanges.hasValue() && this.placeChanges.hasValue());
  protected error = computed(() => this.rsvpChanges.error() ?? this.placeChanges.error());
  protected filters = computed(() =>
    (["changes", "attendance", "others"] as const).filter((filter) => this[filter]() === "true"),
  );
  private all = computed(() =>
    changeLog(
      this.rsvpChanges.value() ?? [],
      this.placeChanges.value() ?? [],
      this.guests.value() ?? [],
    ),
  );
  protected shown = computed(() => {
    const filters = this.filters();
    return this.all().filter(
      (entry) =>
        (!filters.includes("changes") || !entry.first) &&
        (!filters.includes("attendance") || (!entry.first && entry.attendance)) &&
        (!filters.includes("others") || (!entry.first && entry.changedBy !== entry.previousBy)),
    );
  });
  protected errorMessage = computed(() =>
    apiErrorMessage(this.error(), "We couldn't load the changes"),
  );

  constructor() {
    this.reload();
    // names the groups whose place changed
    this.guests.reload();
  }

  protected reload() {
    this.rsvpChanges.reload();
    this.placeChanges.reload();
  }

  protected setFilters(filters: ChangeFilter[]) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        changes: filters.includes("changes") ? "true" : null,
        attendance: filters.includes("attendance") ? "true" : null,
        others: filters.includes("others") ? "true" : null,
      },
      replaceUrl: true,
    });
  }
}
