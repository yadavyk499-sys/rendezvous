exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { origins, destination, modes } = JSON.parse(event.body);

    const results = await Promise.all(
      origins.map(async (origin, i) => {
        const mode = modes[i] === 'metro' || modes[i] === 'bus'
          ? 'transit'
          : modes[i] === 'walk'
          ? 'walking'
          : modes[i] === 'auto'
          ? 'driving'
          : 'driving';

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=${mode}&key=${process.env.GOOGLE_MAPS_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        const element = data.rows?.[0]?.elements?.[0];
        if (element?.status === 'OK') {
          return Math.ceil(element.duration.value / 60);
        }
        // Fallback if API fails
        const fallback = { driving: 35, transit: 40, walking: 60 };
        return fallback[mode] || 35;
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ durations: results })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
