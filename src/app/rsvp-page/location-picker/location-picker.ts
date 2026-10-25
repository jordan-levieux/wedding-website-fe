import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  model,
  signal,
  viewChild,
} from "@angular/core";
import { GoogleMap, MapAdvancedMarker } from "@angular/google-maps";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { environment } from "../../../environments/environment";
import { Coordinates } from "../../models/api";
import { GoogleMapsLoader } from "../../services/googleMapsLoader";

// ~10cm precision is plenty, and keeps the stored values readable
const round = (value: number) => Math.round(value * 1e6) / 1e6;

@Component({
  selector: "app-location-picker",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./location-picker.scss",
  templateUrl: "./location-picker.html",
  imports: [GoogleMap, MapAdvancedMarker, MatProgressSpinnerModule],
})
export class LocationPicker {
  value = model<Coordinates | null>(null);

  private loader = inject(GoogleMapsLoader);
  private searchHost = viewChild.required<ElementRef<HTMLElement>>("search");

  protected status = signal<"loading" | "ready" | "error">("loading");
  protected center = signal<google.maps.LatLngLiteral>(environment.mapDefaultCenter);
  // wide enough around the (rural) venue to show the nearby towns guests are likely staying in
  protected zoom = signal(11);
  protected options = computed<google.maps.MapOptions>(() => ({
    mapId: environment.googleMapsMapId,
    disableDefaultUI: true,
    zoomControl: true,
    fullscreenControl: true,
    // one finger scrolls the page on phones, two move the map
    gestureHandling: "cooperative",
  }));

  constructor() {
    afterNextRender(() => {
      const value = this.value();
      if (value) {
        this.center.set(value);
        this.zoom.set(16);
      }
      this.initialise();
    });
  }

  protected onMapClick(event: google.maps.MapMouseEvent | google.maps.IconMouseEvent) {
    // tapping a named place (a hotel, say) pins it instead of opening Google's info window
    if ("placeId" in event && event.placeId) {
      event.stop();
    }
    this.pick(event.latLng);
  }

  // Google rejected the key (wrong site, API not enabled, billing): show our message, not Google's error box
  protected onAuthFailure() {
    console.error("Google Maps rejected the API key for this site");
    this.searchHost().nativeElement.replaceChildren();
    this.status.set("error");
  }

  protected onMarkerDragEnd(event: google.maps.MapMouseEvent) {
    this.pick(event.latLng);
  }

  private async initialise() {
    try {
      await this.loader.load();
      const { PlaceAutocompleteElement } = (await google.maps.importLibrary(
        "places",
      )) as google.maps.PlacesLibrary;
      const search = new PlaceAutocompleteElement({
        locationBias: this.center(),
        placeholder: "Search for a place",
      } as google.maps.places.PlaceAutocompleteElementOptions);
      search.addEventListener("gmp-select", (event) => this.onPlaceSelected(event));
      this.searchHost().nativeElement.replaceChildren(search);
      this.status.set("ready");
    } catch (error) {
      console.error("couldn't load Google Maps:", error);
      this.status.set("error");
    }
  }

  private async onPlaceSelected(event: google.maps.places.PlacePredictionSelectEvent) {
    const place = event.placePrediction.toPlace();
    await place.fetchFields({ fields: ["location"] });
    if (place.location) {
      this.pick(place.location);
      this.center.set(place.location.toJSON());
      this.zoom.set(16);
    }
  }

  private pick(latLng: google.maps.LatLng | null | undefined) {
    if (latLng) {
      this.value.set({ lat: round(latLng.lat()), lng: round(latLng.lng()) });
    }
  }
}
