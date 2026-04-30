# riviera-trasporti-schedules

Static route finder for Riviera Trasporti timetable data, built for GitHub Pages.

The app turns the official PDF into a route-first web experience. Instead of manually scanning the timetable, users can search direct rides such as `Porto Maurizio -> Sanremo`, see the next departures, inspect the full timetable for the selected day type, and jump back to the official PDF page for verification.

## Development

Install dependencies:

```bash
npm install
```

Build static route data from the official Riviera Trasporti PDF:

```bash
npm run build:data
```

Serve the site locally:

```bash
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173).

## Project Structure

- `scripts/`: PDF download, extraction, and data build pipeline
- `data/manual/`: curated parsing hints and stop aliases
- `assets/data/`: generated JSON consumed by the frontend
- `src/`: vanilla JavaScript app modules and UI rendering
- `tests/`: Vitest coverage for normalization, parsing, query logic, and rendering

## Deployment

The site is designed for GitHub Pages. The deployment workflow installs dependencies, rebuilds the static JSON assets, and publishes the repository as a Pages artifact.
