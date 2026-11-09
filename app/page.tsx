import ScrollExpandMedia from "../components/ui/scroll-expansion-hero";
import CurrentWeather from "../components/weather/CurrentWeather";
import WeatherAnalytics from "../components/weather/WeatherAnalytics";

export default function Home() {
  return (
    <ScrollExpandMedia
      mediaType="video"
      mediaSrc="/weather.mp4"
      title="BEYOND THE FORECAST"
      subtitle="Weather forecasts for Bangkok and the surrounding metropolitan area."
      scrollToExpand="Scroll to explore"
    >
      <CurrentWeather />
      <WeatherAnalytics />
    </ScrollExpandMedia>
  );
}