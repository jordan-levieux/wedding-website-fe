import { Routes } from "@angular/router";
import { ErrorPage } from "./error-page/error-page";
import { HomePage } from "./home-page/home-page";
import { RsvpPage } from "./rsvp-page/rsvp-page";
import { LoginPage } from "./login-page/login-page";
import { authGuard } from "./auth-guard";

export const routes: Routes = [
  {
    path: "login",
    component: LoginPage
  },
  {
    path: "",
    canActivate: [authGuard],
    children: [
      {
        path: "",
        redirectTo: "home",
        pathMatch: "full"
      },
      {
        path: "home",
        component: HomePage,
      },
      {
        path: "rsvp",
        component: RsvpPage,
      },
      {
        path: "**",
        component: ErrorPage,
      },
    ],
  },
];
