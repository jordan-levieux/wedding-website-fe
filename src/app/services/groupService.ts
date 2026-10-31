import { HttpClient } from "@angular/common/http";
import { computed, inject, Service, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import { Group, RsvpInput } from "../models/api";
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

  submitRsvps = (rsvps: RsvpInput[]) =>
    firstValueFrom(this.http.put<Group>(`${environment.apiUrl}/rsvp`, { rsvps })).then((group) => {
      this.groupInternal.set(group);
      return group;
    });
}
