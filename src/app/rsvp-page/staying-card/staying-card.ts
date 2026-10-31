import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Coordinates, Group } from "../../models/api";
import { mapsLink } from "../../models/coordinates";
import { apiErrorMessage } from "../../services/authService";
import { GroupService } from "../../services/groupService";
import { PlaceEditor } from "../place-editor/place-editor";

// Where the group is staying, with a place of their own for anyone staying somewhere else.
@Component({
  selector: "app-staying-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./staying-card.scss",
  templateUrl: "./staying-card.html",
  imports: [MatButtonModule, MatCardModule, MatIconModule, PlaceEditor],
})
export class StayingCard {
  group = input.required<Group>();
  venueAccommodation = input(false);

  private groupService = inject(GroupService);
  private snackBar = inject(MatSnackBar);

  protected readonly mapsLink = mapsLink;
  // everyone who hasn't said they can't come
  protected members = computed(() =>
    this.group().guests.filter((guest) => guest.rsvp?.attending !== false),
  );
  protected isGroup = computed(() => this.members().length > 1);
  protected editingId = signal<number | null>(null);
  protected saving = signal<"group" | number | null>(null);

  protected saveGroup(place: Coordinates | null) {
    this.run(
      "group",
      () => this.groupService.setGroupAccommodation(place),
      place ? "Location saved" : "Location removed",
    );
  }

  protected saveOwn(guestId: number, place: Coordinates | null) {
    this.run(
      guestId,
      () => this.groupService.setOwnAccommodation(guestId, place),
      place ? "Location saved" : "Back with the group",
    ).then((saved) => saved && this.editingId.set(null));
  }

  private run(target: "group" | number, request: () => Promise<unknown>, done: string) {
    this.saving.set(target);
    return request()
      .then(() => {
        this.snackBar.open(done, undefined, { duration: 3000 });
        return true;
      })
      .catch((error: unknown) => {
        this.snackBar.open(apiErrorMessage(error, "We couldn't save that, please try again"), "OK");
        return false;
      })
      .finally(() => this.saving.set(null));
  }
}
