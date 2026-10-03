import { Component, effect, inject, OnInit } from "@angular/core";
import { AuthService } from "../services/authService";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
  imports: [],
  selector: "app-login-page",
  styleUrl: "./login-page.scss",
  templateUrl: "./login-page.html",
})
export class LoginPage implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      if (this.authService.accessToken()) {
        this.router.navigate(["/"]);
      }
    });
  }

  ngOnInit(): void {
    const signUpToken: string | undefined =
      this.activatedRoute.snapshot.queryParams["sign-up-token"];
    if (!this.authService.accessToken()) {
      this.authService.triggerLogin(signUpToken);
    }
  }
}
