"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaUpload } from "react-icons/fa";
import type { Product } from "@/types";

interface ProductAddModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (product: Product) => void;
  existingIds: string[];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createProductId(name: string, existingIds: string[]) {
  const base = slugify(name) || `equipo-${Date.now()}`;
  if (!existingIds.includes(base)) return base;
  return `${base}-${Date.now()}`;
}

function isLocalDev() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

async function uploadFile(file: File, type: "image" | "pdf" | "video") {
  if (!isLocalDev()) {
    try {
      const { upload } = await import("@vercel/blob/client");
      const prefix = { image: "images/products", pdf: "pdf", video: "videos" }[type];
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-\s]/g, "_").trim() || "archivo";
      const pathname = `${prefix}/${Date.now()}-${safeName}`;

      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/cms/upload",
        clientPayload: JSON.stringify({ type }),
      });

      return blob.url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al subir el archivo";
      throw new Error(message);
    }
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  const res = await fetch("/api/cms/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Error al subir el archivo");
  }

  return data.path as string;
}

export default function ProductAddModal({
  open,
  onClose,
  onAdd,
  existingIds,
}: ProductAddModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [pdf, setPdf] = useState("");
  const [video, setVideo] = useState("");
  const [uploading, setUploading] = useState<"image" | "pdf" | "video" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setPrice("");
    setDescription("");
    setImage("");
    setPdf("");
    setVideo("");
    setError(null);
    setUploading(null);
  };

  const handleClose = () => {
    if (uploading) return;
    reset();
    onClose();
  };

  const handleFileUpload = async (file: File, type: "image" | "pdf" | "video") => {
    setUploading(type);
    setError(null);
    try {
      const path = await uploadFile(file, type);
      if (type === "image") setImage(path);
      else if (type === "pdf") setPdf(path);
      else setVideo(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Ingresa un precio válido");
      return;
    }

    if (!image.trim()) {
      setError("Sube una imagen del equipo");
      return;
    }

    if (!pdf.trim()) {
      setError("Sube el PDF del equipo");
      return;
    }

    if (!video.trim()) {
      setError("Sube el video del equipo");
      return;
    }

    const product: Product = {
      id: createProductId(name, existingIds),
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      image: image.trim(),
      pdf: pdf.trim(),
      video: video.trim(),
      benefits: [],
      technicalSpecs: [],
      advantages: [],
    };

    onAdd(product);
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#1a3a5c]">
                Agregar equipo
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <ModalField label="Nombre" value={name} onChange={setName} required />
              <ModalField
                label="Precio (MXN)"
                type="number"
                value={price}
                onChange={setPrice}
                required
              />

              <div>
                <label className="text-xs font-medium text-gray-600">Imagen</label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    <FaUpload className="text-[#1e88e5]" />
                    {uploading === "image" ? "Subiendo…" : "Subir imagen"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFileUpload(file, "image");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {image && <span className="text-xs text-gray-500">{image}</span>}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">PDF manual</label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    <FaUpload className="text-[#1e88e5]" />
                    {uploading === "pdf" ? "Subiendo…" : "Subir PDF"}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFileUpload(file, "pdf");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {pdf && <span className="text-xs text-gray-500">{pdf}</span>}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Video</label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    <FaUpload className="text-[#1e88e5]" />
                    {uploading === "video" ? "Subiendo…" : "Subir video"}
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFileUpload(file, "video");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {video && <span className="text-xs text-gray-500">{video}</span>}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={uploading !== null}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading !== null}
                  className="flex-1 rounded-xl bg-[#1e88e5] py-2.5 text-sm font-semibold text-white hover:bg-[#1565c0] disabled:opacity-50"
                >
                  Agregar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModalField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />
    </div>
  );
}
