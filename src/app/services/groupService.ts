import { HttpClient } from "@angular/common/http";
import { computed, inject, Service, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import { Coordinates, Group, RsvpInput } from "../models/api";
import { rsvpAttention } from "../models/rsvp";

@Service()
export class GroupService {
  private http = inject(HttpClient);
  private groupInternal = signal<Group | null>(null);

  public group = this.groupInternal.asReadonly();
  public self = computed(() => {
    const group = this.group();
    return group?.guests.find((guest) => guest.guestId === group.selfId);
  });
  public hasResponded = computed(() => !!this.self()?.rsvp);
  public rsvpOpen = computed(() => {
    const group = this.group();
    return !!group && Date.now() <= Date.parse(group.rsvpDeadline);
  });
  public attention = computed(() => rsvpAttention(this.group()));
  public canSeeAdmin = computed(
    () => this.group()?.roles.some((role) => role === "admin" || role === "viewer") ?? false,
  );

  load = () =>
    firstValueFrom(this.http.get<Group>(`${environment.apiUrl}/group`)).then((group) => {
      this.groupInternal.set(group);
      return group;
    });

  setGroup = (group: Group) => this.groupInternal.set(group);

  clear = () => this.groupInternal.set(null);

  submitRsvps = (rsvps: RsvpInput[]) => this.put("rsvp", { rsvps });

  // null clears the group's place
  setGroupAccommodation = (accommodation: Coordinates | null) =>
    this.put("accommodation", { accommodation });

  // null puts the guest back with the rest of the group
  setOwnAccommodation = (guestId: number, accommodation: Coordinates | null) =>
    this.put(`accommodation/${guestId}`, { accommodation });

  private put = (path: string, body: unknown) =>
    firstValueFrom(this.http.put<Group>(`${environment.apiUrl}/${path}`, body)).then((group) => {
      this.groupInternal.set(group);
      return group;
    });
}
