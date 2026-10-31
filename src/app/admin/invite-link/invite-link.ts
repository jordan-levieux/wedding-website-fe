import { Clipboard } from "@angular/cdk/clipboard";
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar } from "@angular/material/snack-bar";
import { inviteLink } from "../../models/admin";

@Component({
  selector: "app-invite-link",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./invite-link.scss",
  template: `
    <code class="link">{{ link() }}</code>
    <button mat-stroked-button type="button" (click)="copy()">
      <mat-icon>content_copy</mat-icon> Copy link
    </button>
  `,
  imports: [MatButtonModule, MatIconModule],
})
export class InviteLink {
  signUpUuid = input.required<string>();
  name = input.required<string>();

  private clipboard = inject(Clipboard);
  private snackBar = inject(MatSnackBar);

  protected link = computed(() => inviteLink(location.origin, this.signUpUuid()));

  protected copy() {
    const copied = this.clipboard.copy(this.link());
    this.snackBar.open(
      copied ? `Invite link for ${this.name()} copied` : "Couldn't copy the link",
      undefined,
      { duration: 3000 },
    );
  }
}
