import { Service, Signal, signal, WritableSignal } from "@angular/core";

@Service()
export class AuthService {
  private static readonly BE_URL =
    // "https://wedding-website-node-563861986647.africa-south1.run.app";
    "http://localhost:3000";

  private accessTokenInternal: WritableSignal<string | null> = signal(null);
  public accessToken: Signal<string | null> =
    this.accessTokenInternal.asReadonly();

  triggerLogin = () => {
    fetch(`${AuthService.BE_URL}/health`)
      .then((res) => console.log("called health endpoint", res))
      .catch((error) => console.error("error calling health endpoint:", error));

    this.loadScript("https://accounts.google.com/gsi/client")
      .then(() => {
        //@ts-ignore
        google.accounts.id.initialize({
          client_id:
            "563861986647-ip051o498ukjamleqg3tflv8v4vnkf5a.apps.googleusercontent.com",
          callback: this.handleCredentialResponse,
          cancel_on_tap_outside: false,
        });
        //@ts-ignore
        google.accounts.id.prompt();
      })
      .catch((error: any) => console.error("Error: ", error));
  };

  // TODO, how to pass error info, as this is callback, have error signal?
  private handleCredentialResponse = (res: {
    clientId: string;
    credential: string;
  }) => {
    fetch(`${AuthService.BE_URL}/auth/login`, {
      headers: {
        authorization: `Bearer ${res.credential}`,
      },
      method: "POST",
    })
      .then((loginRes) => {
        if (loginRes.status !== 200) {
          loginRes
            .json()
            .then((loginJsonRes) =>
              console.error("login failed:", loginJsonRes),
            );
        } else {
          this.accessTokenInternal.set(res.credential);
        }
      })
      .catch((error) => {
        console.error("error: ", error);
      });

    console.log("userIdToken: ", res.credential);
  };

  private loadScript(src: string) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true; // Runs script asynchronously

      script.addEventListener("load", () => resolve(script));
      script.addEventListener("error", (err) => reject(err));

      document.head.appendChild(script);
    });
  }
}
