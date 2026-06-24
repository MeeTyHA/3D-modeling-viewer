"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaEnvelope, FaTimes } from "react-icons/fa";

interface QuoteEmailModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: { email: string; clientName: string }) => Promise<void>;
  sending: boolean;
  error: string | null;
  success: string | null;
}

export default function QuoteEmailModal({
  open,
  onClose,
  onSend,
  sending,
  error,
  success,
}: QuoteEmailModalProps) {
  const [email, setEmail] = useState("");
  const [clientName, setClientName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSend({ email, clientName });
  };

  const handleClose = () => {
    if (sending) return;
    setEmail("");
    setClientName("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaEnvelope className="text-[#1e88e5]" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#1a3a5c]">
                  Enviar cotización
                </h3>
              </div>
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
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Nombre del cliente
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e88e5] focus:ring-1 focus:ring-[#1e88e5]"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e88e5] focus:ring-1 focus:ring-[#1e88e5]"
                  placeholder="cliente@empresa.com"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
              )}
              {success && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                  {success}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={sending}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 rounded-xl bg-[#1e88e5] py-2.5 text-sm font-semibold text-white hover:bg-[#1565c0] disabled:opacity-50"
                >
                  {sending ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
