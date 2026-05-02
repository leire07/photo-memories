import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

const STORAGE_KEY = "memory-card-draft-v1";

const THEMES = {
  polaroid: {
    name: "Polaroid moderno",
    pageBg: "bg-slate-100",
    cardBg: "bg-[#f8f8f6] border-slate-200",
    titleColor: "text-sky-700",
    headingColor: "text-slate-800",
    labelColor: "text-slate-500",
    chip: "bg-sky-50 text-sky-800 border-sky-200",
    noteBox: "bg-white border-slate-200",
    defaultDecorative: "— Un recuerdo para atesorar —",
    intro: "Visual, limpio y moderno.",
  },
  diario: {
    name: "Diario íntimo",
    pageBg: "bg-rose-50",
    cardBg: "bg-[#fffaf7] border-[#eaded8]",
    titleColor: "text-rose-700",
    headingColor: "text-rose-900",
    labelColor: "text-stone-500",
    chip: "bg-rose-100 text-rose-800 border-rose-200",
    noteBox: "bg-white/80 border-rose-100",
    defaultDecorative: "♡ Guardado con cariño",
    intro: "Suave, cálido y emocional.",
  },
  postal: {
    name: "Postal de viaje",
    pageBg: "bg-amber-50",
    cardBg: "bg-[#fffaf0] border-amber-200",
    titleColor: "text-amber-700",
    headingColor: "text-amber-900",
    labelColor: "text-stone-500",
    chip: "bg-amber-100 text-amber-900 border-amber-200",
    noteBox: "bg-white/80 border-amber-100",
    defaultDecorative: "✦ Un momento para volver siempre ✦",
    intro: "Con aire de viaje y recuerdo especial.",
  },
};

const defaultForm = {
  style: "polaroid",
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

function InfoItem({ icon, label, value, labelColor }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border bg-white/90 px-4 py-3 shadow-sm">
      <div className={classNames("text-xs font-medium", labelColor)}>{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
        <span>{icon}</span>
        <span>{value}</span>
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

function MemoryPreview({ data, captureRef }) {
  const theme = THEMES[data.style];
  const sensations = parseSensations(data.sensations || "");
  const decorativeText = data.decorativeDetail || theme.defaultDecorative;
  const formattedDate = formatDateForCard(data.date);

  return (
    <div className={classNames("min-h-screen w-full p-4 md:p-8", theme.pageBg)}>
      <div
        ref={captureRef}
        className={classNames(
          "mx-auto max-w-md rounded-[32px] border p-5 shadow-xl",
          theme.cardBg
        )}
      >
        {data.style === "polaroid" ? (
          <div className="mb-6 rounded-[28px] bg-white p-4 shadow-md">
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
              className={classNames(
                "pt-4 text-center text-3xl font-semibold italic",
                theme.titleColor
              )}
            >
              {data.title || "Sin título"}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 aspect-[4/3] overflow-hidden rounded-[26px] bg-stone-200 shadow-md">
              {data.image ? (
                <img src={data.image} alt="Recuerdo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-stone-500">
                  Tu foto aquí
                </div>
              )}
            </div>
            <h1 className={classNames("mb-4 text-3xl font-bold", theme.headingColor)}>
              {data.title || "Sin título"}
            </h1>
          </>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem icon="📍" label="Lugar" value={data.place} labelColor={theme.labelColor} />
          <InfoItem icon="📅" label="Fecha" value={formattedDate} labelColor={theme.labelColor} />
          <InfoItem icon="🕒" label="Hora" value={data.time} labelColor={theme.labelColor} />
          <InfoItem icon="👥" label="Personas" value={data.people} labelColor={theme.labelColor} />
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
                  className={classNames(
                    "rounded-full border px-3 py-1.5 text-sm",
                    theme.chip
                  )}
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
            <p className="whitespace-pre-line text-[15px] leading-7 text-slate-700">
              “{data.description}”
            </p>
          </div>
        )}

        <div className={classNames("mt-8 text-center text-sm italic", theme.titleColor)}>
          {decorativeText}
        </div>
      </div>
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
      // ignore broken data
    }
  }, []);

  const previewData = useMemo(() => form, [form]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => updateField("image", reader.result);
    reader.readAsDataURL(file);
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
    if (!captureRef.current) return;

    try {
      setStatus("Generando imagen...");
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

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
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[430px_1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h1 className="text-2xl font-bold">Creador de fichas de recuerdos</h1>
            <p className="mt-2 text-sm text-slate-600">
              Base en React pensada para crecer. Incluye estilos, foto, campos opcionales,
              guardado local y exportación como imagen.
            </p>
          </div>

          <StyleSelector
            selected={form.style}
            onChange={(value) => updateField("style", value)}
          />

          <div className="mt-6 space-y-4">
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
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="Título del recuerdo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Lugar</label>
              <input
                value={form.place}
                onChange={(e) => updateField("place", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="Lugar"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Hora</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => updateField("time", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Personas (opcional)</label>
              <input
                value={form.people}
                onChange={(e) => updateField("people", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="Ana, Lucía..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Sensaciones (opcional)</label>
              <input
                value={form.sensations}
                onChange={(e) => updateField("sensations", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="calma, alegría, nostalgia"
              />
              <p className="mt-1 text-xs text-slate-500">Sepáralas por comas.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="Escribe el recuerdo..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Detalle decorativo (opcional)
              </label>
              <input
                value={form.decorativeDetail}
                onChange={(e) => updateField("decorativeDetail", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                placeholder="Ej. ✦ Un momento para volver siempre ✦"
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
