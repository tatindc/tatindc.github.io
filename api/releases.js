export default async function handler(req, res) {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "Spotify credentials are not configured."
      });
    }

    // Tatin DC Spotify Artist ID
    const artistId = "4yFub2mOdJ4oHxbxrs4HuY";

    // Get Spotify access token
    const credentials = Buffer
      .from(`${clientId}:${clientSecret}`)
      .toString("base64");

    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      }
    );

    if (!tokenResponse.ok) {
      return res.status(500).json({
        error: "Unable to authenticate with Spotify."
      });
    }

    const tokenData = await tokenResponse.json();

    // Get Tatin DC releases
    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=PH&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    if (!spotifyResponse.ok) {
      return res.status(500).json({
        error: "Unable to retrieve Spotify releases."
      });
    }

    const data = await spotifyResponse.json();

    // Remove duplicate releases
    const seen = new Set();

    const releases = data.items
      .filter(item => {
        if (seen.has(item.name.toLowerCase())) {
          return false;
        }

        seen.add(item.name.toLowerCase());
        return true;
      })
      .sort((a, b) =>
        b.release_date.localeCompare(a.release_date)
      )
      .map(item => ({
        title: item.name,
        year: item.release_date.slice(0, 4),
        date: item.release_date,
        image: item.images?.[0]?.url || "",
        spotify: item.external_urls?.spotify || "",
        type: item.album_type
      }));

    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate=86400"
    );

    return res.status(200).json({
      artist: "Tatin DC",
      releases
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Something went wrong."
    });
  }
}
