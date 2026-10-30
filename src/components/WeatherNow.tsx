import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from "lucide-react";

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
    <span className="inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap" title={`${label} en Casarabonela`} aria-label={`Ahora en Casarabonela: ${label}, ${w.temp} grados`}>
      <Icon className="h-5 w-5 text-accent-foreground/80" aria-hidden />
      {w.temp}°
    </span>
  );
}
