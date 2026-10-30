import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Weather = { temp: number; code: number };

// Coordenadas de Casarabonela
const URL =
  "https://api.open-meteo.com/v1/forecast?latitude=36.786&longitude=-4.843&current=temperature_2m,weather_code&timezone=Europe%2FMadrid";

function iconFor(code: number): { Icon: LucideIcon; label: string } {
  if (code === 0) return { Icon: Sun, label: "Despejado" };
  if (code <= 2) return { Icon: CloudSun, label: "Poco nuboso" };
  if (code === 3) return { Icon: Cloud, label: "Nublado" };
  if (code <= 48) return { Icon: CloudFog, label: "Niebla" };
  if (code <= 57) return { Icon: CloudDrizzle, label: "Llovizna" };
  if (code <= 67 || (code >= 80 && code <= 82)) return { Icon: CloudRain, label: "Lluvia" };
  if (code <= 77 || code === 85 || code === 86) return { Icon: CloudSnow, label: "Nieve" };
  return { Icon: CloudLightning, label: "Tormenta" };
}

/** Tiempo actual en Casarabonela (Open-Meteo, sin claves ni cookies). */
export function WeatherNow() {
  const [w, setW] = useState<Weather | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(URL)
        .then((r) => r.json())
        .then((d) => {
          if (alive && d?.current) setW({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code });
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!w) return <span aria-hidden />;
  const { Icon, label } = iconFor(w.code);
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold whitespace-nowrap"
        aria-label={`Ahora en Casarabonela: ${label}, ${w.temp} grados. Ver pronóstico`}
      >
        <Icon className="h-5 w-5 text-accent-foreground/80" aria-hidden />
        {w.temp}°
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-none">
        <p className="text-base font-semibold">Tiempo en Casarabonela</p>
        <p className="mb-2 text-sm text-muted-foreground">Ahora: {label}, {w.temp}°</p>
        <Forecast />
        <p className="mt-2 text-xs text-muted-foreground">Datos: Open-Meteo</p>
      </PopoverContent>
    </Popover>
  );
}

type Day = { date: string; code: number; max: number; min: number; rain: number };

const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=36.786&longitude=-4.843&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FMadrid&forecast_days=7";

function dayName(date: string, i: number) {
  if (i === 0) return "Hoy";
  if (i === 1) return "Mañana";
  const s = new Date(date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Forecast() {
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch(FORECAST_URL)
      .then((r) => r.json())
      .then((d) => {
        const t = d?.daily;
        if (!t) throw new Error();
        setDays(
          t.time.map((date: string, i: number) => ({
            date,
            code: t.weather_code[i],
            max: Math.round(t.temperature_2m_max[i]),
            min: Math.round(t.temperature_2m_min[i]),
            rain: t.precipitation_probability_max?.[i] ?? 0,
          })),
        );
      })
      .catch(() => setError(true));
  }, []);
  if (error) return <p className="text-sm text-muted-foreground">No se pudo cargar el pronóstico.</p>;
  if (!days) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  return (
    <ul className="divide-y divide-border">
      {days.map((d, i) => {
        const { Icon, label } = iconFor(d.code);
        return (
          <li key={d.date} className="flex items-center gap-3 py-2 text-sm">
            <span className="flex-1 font-medium">{dayName(d.date, i)}</span>
            <Icon className="h-5 w-5 text-accent-foreground/80" aria-label={label} />
            <span className="w-10 text-right text-xs text-muted-foreground">{d.rain > 0 ? `${d.rain}%` : ""}</span>
            <span className="w-16 text-right tabular-nums">
              <strong>{d.max}°</strong> <span className="text-muted-foreground">{d.min}°</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
