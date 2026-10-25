import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSnackBar } from "@angular/material/snack-bar";
import { GroupGuest, Rsvp, RsvpInput } from "../models/api";
import { mapsLink } from "../models/coordinates";
import { DIETARY_LABELS, draftFor, GuestStatus, guestStatus } from "../models/rsvp";
import { apiErrorMessage } from "../services/authService";
import { GroupService } from "../services/groupService";
import { RsvpForm } from "./rsvp-form/rsvp-form";

const STATUS_LABELS: Record<GuestStatus, { label: string; icon: string }> = {
  unanswered: { label: "Not replied", icon: "schedule" },
  incomplete: { label: "Details missing", icon: "error_outline" },
  complete: { label: "Replied", icon: "check_circle" },
};

@Component({
  selector: "app-rsvp-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./rsvp-page.scss",
  templateUrl: "./rsvp-page.html",
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressBarModule,
    RsvpForm,
  ],
})
export class RsvpPage {
  private groupService = inject(GroupService);
  private snackBar = inject(MatSnackBar);

  protected readonly mapsLink = mapsLink;
  protected readonly dietaryLabels = DIETARY_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected group = this.groupService.group;
  protected self = this.groupService.self;
  protected open = this.groupService.rsvpOpen;
  protected venueAccommodation = computed(
    () => this.group()?.roles.includes("venue_accommodation") ?? false,
  );
  protected progress = computed(() => {
    const guests = this.group()?.guests ?? [];
    const replied = guests.filter((guest) => guest.rsvp).length;
    return { replied, total: guests.length, percent: (100 * replied) / (guests.length || 1) };
  });
  protected selfDraft = computed(() => {
    const self = this.self();
    return self ? draftFor(self, self) : null;
  });
  protected others = computed(() =>
    (this.group()?.guests ?? [])
      .filter((guest) => guest.guestId !== this.self()?.guestId)
      .map((guest) => ({ guest, status: guestStatus(guest), ...draftFor(guest, this.self()) })),
  );
  // after each save the next person still to answer opens, so a family can go down the list
  protected nextUnansweredId = computed(
    () => this.others().find((other) => other.status === "unanswered")?.guest.guestId,
  );
  protected editingSelf = signal(false);
  protected savingGuestId = signal<number | null>(null);

  protected shuttleText(rsvp: Rsvp): string {
    if (rsvp.shuttle === null) {
      return "Not sure about the shuttle yet";
    }
    return rsvp.shuttle ? "Taking the shuttle" : "Not taking the shuttle";
  }

  protected answeredBy(guest: GroupGuest): string | null {
    const respondedBy = guest.rsvp?.respondedBy;
    if (respondedBy === undefined || respondedBy === guest.guestId) {
      return null;
    }
    if (respondedBy === this.self()?.guestId) {
      return "you";
    }
    return (
      this.group()?.guests.find((other) => other.guestId === respondedBy)?.name ?? "someone else"
    );
  }

  protected save(input: RsvpInput) {
    const isSelf = input.guestId === this.self()?.guestId;
    this.savingGuestId.set(input.guestId);
    this.groupService
      .submitRsvps([input])
      .then(() => {
        if (isSelf) {
          this.editingSelf.set(false);
        }
        this.snackBar.open(isSelf ? "Thanks, your RSVP is saved" : "Saved, thank you", undefined, {
          duration: 4000,
        });
      })
      .catch((error: unknown) =>
        this.snackBar.open(apiErrorMessage(error, "We couldn't save that, please try again"), "OK"),
      )
      .finally(() => this.savingGuestId.set(null));
  }
}
