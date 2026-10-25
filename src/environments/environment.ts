import { googleMapsApiKey } from "./maps-key";

export const environment = {
  apiUrl: "https://wedding-website-node-563861986647.africa-south1.run.app",
  googleClientId: "563861986647-ip051o498ukjamleqg3tflv8v4vnkf5a.apps.googleusercontent.com",
  // restricted to the site's URLs and kept out of git in maps-key.ts; the map picker is hidden without one
  googleMapsApiKey,
  googleMapsMapId: "HJ_WEDDING",
  // the venue, 33°56'10.7"S 22°39'57.6"E; where the map picker starts before a location is chosen
  mapDefaultCenter: { lat: -33.936306, lng: 22.666 },
};
