import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { ADMIN_STATUS_DISPLAY, AdminStatus } from "../../models/admin";

@Component({
  selector: "app-status-pill",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./status-pill.scss",
  host: { "[class]": "status()" },
  template: `<mat-icon>{{ display().icon }}</mat-icon
    >{{ display().label }}`,
  imports: [MatIconModule],
})
export class StatusPill {
  status = input.required<AdminStatus>();
  protected display = computed(() => ADMIN_STATUS_DISPLAY[this.status()]);
}
