import { DatePipe } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatSnackBar } from "@angular/material/snack-bar";
import { GroupGuest, Rsvp, RsvpInput } from "../models/api";
import { mapsLink } from "../models/coordinates";
import { DIETARY_LABELS, draftFor, guestStatus } from "../models/rsvp";
import { apiErrorMessage } from "../services/authService";
import { GroupService } from "../services/groupService";
import { RsvpForm } from "./rsvp-form/rsvp-form";

@Component({
  selector: "app-rsvp-page",
  styleUrl: "./rsvp-page.scss",
  templateUrl: "./rsvp-page.html",
  imports: [DatePipe, MatButtonModule, MatExpansionModule, RsvpForm],
})
export class RsvpPage {
  private groupService = inject(GroupService);
  private snackBar = inject(MatSnackBar);

  protected readonly mapsLink = mapsLink;
  protected group = this.groupService.group;
  protected self = this.groupService.self;
  protected open = this.groupService.rsvpOpen;
  protected venueAccommodation = computed(
    () => this.group()?.roles.includes("venue_accommodation") ?? false,
  );
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

  protected describe(rsvp: Rsvp): string {
    if (!rsvp.attending) {
      return "Not coming";
    }
    const shuttle =
      rsvp.shuttle === null
        ? "shuttle: not sure yet"
        : rsvp.shuttle
          ? "on the shuttle"
          : "no shuttle";
    return ["Coming", DIETARY_LABELS[rsvp.dietary!], shuttle].join(" · ");
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
