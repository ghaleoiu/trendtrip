export default async function handler(req, res) {
  try {
    const { by = "location" } = req.query;

    const key = process.env.TOURAPI_KEY;
    if (!key) return res.status(500).json({ error: "Missing TOURAPI_KEY (환경변수)" });

    const BASE = "https://apis.data.go.kr/B551011/KorService2";

    const commonParams = {
      MobileOS: "ETC",
      MobileApp: "TrendTrip",
      _type: "json",
      arrange: "E",
    };

    function buildUrl(path, extraParams) {
      const qs = new URLSearchParams({ ...commonParams, ...extraParams }).toString();
      if (key.includes("%")) {
        return `${BASE}/${path}?serviceKey=${key}&${qs}`;
      } else {
        const withKey = new URLSearchParams({ serviceKey: key });
        const prefix = withKey.toString();
        return `${BASE}/${path}?${prefix}&${qs}`;
      }
    }

    let endpoint = "";

    if (by === "location") {
      const {
        mapX, mapY,
        radius = "5000",
        pageNo = "1",
        numOfRows = "30",
        contentTypeId = "12",
      } = req.query;

      if (!mapX || !mapY) {
        return res.status(400).json({ error: "Missing mapX/mapY (경도/위도)" });
      }

      endpoint = buildUrl("locationBasedList1", {
        mapX: String(mapX),
        mapY: String(mapY),
        radius: String(radius),
        pageNo: String(pageNo),
        numOfRows: String(numOfRows),
        contentTypeId: String(contentTypeId),
      });

    } else if (by === "area") {
      const {
        areaCode,
        sigunguCode = "",
        pageNo = "1",
        numOfRows = "100",
        contentTypeId = "12",
      } = req.query;

      if (!areaCode) {
        return res.status(400).json({ error: "Missing areaCode" });
      }

      const extra = {
        areaCode: String(areaCode),
        pageNo: String(pageNo),
        numOfRows: String(numOfRows),
        contentTypeId: String(contentTypeId),
      };
      if (sigunguCode) extra.sigunguCode = String(sigunguCode);

      endpoint = buildUrl("areaBasedList1", extra);

    } else {
      return res.status(400).json({ error: "Invalid 'by' param (location|area)" });
    }

    const r = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await r.text();

    if (!r.ok) {
      return res.status(r.status).json({
        error: "Upstream error",
        status: r.status,
        body: text.slice(0, 2000),
      });
    }

    try {
      const data = JSON.parse(text);
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      return res.status(200).json(data);
    } catch {
      return res.status(200).json({ raw: text });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}