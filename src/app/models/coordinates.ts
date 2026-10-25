import { Coordinates } from "./api";

export const mapsLink = ({ lat, lng }: Coordinates) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
