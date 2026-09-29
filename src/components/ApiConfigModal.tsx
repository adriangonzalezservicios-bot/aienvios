import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Key,
  Link2,
  Copy,
  Check,
  Server,
  Save,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { HealthResponse } from '../types';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthResponse | null;
  onConfigUpdated?: () => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  health,
  onConfigUpdated
}) => {
  const [copied, setCopied] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [token, setToken] = useState('');
  const [apiVersion, setApiVersion] = useState('v21.0');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load current configuration
      fetch('/api/config')
        .then((res) => res.json())
        .then((data) => {
          if (data.phoneNumberId) setPhoneNumberId(data.phoneNumberId);
          if (data.apiVersion) setApiVersion(data.apiVersion);
        })
        .catch(() => {});
      setSaveSuccess(false);
      setSaveError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfigured = health?.whatsappConfigured;

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: phoneNumberId.trim(),
          token: token.trim(),
          apiVersion: apiVersion.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar credenciales');
      }

      setSaveSuccess(true);
      if (onConfigUpdated) onConfigUpdated();
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message || 'Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const envSample = `# Credenciales de Meta WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID="${phoneNumberId || '1256380654232561'}"
WHATSAPP_TOKEN="${token ? '***' : 'EAAxxxx...'}"
WHATSAPP_API_VERSION="${apiVersion || 'v21.0'}"
WEBHOOK_VERIFY_TOKEN="akari_verify_token_secure"`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#dedbd3] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0eee9]">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {isConfigured ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-[#111827]">Configuración de Meta WhatsApp</h3>
              <p className="text-xs text-[#6b7280]">
                {isConfigured
                  ? 'Conectado a WhatsApp Cloud API Oficial'
                  : 'Operando en Modo Simulación Segura (Sandbox)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current status card */}
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
            isConfigured
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div className="font-bold flex items-center justify-between">
            <span>Modo: {health?.mode === 'live' ? 'En Vivo (Meta API)' : 'Simulador Seguro'}</span>
            <span className="font-mono text-[11px] bg-white/80 px-2 py-0.5 rounded border border-current">
              Graph API {health?.apiVersion || 'v21.0'}
            </span>
          </div>
          <p className="leading-relaxed text-[11px]">
            {isConfigured
              ? 'Los mensajes son despachados en vivo a WhatsApp con tu Phone Number ID y Token autorizados en Meta.'
              : 'Puedes operar sin costo en el simulador o ingresar tus credenciales abajo para despachar a teléfonos reales.'}
          </p>
        </div>

        {/* Form to enter credentials right here */}
        <form onSubmit={handleSaveCredentials} className="bg-[#faf9f6] border border-[#dedbd3] rounded-xl p-4 space-y-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#111827] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conectar WhatsApp Real (Credenciales)</span>
            </span>
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-medium underline"
            >
              <span>Abrir Meta Developers</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#374151] mb-1">
              Identificador de número de teléfono (Phone Number ID)
            </label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="ej. 1256380654232561"
              className="w-full bg-white border border-[#dedbd3] rounded-lg px-3 py-2 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
              required
            />
            <p className="text-[10px] text-[#6b7280] mt-0.5">
              Es el número que figura en Administrador de WhatsApp &gt; Números de teléfono.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#374151] mb-1">
              Token de acceso de Meta (WHATSAPP_TOKEN)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega aquí el token que empieza con EAA..."
              className="w-full bg-white border border-[#dedbd3] rounded-lg px-3 py-2 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
            />
            <p className="text-[10px] text-[#6b7280] mt-0.5">
              Se genera en Meta for Developers &gt; WhatsApp &gt; Configuración de la API.
            </p>
          </div>

          {saveSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2.5 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>¡Credenciales guardadas y aplicadas exitosamente en el servidor!</span>
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-2.5 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving || !phoneNumberId}
              className="bg-[#111827] hover:bg-[#1f2937] disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5 text-[#25D366]" />
              <span>{isSaving ? 'Guardando...' : 'Guardar y Conectar'}</span>
            </button>
          </div>
        </form>

        {/* Webhook details */}
        <div className="space-y-2 pt-2 border-t border-[#f0eee9] text-xs">
          <h4 className="font-bold text-[#111827] flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Endpoint de Webhook para Estados (Entregado / Leído)</span>
          </h4>
          <div className="bg-[#faf9f6] border border-[#dedbd3] p-3 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#6b7280]">URL de Callback Webhook:</span>
              <span className="font-mono text-[#111827] font-semibold">/api/webhook</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6b7280]">Verify Token configurado:</span>
              <span className="font-mono text-[#111827]">akari_verify_token_secure</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={handleCopyEnv}
            className="text-[11px] font-semibold text-[#4b5563] hover:text-[#111827] flex items-center gap-1"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copiado al portapapeles' : 'Copiar formato .env'}</span>
          </button>
          <button
            onClick={onClose}
            className="bg-white hover:bg-gray-100 text-[#374151] border border-[#dedbd3] text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
