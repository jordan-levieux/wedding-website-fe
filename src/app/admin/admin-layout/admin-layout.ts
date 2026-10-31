import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AdminService } from "../../services/adminService";

@Component({
  selector: "app-admin-layout",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./admin-layout.scss",
  templateUrl: "./admin-layout.html",
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
})
export class AdminLayout {
  protected canEdit = inject(AdminService).canEdit;
  protected readonly sections = [
    { title: "Guests", route: "guests", icon: "group" },
    { title: "Map", route: "map", icon: "map" },
    { title: "RSVP changes", route: "changes", icon: "history" },
  ];
}
