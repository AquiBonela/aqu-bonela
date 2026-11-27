import { Text, useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getMunicipality } from "@/config/municipality";

type Weather = { temp: number; code: number };

// Coordenadas y zona horaria del municipio configurado (pueden cambiar desde /admin); sin ellas no se muestra el tiempo.
function forecastUrl(query: string): string | null {
  const coordinates = getMunicipality().coordinates;
  if (!coordinates) return null;
  const place = `latitude=${coordinates.lat}&longitude=${coordinates.lng}`;
  return `https://api.open-meteo.com/v1/forecast?${place}&${query}&timezone=${encodeURIComponent(coordinates.timezone)}`;
}

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

/** Tiempo actual en el municipio (Open-Meteo, sin claves ni cookies). */
export function WeatherNow() {
  const { tr, locale } = useI18n();
  const [w, setW] = useState<Weather | null>(null);

  useEffect(() => {
    const url = forecastUrl("current=temperature_2m,weather_code");
    if (!url) return;
    let alive = true;
    const load = () =>
      fetch(url)
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
        className="inline-flex min-h-11 min-w-0 items-center gap-1 text-sm font-semibold"
        aria-label={`${tr("Ahora en {municipio}")}: ${tr(label)}, ${w.temp}°. ${tr("Ver pronóstico")}`}
      >
        <Icon className="h-4 w-4 shrink-0 text-accent-foreground/80 sm:h-5 sm:w-5" aria-hidden />
        <span className="flex min-w-0 items-center gap-1.5 leading-tight">
          <span className="shrink-0 tabular-nums">{w.temp}°</span>
          <span className="hidden text-xs sm:inline">{tr(label)}</span>
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-none">
        <p className="text-base font-semibold"><Text text="Tiempo en {municipio}" /></p>
        <p className="mb-2 text-sm text-muted-foreground"><Text text="Ahora:" /> {tr(label)}, {w.temp}°</p>
        <Forecast />
        <p className="mt-2 text-xs text-muted-foreground"><Text text="Datos: Open-Meteo" /></p>
      </PopoverContent>
    </Popover>
  );
}

type Day = { date: string; code: number; max: number; min: number; rain: number };


function dayName(date: string, i: number, locale: string) {
  if (i === 0) return "Hoy";
  if (i === 1) return "Mañana";
  const s = new Date(date + "T12:00:00").toLocaleDateString(locale, { weekday: "long", day: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Forecast() {
  const { tr, locale } = useI18n();
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const url = forecastUrl("daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7");
    if (!url) {
      setError(true);
      return;
    }
    fetch(url)
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
  if (error) return <p className="text-sm text-muted-foreground"><Text text="No se pudo cargar el pronóstico." /></p>;
  if (!days) return <p className="text-sm text-muted-foreground"><Text text="Cargando…" /></p>;
  return (
    <ul className="divide-y divide-border">
      {days.map((d, i) => {
        const { Icon, label } = iconFor(d.code);
        return (
          <li key={d.date} className="flex items-center gap-3 py-2 text-sm">
            <span className="flex-1 font-medium">{tr(dayName(d.date, i, locale))}</span>
            <Icon className="h-5 w-5 text-accent-foreground/80" aria-label={tr(label)} />
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
