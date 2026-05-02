import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

const STORAGE_KEY = "memory-card-draft-v1";

const THEMES = {
  polaroid: {
    name: "Polaroid moderno",
    pageBg: "bg-slate-100",
    cardBg: "bg-[#f8f8f6] border-slate-200",
    defaultColor: "#0369a1",
    labelColor: "text-slate-500",
    chip: "bg-sky-50 border-sky-200",
    noteBox: "bg-white border-slate-200",
    defaultDecorative: "- Un recuerdo para atesorar -",
    intro: "Visual, limpio y moderno.",
  },
  diario: {
    name: "Diario íntimo",
    pageBg: "bg-rose-50",
    cardBg: "bg-[#fffaf7] border-[#eaded8]",
    defaultColor: "#be123c",
    labelColor: "text-stone-500",
    chip: "bg-rose-100 border-rose-200",
    noteBox: "bg-white/80 border-rose-100",
    defaultDecorative: "Guardado con cariño",
    intro: "Suave, cálido y emocional.",
  },
  postal: {
    name: "Postal de viaje",
    pageBg: "bg-[#e8d8b8]",
    cardBg: "bg-[#fff8e8] border-[#c69c61]",
    defaultColor: "#8a4f18",
    labelColor: "text-[#8a6b45]",
    chip: "bg-[#fff3d4] border-[#d9ad6a]",
    noteBox: "bg-white/50 border-[#d5b27c]",
    defaultDecorative: "Un momento para volver siempre",
    intro: "Formato cuadrado con aire de postal.",
  },
};

const COLOR_OPTIONS = [
  { label: "Azul", value: "#0369a1" },
  { label: "Rosa", value: "#be123c" },
  { label: "Postal", value: "#8a4f18" },
  { label: "Verde", value: "#047857" },
  { label: "Negro", value: "#111827" },
];

const defaultForm = {
  style: "polaroid",
  textColor: THEMES.polaroid.defaultColor,
  title: "Atardecer en la playa",
  place: "Valencia, Malvarrosa",
  date: "2025-08-12",
  time: "20:14",
  people: "",
  sensations: "calma, libertad, verano",
  description:
    "Nos quedamos hasta que el sol se escondió en el horizonte. Fue un momento mágico, de esos que siempre recuerdas.",
  decorativeDetail: "",
  image: null,
};

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function parseSensations(raw) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateForCard(value) {
  if (!value) return "";

  try {
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return value;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function normalizeImageFile(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxSize = 1800;
  const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.9);
}

async function waitForImages(node) {
  const images = Array.from(node.querySelectorAll("img"));

  await Promise.all(
    images.map(async (image) => {
      if (!image.complete || image.naturalWidth === 0) {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
      }

      if (image.decode) {
        try {
          await image.decode();
        } catch {
          // Safari can reject decode for images that are already usable.
        }
      }
    })
  );

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function InfoItem({ icon, label, value, labelColor, textColor }) {
  if (!value) return null;

  return (
    <div className="min-w-0 rounded-2xl border bg-white/90 px-4 py-3 shadow-sm">
      <div className={classNames("text-xs font-medium", labelColor)}>{label}</div>
      <div className="mt-1 flex min-w-0 items-center gap-2 text-sm" style={{ color: textColor }}>
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
        <span className="min-w-0 break-words">{value}</span>
      </div>
    </div>
  );
}

function StyleSelector({ selected, onChange }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">Estilo de la ficha</div>
      <div className="grid gap-3">
        {Object.entries(THEMES).map(([key, theme]) => {
          const active = selected === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={classNames(
                "rounded-2xl border p-4 text-left transition hover:shadow-md",
                active ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
              )}
            >
              <div className="font-semibold">{theme.name}</div>
              <div className="mt-1 text-sm text-slate-600">{theme.intro}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TextColorPicker({ value, onChange }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">Color de las letras</div>
      <div className="flex flex-wrap items-center gap-2">
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color.value}
            type="button"
            aria-label={color.label}
            title={color.label}
            onClick={() => onChange(color.value)}
            className={classNames(
              "h-9 w-9 rounded-full border-2 transition",
              value === color.value ? "border-slate-900 ring-2 ring-slate-300" : "border-white"
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}
        <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <span>Personalizado</span>
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
      </div>
    </div>
  );
}

function PostalCard({ data, theme, captureRef, textColor }) {
  const sensations = parseSensations(data.sensations || "").slice(0, 3);
  const formattedDate = formatDateForCard(data.date);

  return (
    <div
      ref={captureRef}
      className={classNames(
        "memory-card postcard-card mx-auto aspect-square w-full max-w-[448px] overflow-hidden border p-5 shadow-xl",
        theme.cardBg
      )}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9c7240]">Postal</p>
            <h1 className="mt-1 text-4xl font-black leading-none" style={{ color: textColor }}>
              {data.title || "Sin título"}
            </h1>
          </div>
          <div className="postcard-stamp shrink-0" aria-label="Sello postal decorativo">
            <span className="postcard-stamp-place">AIR MAIL</span>
            <span className="postcard-stamp-icon">✈</span>
            <span className="postcard-stamp-price">0.75</span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="overflow-hidden border-4 border-white bg-stone-200 shadow-md">
            {data.image ? (
              <img src={data.image} alt="Recuerdo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-stone-500">
                Tu foto aquí
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col border-l border-dashed border-[#c8a36d] pl-4">
            <div className="space-y-3 text-sm leading-snug" style={{ color: textColor }}>
              {data.place && (
                <p>
                  <span className="block text-xs font-bold uppercase text-[#9c7240]">Lugar</span>
                  {data.place}
                </p>
              )}
              {formattedDate && (
                <p>
                  <span className="block text-xs font-bold uppercase text-[#9c7240]">Fecha</span>
                  {formattedDate}
                </p>
              )}
              {data.people && (
                <p>
                  <span className="block text-xs font-bold uppercase text-[#9c7240]">Para</span>
                  {data.people}
                </p>
              )}
            </div>

            <div className="mt-auto">
              <div className="mb-3 space-y-2">
                <div className="h-px bg-[#c8a36d]" />
                <div className="h-px bg-[#c8a36d]" />
                <div className="h-px bg-[#c8a36d]" />
              </div>
              <p className="line-clamp-4 text-sm leading-relaxed" style={{ color: textColor }}>
                {data.description || "Escribe aquí tu recuerdo de viaje."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {sensations.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className={classNames("rounded-full border px-2.5 py-1 text-xs", theme.chip)}
                style={{ color: textColor }}
              >
                {item}
              </span>
            ))}
          </div>
          <p className="shrink-0 text-right text-xs italic" style={{ color: textColor }}>
            {data.decorativeDetail || theme.defaultDecorative}
          </p>
        </div>
      </div>
    </div>
  );
}

function DiaryCard({ data, theme, captureRef, textColor }) {
  const sensations = parseSensations(data.sensations || "").slice(0, 4);
  const formattedDate = formatDateForCard(data.date);

  return (
    <div
      ref={captureRef}
      className={classNames(
        "memory-card diary-card mx-auto w-full max-w-[448px] overflow-hidden border p-5 shadow-xl",
        theme.cardBg
      )}
    >
      <div className="diary-tape diary-tape-left" />
      <div className="diary-tape diary-tape-right" />

      <div className="relative z-10 flex min-h-[620px] flex-col">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">
              Diario
            </p>
            <h1 className="mt-1 break-words text-4xl font-black leading-tight" style={{ color: textColor }}>
              {data.title || "Sin título"}
            </h1>
          </div>
          <div className="diary-paperclip shrink-0" aria-hidden="true" />
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_0.9fr]">
          <div className="diary-photo rotate-[-2deg]">
            <div className="aspect-square overflow-hidden bg-stone-200">
              {data.image ? (
                <img src={data.image} alt="Recuerdo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-500">
                  Tu foto aquí
                </div>
              )}
            </div>
            <p className="pt-3 text-center text-sm font-semibold" style={{ color: textColor }}>
              {data.place || "Lugar especial"}
            </p>
          </div>

          <div className="diary-note rotate-[2deg]">
            <p className="mb-3 text-sm font-bold text-rose-500">Nota rápida</p>
            <div className="space-y-3 text-sm leading-snug" style={{ color: textColor }}>
              {formattedDate && <p>{formattedDate}</p>}
              {data.time && <p>{data.time}</p>}
              {data.people && <p>{data.people}</p>}
            </div>
          </div>
        </div>

        {sensations.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-sm font-bold text-rose-400">Sensaciones</div>
            <div className="flex flex-wrap gap-2">
              {sensations.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className={classNames("rounded-full border px-3 py-1.5 text-sm", theme.chip)}
                  style={{ color: textColor }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="diary-lines mt-6 flex-1 rounded-2xl border border-rose-100 bg-white/55 p-5">
          <p className="whitespace-pre-line text-[15px] leading-8" style={{ color: textColor }}>
            {data.description || "Escribe aquí tu recuerdo."}
          </p>
        </div>

        <p className="mt-5 text-center text-sm italic" style={{ color: textColor }}>
          {data.decorativeDetail || theme.defaultDecorative}
        </p>
      </div>
    </div>
  );
}

function ClassicCard({ data, theme, captureRef, textColor }) {
  const sensations = parseSensations(data.sensations || "");
  const decorativeText = data.decorativeDetail || theme.defaultDecorative;
  const formattedDate = formatDateForCard(data.date);

  return (
    <div
      ref={captureRef}
      className={classNames(
        "memory-card mx-auto w-full max-w-[448px] rounded-[28px] border p-5 shadow-xl",
        theme.cardBg
      )}
    >
      {data.style === "polaroid" ? (
        <div className="mb-6 rounded-[24px] bg-white p-4 shadow-md">
          <div className="aspect-square overflow-hidden rounded-xl bg-slate-200">
            {data.image ? (
              <img src={data.image} alt="Recuerdo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">
                Tu foto aquí
              </div>
            )}
          </div>
          <div
            className="pt-4 text-center text-3xl font-semibold italic"
            style={{ color: textColor }}
          >
            {data.title || "Sin título"}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 aspect-[4/3] overflow-hidden rounded-[24px] bg-stone-200 shadow-md">
            {data.image ? (
              <img src={data.image} alt="Recuerdo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-stone-500">
                Tu foto aquí
              </div>
            )}
          </div>
          <h1 className="mb-4 text-3xl font-bold" style={{ color: textColor }}>
            {data.title || "Sin título"}
          </h1>
        </>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoItem
          icon="📍"
          label="Lugar"
          value={data.place}
          labelColor={theme.labelColor}
          textColor={textColor}
        />
        <InfoItem
          icon="📅"
          label="Fecha"
          value={formattedDate}
          labelColor={theme.labelColor}
          textColor={textColor}
        />
        <InfoItem
          icon="🕒"
          label="Hora"
          value={data.time}
          labelColor={theme.labelColor}
          textColor={textColor}
        />
        <InfoItem
          icon="👥"
          label="Personas"
          value={data.people}
          labelColor={theme.labelColor}
          textColor={textColor}
        />
      </div>

      {sensations.length > 0 && (
        <div className="mt-5">
          <div className={classNames("mb-2 text-sm font-medium", theme.labelColor)}>
            Sensaciones
          </div>
          <div className="flex flex-wrap gap-2">
            {sensations.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className={classNames("rounded-full border px-3 py-1.5 text-sm", theme.chip)}
                style={{ color: textColor }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.description && (
        <div className={classNames("mt-6 rounded-3xl border p-4", theme.noteBox)}>
          <div className={classNames("mb-2 text-sm font-medium", theme.labelColor)}>
            Descripción
          </div>
          <p className="whitespace-pre-line text-[15px] leading-7" style={{ color: textColor }}>
            "{data.description}"
          </p>
        </div>
      )}

      <div className="mt-8 text-center text-sm italic" style={{ color: textColor }}>
        {decorativeText}
      </div>
    </div>
  );
}

function MemoryPreview({ data, captureRef }) {
  const theme = THEMES[data.style];
  const textColor = data.textColor || theme.defaultColor;

  return (
    <div className={classNames("min-h-full w-full p-4 md:p-8", theme.pageBg)}>
      {data.style === "postal" ? (
        <PostalCard data={data} theme={theme} captureRef={captureRef} textColor={textColor} />
      ) : data.style === "diario" ? (
        <DiaryCard data={data} theme={theme} captureRef={captureRef} textColor={textColor} />
      ) : (
        <ClassicCard data={data} theme={theme} captureRef={captureRef} textColor={textColor} />
      )}
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState("");
  const captureRef = useRef(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw);
      setForm((prev) => ({ ...prev, ...saved }));
    } catch {
      // Ignore broken draft data.
    }
  }, []);

  const previewData = useMemo(() => form, [form]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateStyle(style) {
    setForm((prev) => ({
      ...prev,
      style,
      textColor: THEMES[style].defaultColor,
    }));
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setStatus("Preparando foto...");
      const normalizedImage = await normalizeImageFile(file);
      updateField("image", normalizedImage);
      setStatus("Foto lista.");
    } catch {
      try {
        const fallbackImage = await readFileAsDataUrl(file);
        updateField("image", fallbackImage);
        setStatus("Foto cargada.");
      } catch {
        setStatus("No se pudo cargar la foto.");
      }
    }
  }

  function saveDraft() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setStatus("Borrador guardado en este dispositivo.");
  }

  function resetDraft() {
    window.localStorage.removeItem(STORAGE_KEY);
    setForm(defaultForm);
    setStatus("Ficha reiniciada.");
  }

  async function downloadImage() {
    const node = captureRef.current;
    if (!node) return;

    try {
      setStatus("Generando imagen...");

      const previousWidth = node.style.width;
      node.style.width = "448px";
      const height = form.style === "postal" ? 448 : node.scrollHeight;

      await waitForImages(node);

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        width: 448,
        height,
        canvasWidth: 896,
        canvasHeight: height * 2,
        backgroundColor: form.style === "postal" ? "#fff8e8" : "#f8f8f6",
        style: {
          margin: "0",
          maxWidth: "448px",
          width: "448px",
        },
      });

      node.style.width = previousWidth;

      const link = document.createElement("a");
      const safeTitle = (form.title || "recuerdo")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-áéíóúüñ]/gi, "");

      link.download = `${safeTitle || "recuerdo"}.png`;
      link.href = dataUrl;
      link.click();
      setStatus("Imagen descargada.");
    } catch {
      setStatus("No se pudo descargar la imagen. Revisa si la foto cargó correctamente.");
    } finally {
      if (captureRef.current) {
        captureRef.current.style.width = "";
      }
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[430px_1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h1 className="text-2xl font-bold">Creador de fichas de recuerdos</h1>
            <p className="mt-2 text-sm text-slate-600">
              Guarda tus fotos con la información que quieras recordar: dónde estabas, quién te acompañaba, qué sentías... Elige un estilo, personaliza los colores y guarda tu recuerdo. 
            </p>
          </div>

          <StyleSelector selected={form.style} onChange={updateStyle} />

          <div className="mt-6 space-y-4">
            <TextColorPicker
              value={form.textColor || THEMES[form.style].defaultColor}
              onChange={(value) => updateField("textColor", value)}
            />

            <div>
              <label className="mb-1 block text-sm font-medium">Foto</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Título</label>
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="Título del recuerdo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Lugar</label>
              <input
                value={form.place}
                onChange={(event) => updateField("place", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="Lugar"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Hora</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => updateField("time", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Personas (opcional)</label>
              <input
                value={form.people}
                onChange={(event) => updateField("people", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="Ana, Lucía..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Sensaciones (opcional)</label>
              <input
                value={form.sensations}
                onChange={(event) => updateField("sensations", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="calma, alegría, nostalgia"
              />
              <p className="mt-1 text-xs text-slate-500">Sepáralas por comas.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Descripción</label>
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={5}
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="Escribe el recuerdo..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Detalle decorativo (opcional)</label>
              <input
                value={form.decorativeDetail}
                onChange={(event) => updateField("decorativeDetail", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="Ej. Un momento para volver siempre"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadImage}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Descargar como imagen
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Guardar borrador
            </button>
            <button
              type="button"
              onClick={resetDraft}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Reiniciar
            </button>
          </div>

          {status && <p className="mt-4 text-sm text-slate-600">{status}</p>}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <MemoryPreview data={previewData} captureRef={captureRef} />
        </section>
      </div>
    </div>
  );
}
