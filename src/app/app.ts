import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { MatBadgeModule } from "@angular/material/badge";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTabsModule } from "@angular/material/tabs";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { map } from "rxjs";
import { AuthService } from "./services/authService";
import { GroupService } from "./services/groupService";

type Tab = {
  title: string;
  route: string;
};

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./app.scss",
  templateUrl: "./app.html",
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
  ],
})
export class App {
  private authService = inject(AuthService);
  private groupService = inject(GroupService);
  private router = inject(Router);

  protected userToken = this.authService.accessToken;
  protected signOutLabel = computed(() => {
    const name = this.groupService.self()?.name;
    return name ? `Sign out (signed in as ${name})` : "Sign out";
  });
  protected isHandset = toSignal(
    inject(BreakpointObserver)
      .observe(Breakpoints.XSmall)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected tabs = computed<Tab[]>(() => [
    {
      title: "Home",
      route: "/home",
    },
    {
      title: "RSVP",
      route: "/rsvp",
    },
    ...(this.groupService.canSeeAdmin() ? [{ title: "Admin", route: "/admin" }] : []),
  ]);

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

  protected signOut() {
    this.authService.logout();
    this.router.navigate(["/login"]);
  }
}
