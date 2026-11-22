import { provideHttpClient, withFetch, withInterceptors } from "@angular/common/http";
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from "@angular/core";
import { MAT_ICON_DEFAULT_OPTIONS } from "@angular/material/icon";
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from "@angular/router";
import { routes } from "./app.routes";
import { authInterceptor } from "./auth-interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // links like /info#dress-code scroll to that section
      withInMemoryScrolling({ anchorScrolling: "enabled" }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: "material-icons-round" } },
  ],
};
