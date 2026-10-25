import { DatePipe, NgOptimizedImage } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { RouterLink } from "@angular/router";
import { GroupService } from "../services/groupService";

type RsvpState = "todo" | "group" | "done" | "closed";

@Component({
  selector: "app-home-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./home-page.scss",
  templateUrl: "./home-page.html",
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule, NgOptimizedImage, RouterLink],
})
export class HomePage {
  private groupService = inject(GroupService);

  protected self = this.groupService.self;
  protected group = this.groupService.group;
  protected stillToDo = computed(() => {
    const { unanswered, incomplete } = this.groupService.attention();
    return unanswered + incomplete;
  });
  protected rsvpState = computed<RsvpState>(() => {
    if (!this.groupService.rsvpOpen()) {
      return "closed";
    }
    if (!this.groupService.hasResponded()) {
      return "todo";
    }
    return this.stillToDo() > 0 ? "group" : "done";
  });
}
