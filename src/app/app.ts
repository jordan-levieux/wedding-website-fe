import {
  Component,
  inject,
  Signal,
  signal,
  WritableSignal
} from "@angular/core";
import { MatTabsModule } from "@angular/material/tabs";
import { Router, RouterOutlet } from "@angular/router";
import { LoginPage } from "./login-page/login-page";
import { AuthService } from "./services/authService";

type Tab = {
  title: string;
  route: string;
};

@Component({
  selector: "app-root",
  styleUrl: "./app.scss",
  templateUrl: "./app.html",
  imports: [RouterOutlet, MatTabsModule, LoginPage],
})
export class App {
  authService = inject(AuthService);
  
  protected router = inject(Router);

  protected userToken: Signal<string | null> = this.authService.accessToken;
  protected readonly title = signal("wedding-website");
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
  protected selectedTab: WritableSignal<Tab> = signal(this.tabs[0]);

  navTo = (tab: Tab) => {
    this.selectedTab.set(tab);
    this.router.navigate([tab.route]);
    console.log("nav to hit: ", tab);
  };

  activeLink = () => {
    return "test";
  };
}
