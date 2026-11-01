import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

// the arrow at the bottom of a full-screen photo that scrolls down to the content below
@Component({
  selector: "app-scroll-cue",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./scroll-cue.scss",
  template: `
    <button type="button" aria-label="Read more" title="Read more" (click)="scroll()">
      <mat-icon>keyboard_arrow_down</mat-icon>
    </button>
  `,
  imports: [MatIconModule],
})
export class ScrollCue {
  target = input.required<HTMLElement>();

  protected scroll() {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.target().scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }
}
