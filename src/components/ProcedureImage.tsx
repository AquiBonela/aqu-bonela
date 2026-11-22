import { useEffect, useState } from 'react';
import { procedureImageUrl } from '@/lib/procedure-images';
import { useI18n } from '@/lib/i18n';
import { ProcedureText } from './ProcedureText';

export function ProcedureImage({ storagePath, alt, caption }: { storagePath: string; alt: string; caption: string }) {
  const { tr } = useI18n();
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setUrl(''); setFailed(false);
    if (storagePath) procedureImageUrl(storagePath).then((value) => { if (active) setUrl(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [storagePath]);
  if (!storagePath) return null;
  return <figure className="mx-auto w-full max-w-2xl">
    <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted/30">
      {url && !failed ? <img src={url} alt={tr(alt)} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-contain" /> : <span role={failed ? 'status' : undefined} className="text-sm text-muted-foreground">{tr(failed ? 'No se pudo cargar la imagen.' : 'Cargando…')}</span>}
    </div>
    {caption.trim() && <figcaption className="mt-2 text-sm text-muted-foreground"><ProcedureText text={tr(caption)} /></figcaption>}
  </figure>;
}