import { Routes } from "@angular/router";
import { AdminLayout } from "./admin-layout/admin-layout";

export const adminRoutes: Routes = [
  {
    path: "",
    component: AdminLayout,
    children: [
      { path: "", pathMatch: "full", redirectTo: "guests" },
      {
        path: "guests",
        loadComponent: () => import("./guests-page/guests-page").then((m) => m.GuestsPage),
      },
      {
        path: "guests/new",
        loadComponent: () => import("./add-guest-page/add-guest-page").then((m) => m.AddGuestPage),
      },
      {
        path: "guests/:guestId",
        loadComponent: () => import("./guest-page/guest-page").then((m) => m.GuestPage),
      },
      {
        path: "map",
        loadComponent: () => import("./map-page/map-page").then((m) => m.MapPage),
      },
      {
        path: "changes",
        loadComponent: () => import("./changes-page/changes-page").then((m) => m.ChangesPage),
      },
    ],
  },
];
