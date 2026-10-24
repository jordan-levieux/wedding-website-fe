import { Routes } from "@angular/router";
import { ErrorPage } from "./error-page/error-page";
import { LoginPage } from "./login-page/login-page";
import { authGuard, landingGuard } from "./auth-guard";

export const routes: Routes = [
  {
    path: "login",
    component: LoginPage,
  },
  {
    path: "",
    canActivate: [authGuard],
    children: [
      {
        path: "",
        pathMatch: "full",
        canActivate: [landingGuard],
        children: [],
      },
      {
        path: "home",
        loadComponent: () => import("./home-page/home-page").then((m) => m.HomePage),
      },
      {
        path: "rsvp",
        loadComponent: () => import("./rsvp-page/rsvp-page").then((m) => m.RsvpPage),
      },
      {
        path: "**",
        component: ErrorPage,
      },
    ],
  },
];
