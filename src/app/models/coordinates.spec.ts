import { parseCoordinates } from "./coordinates";

describe("parseCoordinates", () => {
  it.each([
    ["-33.9249, 18.4241", { lat: -33.9249, lng: 18.4241 }],
    ["  -33.9249,18.4241 ", { lat: -33.9249, lng: 18.4241 }],
    ["https://www.google.com/maps/@-33.9,18.4,15z", { lat: -33.9, lng: 18.4 }],
    [
      // a place link: the pin (!3d/!4d) wins over the map centre (@)
      "https://www.google.com/maps/place/Some+Guesthouse/@-33.91,18.41,17z/data=!4m9!3m8!3d-33.9249!4d18.4241",
      { lat: -33.9249, lng: 18.4241 },
    ],
    ["https://maps.google.com/?q=-33.9249,18.4241", { lat: -33.9249, lng: 18.4241 }],
    [
      "https://www.google.com/maps/search/?api=1&query=-33.9249%2C18.4241",
      { lat: -33.9249, lng: 18.4241 },
    ],
  ])("reads %s", (text, expected) => {
    expect(parseCoordinates(text)).toEqual(expected);
  });

  it.each(["", "my aunt's house", "https://maps.app.goo.gl/abc123", "91, 18.4", "-33.9, 181"])(
    "finds nothing usable in %j",
    (text) => {
      expect(parseCoordinates(text)).toBeNull();
    },
  );
});
