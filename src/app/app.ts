import { Component, inject, signal, WritableSignal } from "@angular/core";
import { MatTabsModule } from '@angular/material/tabs';
import { Router, RouterOutlet } from "@angular/router";

type Tab = {
  title: string,
  route: string
}

@Component({
  selector: "app-root",
  styleUrl: "./app.scss",
  templateUrl: "./app.html",
  imports: [RouterOutlet, MatTabsModule],
})
export class App {
  protected router = inject(Router);
  protected readonly title = signal("wedding-website-fe");
  protected readonly tabs: Tab[] = [
    {
      title: "Home",
      route: "/home"
    },
    {
      title: "RSVP",
      route: "/rsvp-form"
    }
  ]
  protected selectedTab: WritableSignal<Tab> = signal(this.tabs[0]);

  navTo = (tab: Tab) => {
    this.selectedTab.set(tab);
    this.router.navigate([tab.route])
    console.log("nav to hit: ", tab)
  };

  activeLink = () => {return "test"} 
}
