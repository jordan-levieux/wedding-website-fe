import { TextFieldModule } from "@angular/cdk/text-field";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from "@angular/core";
import {
  FieldTree,
  disabled,
  form,
  FormField,
  required,
  submit,
  validate,
} from "@angular/forms/signals";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { Coordinates, DIETARY_OPTIONS, GroupGuest, RsvpInput } from "../../models/api";
import { mapsLink } from "../../models/coordinates";
import { DIETARY_LABELS, PrefilledField, RsvpDraft, toRsvpInput } from "../../models/rsvp";
import { GoogleMapsLoader } from "../../services/googleMapsLoader";
import { LocationPicker } from "../location-picker/location-picker";

export const MAX_DETAILS_LENGTH = 500;

@Component({
  selector: "app-rsvp-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./rsvp-form.scss",
  templateUrl: "./rsvp-form.html",
  imports: [
    FormField,
    LocationPicker,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TextFieldModule,
  ],
})
export class RsvpForm {
  guest = input.required<GroupGuest>();
  draft = input.required<RsvpDraft>();
  prefilled = input<PrefilledField[]>([]);
  isSelf = input(false);
  venueAccommodation = input(false);
  closed = input(false);
  saving = input(false);
  save = output<RsvpInput>();

  protected readonly dietaryOptions = DIETARY_OPTIONS.map((value) => ({
    value,
    label: DIETARY_LABELS[value],
  }));
  protected readonly maxDetailsLength = MAX_DETAILS_LENGTH;
  protected readonly mapsLink = mapsLink;
  protected readonly mapsAvailable = inject(GoogleMapsLoader).available;

  // resets to the saved answer whenever the group is reloaded
  protected model = linkedSignal<RsvpDraft>(() => ({ ...this.draft() }));
  protected rsvpForm = form(this.model, (path) => {
    disabled(path, () => this.closed());
    required(path.attending, { message: "Please let us know either way" });
    required(path.dietary, {
      when: ({ valueOf }) => valueOf(path.attending) === "yes",
      message: "Please choose one (or no dietary requirements)",
    });
    validate(path.dietaryOtherDetails, ({ value, valueOf }) => {
      if (valueOf(path.attending) !== "yes" || valueOf(path.dietary) !== "other") {
        return undefined;
      }
      if (!value().trim()) {
        return { kind: "required", message: "Please tell us what we should know" };
      }
      return value().length > MAX_DETAILS_LENGTH
        ? { kind: "maxLength", message: `Please keep it under ${MAX_DETAILS_LENGTH} characters` }
        : undefined;
    });
  });

  protected id = computed(() => `rsvp-${this.guest().guestId}`);
  protected attending = computed(() => this.model().attending === "yes");
  protected location = computed(() => this.model().accommodation);

  protected errorOf<T>(field: FieldTree<T>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }

  protected onLocationPicked(coordinates: Coordinates | null) {
    this.model.update((draft) => ({ ...draft, accommodation: coordinates }));
  }

  protected onSubmit(event: Event) {
    event.preventDefault();
    submit(this.rsvpForm, async () => {
      this.save.emit(toRsvpInput(this.guest().guestId, this.model()));
      return undefined;
    });
  }
}
