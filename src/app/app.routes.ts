import { Routes } from "@angular/router";
import { adminGuard, authGuard, landingGuard } from "./auth-guard";

export const routes: Routes = [
  {
    path: "login",
    loadComponent: () => import("./login-page/login-page").then((m) => m.LoginPage),
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
        path: "admin",
        canActivate: [adminGuard],
        loadChildren: () => import("./admin/admin.routes").then((m) => m.adminRoutes),
      },
      {
        path: "**",
        loadComponent: () => import("./error-page/error-page").then((m) => m.ErrorPage),
      },
    ],
  },
];
