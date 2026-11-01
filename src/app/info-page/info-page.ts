import { Clipboard } from "@angular/cdk/clipboard";
import { NgOptimizedImage } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar } from "@angular/material/snack-bar";
import { ScrollCue } from "../scroll-cue/scroll-cue";
import { bankingDetails } from "../../environments/banking-details";

@Component({
  selector: "app-info-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./info-page.scss",
  templateUrl: "./info-page.html",
  imports: [MatButtonModule, MatExpansionModule, MatIconModule, NgOptimizedImage, ScrollCue],
})
export class InfoPage {
  private clipboard = inject(Clipboard);
  private snackBar = inject(MatSnackBar);

  protected readonly bankingDetails = bankingDetails.filter((row) => row.value.trim());

  protected copy(label: string, value: string) {
    const copied = this.clipboard.copy(value);
    this.snackBar.open(copied ? `${label} copied` : "Couldn't copy that", undefined, {
      duration: 3000,
    });
  }
}
