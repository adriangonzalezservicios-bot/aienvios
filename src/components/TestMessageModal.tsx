import React, { useState } from 'react';
import { X, Send, AlertTriangle, CheckCircle2, Phone, Sparkles } from 'lucide-react';

interface TestMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  languageCode: string;
  variables: string[];
  campaignId?: string;
  onSendTest: (phone: string, name: string) => Promise<{ success: boolean; wamid?: string }>;
}

export const TestMessageModal: React.FC<TestMessageModalProps> = ({
  isOpen,
  onClose,
  templateName,
  languageCode,
  variables,
  onSendTest,
}) => {
  const [testPhone, setTestPhone] = useState('+5491112345678');
  const [testName, setTestName] = useState('Prueba');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; wamid?: string; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setResult(null);

    try {
      const res = await onSendTest(testPhone, testName);
      setResult({ success: true, wamid: res.wamid });
    } catch (err: any) {
      setResult({ error: err.message || 'Error al despachar mensaje de prueba.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#dedbd3] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0eee9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Send className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#111827]">Prueba Rápida de Plantilla</h3>
              <p className="text-[11px] text-[#6b7280]">Envía 1 mensaje de prueba individual a tu número</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-[#faf9f6] border border-[#dedbd3] rounded-xl p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Plantilla:</span>
              <span className="font-mono font-semibold text-[#111827]">{templateName || 'No definida'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Idioma:</span>
              <span className="font-mono text-[#111827]">{languageCode}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">
              Nombre de prueba
            </label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="ej. Juan Pérez"
              className="w-full bg-white border border-[#dedbd3] rounded-xl px-3 py-2 text-xs text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">
              Número de Teléfono (con código de país)
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+5491112345678"
                className="w-full bg-white border border-[#dedbd3] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                required
              />
            </div>
            <p className="text-[11px] text-[#6b7280] mt-1">
              Ingresa el número internacional completo (código país + código área + número).
            </p>
          </div>

          {result?.success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">¡Mensaje de prueba despachado!</div>
                <div className="font-mono text-[11px] mt-0.5 text-emerald-900">WAMID: {result.wamid}</div>
              </div>
            </div>
          )}

          {result?.error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Error en el envío de prueba:</div>
                <div className="text-[11px] mt-0.5">{result.error}</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#374151] hover:bg-gray-100 rounded-xl transition"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSending || !testPhone.trim()}
              className="bg-[#111827] hover:bg-[#1f2937] disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5 text-[#25D366]" />
              <span>{isSending ? 'Despachando...' : 'Enviar Prueba'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
