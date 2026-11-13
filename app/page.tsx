import ScrollExpandMedia from "../components/ui/scroll-expansion-hero";
import WeatherExplorer from "../components/weather/WeatherExplorer";
import SiteNavigation from "../components/weather/SiteNavigation";

export default function Home() {
  return (
    <main id="top">
    <SiteNavigation />
    <ScrollExpandMedia
      mediaType="video"
      mediaSrc="/weather.mp4"
      title="BEYOND THE FORECAST"
      subtitle="Weather forecasts for Bangkok and the surrounding metropolitan area."
      scrollToExpand="Scroll to explore"
    >
      <WeatherExplorer />
    </ScrollExpandMedia>
    </main>
  );
}
