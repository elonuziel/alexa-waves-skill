/* *
 * Alexa Skill – Beit Yanai Surf Report
 * Uses Open-Meteo Marine & Weather APIs (no API key needed).
 * */
const Alexa = require('ask-sdk-core');
const axios = require('axios');

// ── API URLs ────────────────────────────────────────────────
const MARINE_URL =
    'https://marine-api.open-meteo.com/v1/marine?latitude=32.38&longitude=34.86&hourly=wave_height&timezone=auto';
const WEATHER_URL =
    'https://api.open-meteo.com/v1/forecast?latitude=32.38&longitude=34.86&hourly=wind_speed_10m,wind_direction_10m&timezone=auto';

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
            'Welcome to the Beit Yanai surf report! You can say "get the surf report" to hear current conditions.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Say "surf report" to hear the latest conditions.')
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
                `Currently at Beit Yanai, the waves are ${waveHeight} meters high ` +
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

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
        );
    },
    handle(handlerInput) {
        const speakOutput =
            'You can say "get the surf report" to hear the current wave height and wind conditions at Beit Yanai.';

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
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler,
    )
    .addErrorHandlers(ErrorHandler)
    .withCustomUserAgent('beit-yanai-surf-report/v1.0')
    .lambda();
