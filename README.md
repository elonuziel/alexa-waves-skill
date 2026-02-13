# Alexa Waves — Surf Report Skill

A customizable Alexa skill that reports real-time **wave height** and **wind conditions** for any coastal spot in the world. Uses the free [Open-Meteo](https://open-meteo.com/) Marine & Weather APIs — no API key required.

## How It Works

Ask Alexa something like:

> "Alexa, open my waves"
> "Get the surf report"
> "Today's forecast"

She'll respond with real-time **wave height** & **wind conditions**, or a daily **weather forecast** (temperature, precipitation chance, and max winds) for the location you configure.

---

## Setup via the Alexa Developer Console

### 1. Create the Skill

1. Go to the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask).
2. Click **Create Skill**.
3. Enter a skill name (e.g. `My Waves`).
4. Choose **Custom** model and **Alexa-hosted (Node.js)** as the backend.
5. Pick a hosting region close to you, then click **Create Skill**.
6. Choose **Start from Scratch** as the template.

### 2. Set Up the Interaction Model

1. In the left sidebar go to **Build → Interaction Model → JSON Editor**.
2. Replace all the content with the contents of [`interactionModels/custom/en-US.json`](interactionModels/custom/en-US.json) from this repo.
3. *(Optional)* Change the `invocationName` field if you want a different wake phrase (e.g. `"my surf spot"`).
4. Click **Save Model**, then **Build Model**.

### 3. Add the Lambda Code

1. Go to the **Code** tab at the top of the console.
2. Open `index.js` and replace its content with the contents of [`lambda/index.js`](lambda/index.js) from this repo.
3. **Edit the configuration block** at the top of `index.js` to match your spot:
   ```js
   const SPOT_NAME = 'Your Beach Name';   // e.g. 'Pipeline' or 'Bondi Beach'
   const LATITUDE  = 21.67;               // decimal degrees
   const LONGITUDE = -158.05;             // decimal degrees
   ```
   > **Tip:** Find coordinates on Google Maps — right-click any point and copy the lat/lng.
4. Open `package.json` and replace it with the contents of [`lambda/package.json`](lambda/package.json) from this repo (this ensures `axios` is included as a dependency).
5. Click **Save** and then **Deploy**.

### 4. Test

1. Go to the **Test** tab.
2. Set the dropdown from **Off** to **Development**.
3. Type or say: `open my waves` followed by `get the surf report`.
4. You should hear the current conditions for your configured spot.

---

## Project Structure

```
skill.json                          # Skill manifest (metadata)
interactionModels/
  custom/
    en-US.json                      # Interaction model (intents & utterances)
lambda/
  index.js                          # Skill logic (edit your spot here)
  package.json                      # Node.js dependencies
```

## Customization

| What | Where | Details |
|------|-------|---------|
| **Location** | `lambda/index.js` — top of file | Change `SPOT_NAME`, `LATITUDE`, `LONGITUDE` |
| **Invocation name** | `interactionModels/custom/en-US.json` | Change the `invocationName` field |
| **Sample utterances** | `interactionModels/custom/en-US.json` | Add/edit the `samples` arrays under `GetSurfReportIntent` or `GetForecastIntent` |
| **Skill display name** | `skill.json` | Change the `name` under `publishingInformation` |

## Credits

- Weather data from [Open-Meteo](https://open-meteo.com/) (free, no key required).
- Built with the [Alexa Skills Kit SDK for Node.js](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs).

## License

MIT
