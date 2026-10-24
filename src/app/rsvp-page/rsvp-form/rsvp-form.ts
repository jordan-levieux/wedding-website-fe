import { Component, computed, input, linkedSignal, output } from "@angular/core";
import {
  disabled,
  FieldTree,
  form,
  FormField,
  required,
  submit,
  validate,
} from "@angular/forms/signals";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatRadioModule } from "@angular/material/radio";
import { MatSelectModule } from "@angular/material/select";
import { DIETARY_OPTIONS, GroupGuest, RsvpInput } from "../../models/api";
import { mapsLink, parseCoordinates } from "../../models/coordinates";
import { DIETARY_LABELS, PrefilledField, RsvpDraft, toRsvpInput } from "../../models/rsvp";

export const MAX_DETAILS_LENGTH = 500;

@Component({
  selector: "app-rsvp-form",
  styleUrl: "./rsvp-form.scss",
  templateUrl: "./rsvp-form.html",
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
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
    validate(path.accommodation, ({ value, valueOf }) =>
      valueOf(path.attending) === "yes" && value().trim() && !parseCoordinates(value())
        ? {
            kind: "coordinates",
            message:
              "We couldn't find a location in that. Paste coordinates like -33.92, 18.42 or a full Google Maps link.",
          }
        : undefined,
    );
  });

  protected attending = computed(() => this.model().attending === "yes");
  protected location = computed(() => parseCoordinates(this.model().accommodation));
  protected you = computed(() => (this.isSelf() ? "you" : this.guest().name));

  protected errorOf<T>(field: FieldTree<T>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }

  protected onSubmit(event: Event) {
    event.preventDefault();
    submit(this.rsvpForm, async () => {
      this.save.emit(toRsvpInput(this.guest().guestId, this.model()));
      return undefined;
    });
  }
}
