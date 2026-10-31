import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
  viewChildren,
} from "@angular/core";
import { GoogleMap, MapAdvancedMarker, MapInfoWindow } from "@angular/google-maps";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { RouterLink } from "@angular/router";
import { environment } from "../../../environments/environment";
import { adminSummary } from "../../models/admin";
import { mapsLink } from "../../models/coordinates";
import { GuestPlace, guestPlaces, unpinnedGuests } from "../../models/guest-map";
import { AdminService } from "../../services/adminService";
import { apiErrorMessage } from "../../services/authService";
import { GoogleMapsLoader } from "../../services/googleMapsLoader";

const venue = environment.mapDefaultCenter;

// Google moves marker content into its own DOM, out of reach of the component's styles
const pin = (text: string, background: string, color: string) => {
  const element = document.createElement("span");
  element.textContent = text;
  element.style.cssText = `
    align-items: center; background: var(${background}); border: 2px solid var(--mat-sys-surface);
    border-radius: 999px; box-shadow: var(--mat-sys-level2); box-sizing: border-box; color: var(${color}); display: flex;
    font: var(--mat-sys-label-large); justify-content: center; min-height: 32px; min-width: 32px;
    padding-inline: 0.5rem;`;
  return element;
};

export const formatDistance = (km: number) =>
  km < 1 ? "Under 1 km" : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;

@Component({
  selector: "app-map-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./map-page.scss",
  templateUrl: "./map-page.html",
  imports: [
    GoogleMap,
    MapAdvancedMarker,
    MapInfoWindow,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
})
export class MapPage {
  private adminService = inject(AdminService);
  private mapsLoader = inject(GoogleMapsLoader);
  private map = viewChild(GoogleMap);
  private infoWindow = viewChild(MapInfoWindow);
  private markers = viewChildren("placeMarker", { read: MapAdvancedMarker });
  private mapArea = viewChild<ElementRef<HTMLElement>>("mapArea");

  protected readonly venue = venue;
  protected readonly mapsLink = mapsLink;
  protected readonly formatDistance = formatDistance;
  protected readonly mapsAvailable = this.mapsLoader.available;

  protected guests = this.adminService.guests;
  private all = computed(() => this.guests.value() ?? []);
  protected attending = computed(() => adminSummary(this.all()).attending);
  protected places = computed(() => guestPlaces(this.all(), venue));
  protected pinned = computed(() =>
    this.places().reduce((count, place) => count + place.guests.length, 0),
  );
  protected unpinned = computed(() => unpinnedGuests(this.all()));
  protected errorMessage = computed(() =>
    apiErrorMessage(this.guests.error(), "We couldn't load the guest list"),
  );

  protected mapStatus = signal<"loading" | "ready" | "error">("loading");
  protected selectedKey = signal<string | null>(null);
  protected selected = computed(() =>
    this.places().find((place) => place.key === this.selectedKey()),
  );
  protected pins = computed(
    () =>
      new Map(
        this.places().map((place) => [
          place.key,
          pin(String(place.guests.length), "--mat-sys-primary", "--mat-sys-on-primary"),
        ]),
      ),
  );
  protected venuePin = computed(() => pin("Venue", "--mat-sys-tertiary", "--mat-sys-on-tertiary"));
  protected readonly mapOptions: google.maps.MapOptions = {
    mapId: environment.googleMapsMapId,
    disableDefaultUI: true,
    zoomControl: true,
    fullscreenControl: true,
    gestureHandling: "cooperative",
  };

  constructor() {
    this.guests.reload();
    if (this.mapsAvailable) {
      this.mapsLoader.load().then(
        () => this.mapStatus.set("ready"),
        (error) => {
          console.error("couldn't load Google Maps:", error);
          this.mapStatus.set("error");
        },
      );
    }
  }

  protected placeTitle(place: GuestPlace) {
    return place.guests.map((guest) => `${guest.name} ${guest.surname}`).join(", ");
  }

  protected onShuttle(place: GuestPlace) {
    return place.guests.filter((guest) => guest.rsvp?.shuttle).length;
  }

  // everyone's pin and the venue in view
  protected fitAll() {
    const places = this.places();
    if (!places.length) {
      return;
    }
    const lats = [venue.lat, ...places.map((place) => place.position.lat)];
    const lngs = [venue.lng, ...places.map((place) => place.position.lng)];
    this.map()?.fitBounds(
      {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      },
      48,
    );
  }

  protected show(place: GuestPlace) {
    const marker = this.markers()[this.places().indexOf(place)];
    if (!marker) {
      return;
    }
    this.selectedKey.set(place.key);
    this.infoWindow()?.open(marker);
    this.mapArea()?.nativeElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  protected onAuthFailure() {
    console.error("Google Maps rejected the API key for this site");
    this.mapStatus.set("error");
  }
}
