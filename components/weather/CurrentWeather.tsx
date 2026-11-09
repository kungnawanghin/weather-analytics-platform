interface CurrentWeatherData {
  location: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
}

// ข้อมูลสมมติสำหรับพัฒนาหน้าตาเว็บ
const mockWeather: CurrentWeatherData = {
  location: "Lat Phrao, Bangkok",
  temperature: 32,
  humidity: 68,
  windSpeed: 12,
  condition: "Partly cloudy",
};

export default function CurrentWeather() {
  const weather = mockWeather;

  return (
    <section aria-labelledby="current-weather-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
            Current weather
          </p>

          <h2
            id="current-weather-title"
            className="mt-3 text-2xl font-semibold sm:text-3xl"
          >
            {weather.location}
          </h2>
        </div>

        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
          Demo · Mock data
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h3 className="text-sm text-slate-400">Temperature</h3>

          <p className="mt-4 text-5xl font-semibold">
            {weather.temperature}
            <span className="ml-1 text-2xl text-sky-200">°C</span>
          </p>

          <p className="mt-3 text-sm text-slate-300">
            {weather.condition}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h3 className="text-sm text-slate-400">Humidity</h3>

          <p className="mt-4 text-5xl font-semibold">
            {weather.humidity}
            <span className="ml-1 text-2xl text-sky-200">%</span>
          </p>

          <p className="mt-3 text-sm text-slate-300">
            Relative humidity
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h3 className="text-sm text-slate-400">Wind speed</h3>

          <p className="mt-4 text-5xl font-semibold">
            {weather.windSpeed}
            <span className="ml-2 text-xl text-sky-200">km/h</span>
          </p>

          <p className="mt-3 text-sm text-slate-300">
            Wind conditions
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Sample values for interface development. Not live weather data.
      </p>
    </section>
  );
}