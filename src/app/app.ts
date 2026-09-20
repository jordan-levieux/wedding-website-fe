import {
  Component,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from "@angular/core";
import { MatTabsModule } from "@angular/material/tabs";
import { Router, RouterOutlet } from "@angular/router";
import { LoginPage } from "./login-page/login-page";

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
export class App implements OnInit {
  protected router = inject(Router);

  protected userToken: WritableSignal<string | null> = signal(null);
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

  ngOnInit(): void {
    this.loadScript("https://accounts.google.com/gsi/client")
      .then(() => {
        this.initAuth();
      })
      .catch((error: any) => console.error("Error: ", error));
  }

  loadScript(src: string) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true; // Runs script asynchronously

      script.addEventListener("load", () => resolve(script));
      script.addEventListener("error", (err) => reject(err));

      document.head.appendChild(script);
    });
  }

  navTo = (tab: Tab) => {
    this.selectedTab.set(tab);
    this.router.navigate([tab.route]);
    console.log("nav to hit: ", tab);
  };

  activeLink = () => {
    return "test";
  };

  handleCredentialResponse = (res: { clientId: string; credential: string }) => {
    this.userToken.set(res.credential);
  }

  initAuth = () => {
    //@ts-ignore
    google.accounts.id.initialize({
      client_id:
        "REPLACE",
      callback: this.handleCredentialResponse,
      cancel_on_tap_outside: false,
    });
    //@ts-ignore
    google.accounts.id.prompt();
  };
}
