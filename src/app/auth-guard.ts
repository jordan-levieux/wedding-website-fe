import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./services/authService";
import { GroupService } from "./services/groupService";

export const authGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const groupService = inject(GroupService);
  const router = inject(Router);

  if (!authService.accessToken()) {
    return router.createUrlTree(["/login"]);
  }
  if (groupService.group()) {
    return true;
  }
  // signed in from an earlier visit (token restored from sessionStorage): fetch the group first
  return groupService.load().then(
    () => true,
    () => router.createUrlTree(["/login"]),
  );
};

// the landing page: straight to the RSVP until the guest has answered for themselves
export const landingGuard: CanActivateFn = () => {
  const groupService = inject(GroupService);
  const router = inject(Router);
  return router.createUrlTree([groupService.hasResponded() ? "/home" : "/rsvp"]);
};
