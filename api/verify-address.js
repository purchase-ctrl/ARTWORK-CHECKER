module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "Server is missing GOOGLE_MAPS_API_KEY. Add it in Vercel → Project → Settings → Environment Variables, then redeploy."
    });
    return;
  }

  try {
    const { address } = req.body || {};
    if (!address) {
      res.status(400).json({ error: "Missing address in request body." });
      return;
    }

    const url =
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
      encodeURIComponent(address) +
      "&key=" + apiKey;

    const geoRes = await fetch(url);
    const data = await geoRes.json();

    if (data.status === "OK" && data.results && data.results.length) {
      const top = data.results[0];
      const locationType = top.geometry ? top.geometry.location_type : "";
      // ROOFTOP / RANGE_INTERPOLATED are strong matches; APPROXIMATE / GEOMETRIC_CENTER
      // usually mean only the general area (e.g. city) matched, not the specific address.
      const strongMatch = locationType === "ROOFTOP" || locationType === "RANGE_INTERPOLATED";
      res.status(200).json({
        status: strongMatch ? "pass" : "unclear",
        note: strongMatch
          ? `Found on Google Maps: "${top.formatted_address}".`
          : `Google could only match the general area, not the exact address: "${top.formatted_address}". Worth a manual check.`,
        formatted_address: top.formatted_address
      });
      return;
    }

    if (data.status === "ZERO_RESULTS") {
      res.status(200).json({
        status: "fail",
        note: "Google Maps could not find this address at all — it may be incorrect or incomplete."
      });
      return;
    }

    res.status(200).json({
      status: "unclear",
      note: "Address lookup did not return a clear result (" + data.status + ")."
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Address verification failed." });
  }
};
