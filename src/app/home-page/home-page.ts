import { NgOptimizedImage } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MatIcon } from "@angular/material/icon";
import { RouterLink } from "@angular/router";
import { ScrollCue } from "../scroll-cue/scroll-cue";
import { GroupService } from "../services/groupService";

@Component({
  selector: "app-home-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./home-page.scss",
  templateUrl: "./home-page.html",
  imports: [NgOptimizedImage, MatIcon, RouterLink, ScrollCue],
})
export class HomePage {
  protected self = inject(GroupService).self;
  // the venue's Google Maps listing (the app on phones), ready for directions
  protected mapsLink =
    "https://www.google.com/maps/place/Beyond+the+Moon+Guest+Farm/@-33.9361635,22.6633771,17z/data=!3m1!4b1!4m9!3m8!1s0x1e78a7d298c746f7:0xe8d79e4d6093d446!5m2!4m1!1i2!8m2!3d-33.936168!4d22.665952!16s%2Fg%2F1wck04gg";
}
