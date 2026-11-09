import ScrollExpandMedia from "../components/ui/scroll-expansion-hero";
import WeatherExplorer from "../components/weather/WeatherExplorer";

export default function Home() {
  return (
    <ScrollExpandMedia
      mediaType="video"
      mediaSrc="/weather.mp4"
      title="BEYOND THE FORECAST"
      subtitle="Weather forecasts for Bangkok and the surrounding metropolitan area."
      scrollToExpand="Scroll to explore"
    >
      <WeatherExplorer />
    </ScrollExpandMedia>
  );
}
