import { Component, computed, inject } from "@angular/core";
import { MatBadgeModule } from "@angular/material/badge";
import { MatTabsModule } from "@angular/material/tabs";
import { MatTooltipModule } from "@angular/material/tooltip";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "./services/authService";
import { GroupService } from "./services/groupService";

type Tab = {
  title: string;
  route: string;
};

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

@Component({
  selector: "app-root",
  styleUrl: "./app.scss",
  templateUrl: "./app.html",
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatTabsModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
})
export class App {
  private authService = inject(AuthService);
  private groupService = inject(GroupService);

  protected userToken = this.authService.accessToken;
  protected readonly tabs: Tab[] = [
    {
      title: "Home",
      route: "/home",
    },
    {
      title: "RSVP",
      route: "/rsvp",
    },
  ];

  // red for people who haven't answered at all, a softer reminder for missing shuttle/accommodation answers
  protected rsvpBadge = computed(() => {
    const { unanswered, incomplete } = this.groupService.attention();
    if (!this.groupService.rsvpOpen() || unanswered + incomplete === 0) {
      return null;
    }
    const reasons = [
      unanswered &&
        `${unanswered} ${plural(unanswered, "person hasn't", "people haven't")} RSVPed yet`,
      incomplete &&
        `${incomplete} ${plural(incomplete, "RSVP is", "RSVPs are")} missing shuttle or accommodation details`,
    ].filter(Boolean);
    return {
      count: unanswered + incomplete,
      kind: unanswered ? "urgent" : "reminder",
      tooltip: reasons.join(" · "),
    };
  });
}
