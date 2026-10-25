import { NgOptimizedImage } from "@angular/common";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { Router } from "@angular/router";
import { AuthService } from "../services/authService";

@Component({
  selector: "app-login-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./login-page.scss",
  templateUrl: "./login-page.html",
  imports: [MatCardModule, MatIconModule, MatProgressSpinnerModule, NgOptimizedImage],
})
export class LoginPage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private googleButton = viewChild.required<ElementRef<HTMLElement>>("googleButton");

  // bound from the invite link's ?sign-up-token=… query parameter
  signUpToken = input<string | undefined>(undefined, { alias: "sign-up-token" });

  protected loginError = this.authService.loginError;
  protected loggingIn = this.authService.loggingIn;

  constructor() {
    effect(() => {
      if (this.authService.accessToken()) {
        this.router.navigate(["/"]);
      }
    });
    afterNextRender(() => {
      if (!this.authService.accessToken()) {
        this.authService.triggerLogin(this.googleButton().nativeElement, this.signUpToken());
      }
    });
  }
}
