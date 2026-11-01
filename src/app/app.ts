import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
} from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { MatBadgeModule } from "@angular/material/badge";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTabsModule } from "@angular/material/tabs";
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { filter, map } from "rxjs";
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
    {
      title: "Info",
      route: "/info",
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

  private topBar = viewChild<ElementRef<HTMLElement>>("topBar");

  constructor() {
    // back to the top on moving to another page, but not when only the query changes (a filter or search)
    let lastPath: string | undefined;
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects.split(/[?#]/)[0]),
        takeUntilDestroyed(),
      )
      .subscribe((path) => {
        if (lastPath !== undefined && path !== lastPath) {
          window.scrollTo(0, 0);
        }
        lastPath = path;
      });

    // pages that fill the screen below the top bar size themselves with this
    effect((onCleanup) => {
      const bar = this.topBar()?.nativeElement;
      if (!bar || typeof ResizeObserver === "undefined") {
        return;
      }
      const observer = new ResizeObserver(() =>
        document.documentElement.style.setProperty("--top-bar-height", `${bar.offsetHeight}px`),
      );
      observer.observe(bar);
      onCleanup(() => observer.disconnect());
    });
  }

  protected signOut() {
    this.authService.logout();
    this.router.navigate(["/login"]);
  }
}
