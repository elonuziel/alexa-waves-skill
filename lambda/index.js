/* *
 * Alexa Skill – Surf / Wave Report
 * Uses Open-Meteo Marine & Weather APIs (no API key needed).
 *
 * ✏️  CONFIGURE YOUR SPOT BELOW  ✏️
 * */
const Alexa = require('ask-sdk-core');
const axios = require('axios');

// ── YOUR CONFIGURATION ──────────────────────────────────────
// Change these values to match your surf spot:
const SPOT_NAME = 'Beit Yanai';        // Display name of your beach/spot
const LATITUDE  = 32.38;               // Latitude  (decimal degrees)
const LONGITUDE = 34.86;               // Longitude (decimal degrees)
// ─────────────────────────────────────────────────────────────

// ── API URLs (built from config above) ──────────────────────
const MARINE_URL =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${LATITUDE}&longitude=${LONGITUDE}&hourly=wave_height&timezone=auto`;
const WEATHER_URL =
    `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&hourly=wind_speed_10m,wind_direction_10m&timezone=auto`;
const FORECAST_URL =
    `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

// ── Helpers ─────────────────────────────────────────────────
const KMH_TO_KNOTS = 0.539957;

/**
 * Return the index of the hour closest to "now" inside the hourly time array.
 */
function getCurrentHourIndex(times) {
    const now = new Date();
    let closest = 0;
    let minDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
        const diff = Math.abs(new Date(times[i]).getTime() - now.getTime());
        if (diff < minDiff) {
            minDiff = diff;
            closest = i;
        }
    }
    return closest;
}

/**
 * Convert a meteorological wind-direction in degrees to a cardinal label.
 */
/**
 * Convert a WMO weather code to a human-friendly description.
 */
function weatherCodeToDescription(code) {
    const descriptions = {
        0: 'clear sky',
        1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
        45: 'foggy', 48: 'depositing rime fog',
        51: 'light drizzle', 53: 'moderate drizzle', 55: 'dense drizzle',
        56: 'light freezing drizzle', 57: 'dense freezing drizzle',
        61: 'slight rain', 63: 'moderate rain', 65: 'heavy rain',
        66: 'light freezing rain', 67: 'heavy freezing rain',
        71: 'slight snowfall', 73: 'moderate snowfall', 75: 'heavy snowfall',
        77: 'snow grains',
        80: 'slight rain showers', 81: 'moderate rain showers', 82: 'violent rain showers',
        85: 'slight snow showers', 86: 'heavy snow showers',
        95: 'thunderstorm', 96: 'thunderstorm with slight hail', 99: 'thunderstorm with heavy hail',
    };
    return descriptions[code] || 'unknown conditions';
}

/**
 * Convert a meteorological wind-direction in degrees to a cardinal label.
 */
function degreesToCardinal(deg) {
    const directions = [
        'north', 'north-northeast', 'northeast', 'east-northeast',
        'east', 'east-southeast', 'southeast', 'south-southeast',
        'south', 'south-southwest', 'southwest', 'west-southwest',
        'west', 'west-northwest', 'northwest', 'north-northwest',
    ];
    const index = Math.round(deg / 22.5) % 16;
    return directions[index];
}

// ── Intent Handlers ─────────────────────────────────────────

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput =
            `Welcome to the ${SPOT_NAME} surf report! You can say "get the surf report" for current conditions, or "today's forecast" for the daily forecast.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Say "surf report" or "today\'s forecast".')
            .getResponse();
    },
};

const GetSurfReportIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetSurfReportIntent'
        );
    },
    async handle(handlerInput) {
        try {
            // Fetch marine and weather data in parallel
            const [marineRes, weatherRes] = await Promise.all([
                axios.get(MARINE_URL),
                axios.get(WEATHER_URL),
            ]);

            const marineData = marineRes.data;
            const weatherData = weatherRes.data;

            // Find values for the current hour
            const marineIdx = getCurrentHourIndex(marineData.hourly.time);
            const weatherIdx = getCurrentHourIndex(weatherData.hourly.time);

            const waveHeight = marineData.hourly.wave_height[marineIdx];
            const windSpeedKmh = weatherData.hourly.wind_speed_10m[weatherIdx];
            const windDirDeg = weatherData.hourly.wind_direction_10m[weatherIdx];

            // Convert km/h → knots
            const windSpeedKnots = (windSpeedKmh * KMH_TO_KNOTS).toFixed(1);
            const windDirection = degreesToCardinal(windDirDeg);

            const speakOutput =
                `Currently at ${SPOT_NAME}, the waves are ${waveHeight} meters high ` +
                `and the wind is blowing at ${windSpeedKnots} knots, direction ${windDirection}.`;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        } catch (error) {
            console.log('Error fetching surf data:', JSON.stringify(error));
            const speakOutput =
                'Sorry, I was unable to retrieve the surf report right now. Please try again later.';
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        }
    },
};

const GetForecastIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetForecastIntent'
        );
    },
    async handle(handlerInput) {
        try {
            const forecastRes = await axios.get(FORECAST_URL);
            const daily = forecastRes.data.daily;

            // Today is the first element (index 0)
            const weatherCode = daily.weather_code[0];
            const tempMax = daily.temperature_2m_max[0];
            const tempMin = daily.temperature_2m_min[0];
            const precipChance = daily.precipitation_probability_max[0];
            const windMax = (daily.wind_speed_10m_max[0] * KMH_TO_KNOTS).toFixed(1);

            const condition = weatherCodeToDescription(weatherCode);

            const speakOutput =
                `Today's forecast for ${SPOT_NAME}: ${condition}, ` +
                `with a high of ${tempMax} degrees and a low of ${tempMin} degrees Celsius. ` +
                `There is a ${precipChance}% chance of precipitation ` +
                `and winds up to ${windMax} knots.`;

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        } catch (error) {
            console.log('Error fetching forecast data:', JSON.stringify(error));
            const speakOutput =
                'Sorry, I was unable to retrieve the forecast right now. Please try again later.';
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        }
    },
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
        );
    },
    handle(handlerInput) {
        const speakOutput =
            `You can say "get the surf report" to hear the current wave height and wind conditions at ${SPOT_NAME}, ` +
            `or say "today's forecast" for the daily weather forecast.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    },
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent')
        );
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye! Enjoy the waves!';

        return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    },
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
        );
    },
    handle(handlerInput) {
        const speakOutput =
            "Sorry, I don't know about that. Try saying \"surf report\".";

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder.getResponse();
    },
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    },
};

// ── Skill Builder ───────────────────────────────────────────
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        GetSurfReportIntentHandler,
        GetForecastIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler,
    )
    .addErrorHandlers(ErrorHandler)
    .withCustomUserAgent('alexa-waves/v1.0')
    .lambda();
