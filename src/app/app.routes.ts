import { Routes } from "@angular/router";
import { HomePage } from "./home-page/home-page";
import { App } from "./app";
import { ErrorPage } from "./error-page/error-page";

export const routes: Routes = [
  {
    path: "",
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
        path: "**",
        component: ErrorPage,
      },
    ],
  },
];
