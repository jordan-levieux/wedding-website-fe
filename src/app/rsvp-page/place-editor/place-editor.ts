import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { Coordinates } from "../../models/api";
import { mapsLink } from "../../models/coordinates";
import { GoogleMapsLoader } from "../../services/googleMapsLoader";
import { LocationPicker } from "../location-picker/location-picker";

const samePlace = (a: Coordinates | null, b: Coordinates | null) =>
  a?.lat === b?.lat && a?.lng === b?.lng;

// A saved place with a map to change it. The map only loads while changing it, since each load is billed.
@Component({
  selector: "app-place-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./place-editor.scss",
  templateUrl: "./place-editor.html",
  imports: [LocationPicker, MatButtonModule, MatIconModule],
})
export class PlaceEditor {
  place = input<Coordinates | null>(null);
  // opens straight onto the map, with a Cancel that hands back to the parent
  startEditing = input(false);
  saving = input(false);
  disabled = input(false);
  save = output<Coordinates | null>();
  cancelled = output<void>();

  protected readonly mapsLink = mapsLink;
  protected readonly mapsAvailable = inject(GoogleMapsLoader).available;

  // both reset whenever the saved place comes back changed
  protected draft = linkedSignal(() => this.place());
  protected editing = linkedSignal(() => this.startEditing() || !this.place());
  protected changed = computed(() => !samePlace(this.draft(), this.place()));
  protected canCancel = computed(() => this.startEditing() || !!this.place());

  protected cancel() {
    this.draft.set(this.place());
    this.editing.set(!this.place());
    this.cancelled.emit();
  }
}
