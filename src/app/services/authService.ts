import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { inject, Service, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import { ApiError, Group } from "../models/api";
import { GroupService } from "./groupService";

const TOKEN_KEY = "wedding-id-token";
// a token this close to expiring is treated as expired, so requests don't fail half way through a visit
const EXPIRY_MARGIN_MS = 60_000;

const LOGIN_ERRORS: Record<number, string> = {
  400: "That invite link has already been used or isn't valid. If you've signed in before, use the same Google account as last time.",
  403: "We couldn't find an invitation for this Google account. Please use the link from your invite, or the Google account you signed in with before.",
  503: "We couldn't reach Google to check your sign-in. Please try again in a moment.",
};

export const tokenExpiresAt = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const isUsable = (token: string | null): token is string => {
  const expiresAt = token ? tokenExpiresAt(token) : null;
  return expiresAt !== null && expiresAt - EXPIRY_MARGIN_MS > Date.now();
};

// sessionStorage can be unavailable (private mode, blocked storage); the app then just forgets on refresh
const storage = {
  read: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  write: (token: string | null) => {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // ignore
    }
  },
};

export const apiErrorMessage = (error: unknown, fallback: string) =>
  error instanceof HttpErrorResponse && typeof (error.error as ApiError | null)?.error === "string"
    ? (error.error as ApiError).error
    : fallback;

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private groupService = inject(GroupService);
  private accessTokenInternal = signal<string | null>(this.restoreToken());
  private loginErrorInternal = signal<string | null>(null);
  private loggingInInternal = signal(false);
  private googleScript: Promise<void> | null = null;

  public accessToken = this.accessTokenInternal.asReadonly();
  public loginError = this.loginErrorInternal.asReadonly();
  public loggingIn = this.loggingInInternal.asReadonly();

  triggerLogin = (buttonContainer: HTMLElement, signupId?: string) => {
    // wakes the Cloud Run instance up while the guest is signing in
    fetch(`${environment.apiUrl}/health`).catch((error) =>
      console.error("error calling health endpoint:", error),
    );

    this.loadGoogleScript()
      .then(() => {
        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response) => this.login(response.credential, signupId),
          cancel_on_tap_outside: false,
        });
        // One Tap can be suppressed (dismissed recently, browser settings), so always offer the button too
        google.accounts.id.renderButton(buttonContainer, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
        });
        google.accounts.id.prompt();
      })
      .catch(() =>
        this.loginErrorInternal.set(
          "Google sign-in couldn't load. Please check your connection (or ad blocker) and refresh the page.",
        ),
      );
  };

  logout = () => {
    storage.write(null);
    this.accessTokenInternal.set(null);
    this.groupService.clear();
    if (typeof google !== "undefined") {
      google.accounts.id.disableAutoSelect();
    }
  };

  private login = (credential: string, signupId?: string) => {
    this.loginErrorInternal.set(null);
    this.loggingInInternal.set(true);
    firstValueFrom(
      this.http.post<Group>(`${environment.apiUrl}/auth/login`, null, {
        headers: { authorization: `Bearer ${credential}` },
        params: signupId ? { signupId } : {},
      }),
    )
      .then((group) => {
        this.groupService.setGroup(group);
        storage.write(credential);
        this.accessTokenInternal.set(credential);
      })
      .catch((error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        this.loginErrorInternal.set(
          LOGIN_ERRORS[status] ?? "Something went wrong signing you in. Please try again.",
        );
      })
      .finally(() => this.loggingInInternal.set(false));
  };

  private restoreToken() {
    const token = storage.read();
    if (isUsable(token)) {
      return token;
    }
    storage.write(null);
    return null;
  }

  private loadGoogleScript() {
    this.googleScript ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.addEventListener("load", () => resolve());
      script.addEventListener("error", (error) => {
        this.googleScript = null;
        reject(error);
      });
      document.head.appendChild(script);
    });
    return this.googleScript;
  }
}
