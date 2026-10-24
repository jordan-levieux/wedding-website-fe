import { Component, effect, ElementRef, inject, OnInit, viewChild } from "@angular/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../services/authService";

@Component({
  imports: [MatProgressSpinnerModule],
  selector: "app-login-page",
  styleUrl: "./login-page.scss",
  templateUrl: "./login-page.html",
})
export class LoginPage implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);
  private googleButton = viewChild.required<ElementRef<HTMLElement>>("googleButton");

  protected loginError = this.authService.loginError;
  protected loggingIn = this.authService.loggingIn;

  constructor() {
    effect(() => {
      if (this.authService.accessToken()) {
        this.router.navigate(["/"]);
      }
    });
  }

  ngOnInit(): void {
    const signUpId: string | undefined = this.activatedRoute.snapshot.queryParams["sign-up-token"];
    if (!this.authService.accessToken()) {
      this.authService.triggerLogin(this.googleButton().nativeElement, signUpId);
    }
  }
}
