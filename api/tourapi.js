// /api/tourapi.js
export default async function handler(req, res) {
  try {
    const { by = "location" } = req.query;

    // 1) 필수: 환경변수
    let key = process.env.TOURAPI_KEY;
    if (!key) return res.status(500).json({ error: "Missing TOURAPI_KEY (환경변수)" });
    // 저장된 키가 인코딩돼 있을 수도 있어 한 번 정규화
    try { key = decodeURIComponent(key); } catch {}

    const BASE = "https://apis.data.go.kr/B551011/KorService2";
    const common = {
      serviceKey: key,           // ❗️절대 encodeURIComponent 하지 말 것 (URLSearchParams가 처리)
      MobileOS: "ETC",
      MobileApp: "TrendTrip",
      _type: "json",
      arrange: "E",
      numOfRows: "100",
    };

    let endpoint = "";

    if (by === "location") {
      const {
        mapX, mapY,
        radius = "5000",
        pageNo = "1",
        numOfRows = "30",
        contentTypeId = "12", // 필요시 프론트에서 변경 가능
      } = req.query;

      if (!mapX || !mapY) {
        return res.status(400).json({ error: "Missing mapX/mapY (경도/위도)" });
      }

      const params = new URLSearchParams({
        ...common,
        mapX: String(mapX),
        mapY: String(mapY),
        radius: String(radius),
        pageNo: String(pageNo),
        numOfRows: String(numOfRows),
        contentTypeId: String(contentTypeId),
      });

      endpoint = `${BASE}/locationBasedList1?${params.toString()}`;

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

      const params = new URLSearchParams({
        ...common,
        areaCode: String(areaCode),
        pageNo: String(pageNo),
        numOfRows: String(numOfRows),
        contentTypeId: String(contentTypeId),
      });
      if (sigunguCode) params.set("sigunguCode", String(sigunguCode));

      endpoint = `${BASE}/areaBasedList1?${params.toString()}`;

    } else {
      return res.status(400).json({ error: "Invalid 'by' param (location|area)" });
    }

    // 2) 호출
    const r = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      cache: "no-store", // 심사용/디버깅용
    });
    const text = await r.text();

    // 3) 오류 전달 (원문 일부 포함)
    if (!r.ok) {
      return res.status(r.status).json({
        error: "Upstream error",
        status: r.status,
        body: text.slice(0, 2000),
      });
    }

    // 4) JSON 파싱이 안 되는 경우도 있어 대비
    try {
      const data = JSON.parse(text);
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      // 필요 시 CORS 오픈 (동일 도메인이면 불필요)
      // res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).json(data);
    } catch {
      // TourAPI가 간혹 XML/문자열을 돌려줄 수 있음
      return res.status(200).json({ raw: text });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}