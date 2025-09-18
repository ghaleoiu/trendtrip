// /api/tourapi.js
module.exports = async function handler(req, res) {
  // CORS & 프리플라이트
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { by = "location" } = req.query;
    const key = process.env.TOURAPI_KEY; // 2015년 이후 발급키: 추가 인코딩 금지
    if (!key) return res.status(500).json({ error: "Missing TOURAPI_KEY" });

    const BASE = "https://apis.data.go.kr/B551011/KorService2";
    const common = { MobileOS: "ETC", MobileApp: "TrendTrip", _type: "json" };
    const qs = (extra) => new URLSearchParams({ ...common, ...extra }).toString();

    let url = "";

    if (by === "location") {
      const { mapX, mapY, radius = "5000", pageNo = "1", numOfRows = "30", contentTypeId = "12", arrange = "E" } = req.query;
      if (!mapX || !mapY) return res.status(400).json({ error: "Missing mapX/mapY" });
      url = `${BASE}/locationBasedList2?serviceKey=${key}&` + qs({
        mapX, mapY, radius, pageNo, numOfRows, contentTypeId, arrange
      });
    } else if (by === "area") {
      const { areaCode, sigunguCode = "", pageNo = "1", numOfRows = "100", contentTypeId = "12", arrange = "C" } = req.query;
      if (!areaCode) return res.status(400).json({ error: "Missing areaCode" });
      url = `${BASE}/areaBasedList2?serviceKey=${key}&` + qs({
        areaCode, pageNo, numOfRows, contentTypeId, arrange, ...(sigunguCode ? { sigunguCode } : {})
      });
    } else {
      return res.status(400).json({ error: "Invalid 'by' param (location|area)" });
    }

    const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: "Upstream error", body: text.slice(0, 2000) });

    try { return res.status(200).json(JSON.parse(text)); }
    catch { return res.status(200).json({ raw: text }); }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
};