export default async function handler(req, res) {
  try {
    const { mapX, mapY, radius = 5000, pageNo = 1, numOfRows = 30 } = req.query;

    if (!mapX || !mapY) {
      return res.status(400).json({ error: "Missing mapX/mapY (경도/위도)" });
    }

    const key = process.env.TOURAPI_KEY;
    if (!key) {
      return res.status(500).json({ error: "Missing TOURAPI_KEY (환경변수)" });
    }

    const base = "https://apis.data.go.kr/B551011/KorService2/locationBasedList1";
    const params = new URLSearchParams({
      serviceKey: encodeURIComponent(key),
      mapX,
      mapY,
      radius,
      pageNo,
      numOfRows,
      MobileOS: "ETC",
      MobileApp: "TrendTrip",
      arrange: "E",
      contentTypeId: "12",
      _type: "json"
    });

    const url = `${base}?${params.toString()}`;
    const r = await fetch(url);
    const text = await r.text();

    if (!r.ok) {
      return res.status(502).json({ error: `TourAPI ${r.status}`, body: text });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({ error: "Bad JSON from TourAPI", body: text.slice(0, 300) });
    }

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(data);

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}