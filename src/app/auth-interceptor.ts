import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { environment } from "../environments/environment";
import { AuthService } from "./services/authService";

// Adds the ID token to API calls; a 401 means it expired, so log out and go back to the login page.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.accessToken();
  const request =
    token && !req.headers.has("authorization")
      ? req.clone({ setHeaders: { authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      // the login page shows its own errors
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.endsWith("/auth/login")
      ) {
        authService.logout();
        router.navigate(["/login"]);
      }
      return throwError(() => error);
    }),
  );
};
