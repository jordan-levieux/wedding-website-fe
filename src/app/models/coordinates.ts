import { Coordinates } from "./api";

const NUMBER = String.raw`(-?\d{1,3}(?:\.\d+)?)`;

// most specific first: a Google Maps place link has the pin in !3d…!4d… and the map centre in @…
const PATTERNS = [
  new RegExp(String.raw`!3d${NUMBER}!4d${NUMBER}`),
  new RegExp(String.raw`[?&](?:q|query|ll|destination)=${NUMBER},\s*${NUMBER}`),
  new RegExp(String.raw`@${NUMBER},${NUMBER}`),
  new RegExp(String.raw`^\s*${NUMBER}\s*,\s*${NUMBER}\s*$`),
];

const isValid = ({ lat, lng }: Coordinates) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

/** Reads "lat, lng" or a Google Maps link; null when there are no usable coordinates in the text. */
export const parseCoordinates = (text: string): Coordinates | null => {
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    // not URL-encoded, use as is
  }
  for (const pattern of PATTERNS) {
    const match = pattern.exec(decoded);
    if (match) {
      const coordinates = { lat: Number(match[1]), lng: Number(match[2]) };
      if (isValid(coordinates)) {
        return coordinates;
      }
    }
  }
  return null;
};

export const formatCoordinates = (coordinates: Coordinates | null) =>
  coordinates ? `${coordinates.lat}, ${coordinates.lng}` : "";

export const mapsLink = ({ lat, lng }: Coordinates) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
