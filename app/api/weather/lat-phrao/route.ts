import { GET as getWeather } from "../route";
import { latPhrao } from "../../../../lib/live-weather";

// Keep the original endpoint working through the same validation and cache.
export async function GET(request: Request) {
  const url = new URL(request.url);
  url.search = new URLSearchParams({ areaId: latPhrao.area.id }).toString();
  return getWeather(new Request(url));
}
