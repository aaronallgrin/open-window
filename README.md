# Open Window

A stoplight for whether to open the windows. It compares indoor readings from an ecobee or Google Nest thermostat with outdoor conditions from weather.gov and outdoor air quality from Open-Meteo, then shows green, yellow or red with the reasons. It also says when to bring a jacket or an umbrella and shows the next good window over the coming 12 hours.

**Live app:** https://aaronallgrin.github.io/open-window/

## How it decides

- **Red:** rain or storms, outdoor AQI over 100, outdoor dew point 8°F+ above indoor (or muggy and higher), very windy, or temperatures far outside your comfort range.
- **Yellow:** moderate AQI, slightly more humid air outside, breezy, or temperatures that pull the house out of range.
- **Green:** everything else. Cooler or drier air that helps, and high indoor CO₂ or VOCs, count in favor of opening.

## Data and refresh

| Source | What | How often |
| --- | --- | --- |
| Device location, or IP-based location as a silent fallback | Where you are | Once per visit |
| weather.gov latest station observation | Outdoor temperature, humidity, dew point, wind, conditions | Every 5 min |
| weather.gov hourly forecast | 12-hour outlook, jacket and umbrella hints | Every 30 min |
| Open-Meteo air quality (CAMS) | Outdoor US AQI, PM2.5, ozone | Every 15 min |
| Beestat, ecobee or Nest | Indoor temperature, humidity, CO₂/VOC (ecobee air sensor models) | Every 5 min |

Polling pauses while the tab is hidden.

## Setup

Open Settings (gear icon):

- **ecobee via Beestat:** link your ecobee at beestat.io and request a Beestat API key. Beestat only answers its own website, so deploy `relay/beestat-worker.js` as a free Cloudflare Worker, then paste the Worker address, and the key if the relay does not hold it, into Settings and tap Test connection. Two optional Worker secrets:
  - `BEESTAT_KEY`: the relay holds your key, so no browser needs it.
  - `RELAY_TOKEN`: any long random string. The relay then only answers at `https://<worker>/<RELAY_TOKEN>`, so the bare Worker address is useless to anyone who finds it. Paste the full address, token included, into Settings. Recommended whenever `BEESTAT_KEY` is set.
- **ecobee (developer key):** paste an existing ecobee API key (ecobee isn't issuing new developer keys), tap Connect, then enter the PIN at ecobee.com → My Apps → Add Application.
- **Nest:** needs a Google Device Access project and an OAuth web client whose redirect URI is the live app address above.
- **Share:** "Copy share link" sends the setup (not your login, keys or Nest client secret) to someone else; they authorize with their own account. A link that would change an existing thermostat setup asks before applying.

Keys and tokens are stored only in each person's browser. Nothing secret is in this repo.

## Files

`index.html` is the whole app. `manifest.webmanifest` and the PNG icons make it installable to a phone's Home Screen.
