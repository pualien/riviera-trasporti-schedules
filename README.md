# Azzuriva

Independent Italian Riviera travel companion for Riviera Trasporti timetable data, built for GitHub Pages.

The app turns the official PDF into a route-first travel experience. Instead of manually scanning the timetable, users can search direct rides such as `Porto Maurizio -> Sanremo`, see the next departures, inspect the full timetable for the selected day type, and jump back to the official PDF page for verification. The product also reserves room for local discovery and verified fallback contacts without presenting itself as an official transit site.

## Development

Install dependencies:

```bash
npm install
```

Build static route data from the official Riviera Trasporti PDF:

```bash
npm run build:data
```

The build now checks the extracted PDF index against [`data/manual/line-pages.json`](./data/manual/line-pages.json) and fails if indexed timetable pages are missing or a configured page parses to zero trips.

Serve the site locally:

```bash
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173).

## Nearby Stop Picker

The `From` and `To` fields both support a nearby-stop flow. The browser asks for geolocation permission, loads a compact runtime map, and uses a live provider to suggest the 3-5 closest known stops from the shipped timetable dataset.

If location access is denied, the browser cannot provide geolocation, or the live provider cannot match results back to known Riviera stops, users can still search by typing stop names manually.

## Scope

The app supports direct rides from the official PDF, including school-only services exposed through the `Scolastico / School` day-type filter. It also presents conservative fallback guidance such as verified taxi contacts. It does not yet plan transfers end to end.

## Project Structure

- `scripts/`: PDF download, extraction, and data build pipeline
- `data/manual/`: curated parsing hints and stop aliases
- `assets/data/`: generated JSON consumed by the frontend
- `src/`: vanilla JavaScript app modules and UI rendering
- `tests/`: Vitest coverage for normalization, parsing, query logic, and rendering

## Deployment

The site is designed for GitHub Pages. The deployment workflow installs dependencies, rebuilds the static JSON assets, and publishes the repository as a Pages artifact.

## AdSense

The repo now includes the Google AdSense Auto ads integration path. The site loads the AdSense script from [src/lib/installAdSense.js](/Users/msenardi/Projects/riviera-trasporti-schedules/src/lib/installAdSense.js), but it stays inactive until a real publisher ID is set in [src/lib/ads.js](/Users/msenardi/Projects/riviera-trasporti-schedules/src/lib/ads.js).

The remaining launch steps are:

- Add the real `ca-pub-...` publisher ID in [src/lib/ads.js](/Users/msenardi/Projects/riviera-trasporti-schedules/src/lib/ads.js).
- Add the site in AdSense and enable Auto ads in the AdSense UI.
- Publish a real `/ads.txt` file using the template in [ads.txt.example](/Users/msenardi/Projects/riviera-trasporti-schedules/ads.txt.example).
- Configure Privacy & messaging in AdSense for EEA/UK/Swiss consent if you want to serve those regions.
