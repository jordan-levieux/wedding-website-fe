import { Component, inject, OnInit } from "@angular/core";
import { AuthService } from "../services/authService";

@Component({
  imports: [],
  selector: "app-login-page",
  styleUrl: "./login-page.scss",
  templateUrl: "./login-page.html",
})
export class LoginPage implements OnInit {
  authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.triggerLogin();
  }
}
