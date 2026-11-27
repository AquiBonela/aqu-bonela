/**
 * Preparación de imágenes en el navegador antes de subirlas (fotos de fichas, logotipos, iconos y
 * cabeceras). Redimensiona sin ampliar y convierte a WebP o PNG para que la web cargue rápido.
 */

/** Tamaño que cabe en el máximo indicado sin deformar ni ampliar. */
export function fitWithin(w: number, h: number, maxW: number, maxH = maxW) {
  const scale = Math.min(1, maxW / w, maxH / h);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

type Source = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void;
  close: () => void;
};

/** Abre la imagen; admite también SVG, que se rasteriza y nunca se guarda como SVG. */
async function openImage(file: Blob): Promise<Source> {
  if (file.type !== "image/svg+xml" && typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(file);
    return {
      width: bmp.width,
      height: bmp.height,
      draw: (ctx, x, y, w, h) => ctx.drawImage(bmp, x, y, w, h),
      close: () => bmp.close(),
    };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No se pudo abrir la imagen"));
      img.src = url;
    });
    const width = img.naturalWidth || 512;
    const height = img.naturalHeight || 512;
    return {
      width,
      height,
      draw: (ctx, x, y, w, h) => ctx.drawImage(img, x, y, w, h),
      close: () => {},
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type RenderOptions = {
  maxWidth: number;
  maxHeight?: number;
  type: "image/webp" | "image/png";
  quality?: number;
  /** Lienzo cuadrado de ese lado con la imagen centrada (iconos). */
  square?: number;
  /** Margen interior del cuadrado, en proporción del lado. */
  padding?: number;
  background?: string;
};

export async function renderImage(file: Blob, options: RenderOptions): Promise<Blob> {
  const source = await openImage(file);
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo convertir la imagen");
    if (options.square) {
      const side = options.square;
      canvas.width = side;
      canvas.height = side;
      if (options.background) {
        context.fillStyle = options.background;
        context.fillRect(0, 0, side, side);
      }
      const inner = side * (1 - 2 * (options.padding ?? 0));
      const { width, height } = fitWithin(source.width, source.height, inner, inner);
      const scale = Math.min(inner / width, inner / height);
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      source.draw(context, Math.round((side - w) / 2), Math.round((side - h) / 2), w, h);
    } else {
      const { width, height } = fitWithin(
        source.width,
        source.height,
        options.maxWidth,
        options.maxHeight,
      );
      canvas.width = width;
      canvas.height = height;
      if (options.background) {
        context.fillStyle = options.background;
        context.fillRect(0, 0, width, height);
      }
      source.draw(context, 0, 0, width, height);
    }
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("No se pudo convertir la imagen"))),
        options.type,
        options.quality ?? 0.82,
      ),
    );
  } finally {
    source.close();
  }
}
