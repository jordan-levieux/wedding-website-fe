import { HttpClient } from "@angular/common/http";
import { computed, inject, Service } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import {
  AccommodationChange,
  AdminGuest,
  GuestHistory,
  GuestUpdate,
  NewGuest,
  RsvpChange,
} from "../models/admin";
import { Coordinates, RsvpInput } from "../models/api";
import { GroupService } from "./groupService";
import { loader } from "./loader";

const api = `${environment.apiUrl}/admin`;

@Service()
export class AdminService {
  private http = inject(HttpClient);
  private groupService = inject(GroupService);

  public guests = loader(() => firstValueFrom(this.http.get<AdminGuest[]>(`${api}/guests`)));
  public changes = loader(() => firstValueFrom(this.http.get<RsvpChange[]>(`${api}/rsvp-changes`)));
  public accommodationChanges = loader(() =>
    firstValueFrom(this.http.get<AccommodationChange[]>(`${api}/accommodation-changes`)),
  );
  // viewers see everything read-only; the API enforces it, this only hides the controls
  public canEdit = computed(() => this.groupService.group()?.roles.includes("admin") ?? false);
  public selfId = computed(() => this.groupService.group()?.selfId);

  history = (guestId: number) =>
    firstValueFrom(this.http.get<GuestHistory>(`${api}/guests/${guestId}/history`));

  createGuest = (guest: NewGuest) =>
    firstValueFrom(this.http.post<AdminGuest>(`${api}/guests`, guest)).then((created) => {
      this.guests.set([...(this.guests.value() ?? []), created]);
      this.refreshOwnGroup();
      return created;
    });

  updateGuest = (guestId: number, update: GuestUpdate) =>
    firstValueFrom(this.http.patch<AdminGuest>(`${api}/guests/${guestId}`, update)).then(
      (updated) => {
        this.guests.set(
          (this.guests.value() ?? []).map((guest) => (guest.guestId === guestId ? updated : guest)),
        );
        this.refreshOwnGroup();
        return updated;
      },
    );

  submitRsvps = (rsvps: RsvpInput[]) => this.putGuests("rsvps", { rsvps });

  // null clears the group's place
  setGroupAccommodation = (groupId: number, accommodation: Coordinates | null) =>
    this.putGuests(`groups/${groupId}/accommodation`, { accommodation });

  // null puts the guest back with the rest of their group
  setOwnAccommodation = (guestId: number, accommodation: Coordinates | null) =>
    this.putGuests(`guests/${guestId}/accommodation`, { accommodation });

  private putGuests = (path: string, body: unknown) =>
    firstValueFrom(this.http.put<AdminGuest[]>(`${api}/${path}`, body)).then((guests) => {
      this.guests.set(guests);
      this.refreshOwnGroup();
      return guests;
    });

  // the change may have been to the admin's own group, which drives the RSVP page and its badge
  private refreshOwnGroup() {
    this.groupService.load().catch(() => undefined);
  }
}
