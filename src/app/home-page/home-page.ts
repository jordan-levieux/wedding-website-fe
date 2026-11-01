import { NgOptimizedImage } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ScrollCue } from "../scroll-cue/scroll-cue";
import { GroupService } from "../services/groupService";

@Component({
  selector: "app-home-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./home-page.scss",
  templateUrl: "./home-page.html",
  imports: [NgOptimizedImage, ScrollCue],
})
export class HomePage {
  protected self = inject(GroupService).self;
}
