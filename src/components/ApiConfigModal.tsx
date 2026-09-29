import React from 'react';
import { X, ShieldCheck, ShieldAlert, Key, Link2, Copy, Check, Server, HelpCircle } from 'lucide-react';
import { HealthResponse } from '../types';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthResponse | null;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ isOpen, onClose, health }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const isConfigured = health?.whatsappConfigured;

  const envSample = `# Credenciales de Meta WhatsApp Cloud API
WHATSAPP_TOKEN="EAAxxxx..."
WHATSAPP_PHONE_NUMBER_ID="10982348572918"
WHATSAPP_BUSINESS_ACCOUNT_ID="8291048291029"
WHATSAPP_API_VERSION="v21.0"
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
              <h3 className="font-bold text-base text-[#111827]">Estado de la API de WhatsApp</h3>
              <p className="text-xs text-[#6b7280]">
                {isConfigured
                  ? 'Conectado a la API Oficial de Meta WhatsApp Cloud'
                  : 'Operando en Modo Simulación Segura (Sandbox)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current status card */}
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            isConfigured
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div className="font-bold flex items-center justify-between">
            <span>Modo Actual: {health?.mode === 'live' ? 'En Vivo (Meta API)' : 'Simulador Seguro'}</span>
            <span className="font-mono text-[11px] bg-white/80 px-2 py-0.5 rounded border border-current">
              Graph API {health?.apiVersion || 'v21.0'}
            </span>
          </div>
          <p className="leading-relaxed text-[11px]">
            {isConfigured
              ? 'Los mensajes son despachados directamente a los servidores de WhatsApp Cloud API utilizando tu Phone Number ID y Token autorizados en Meta for Developers.'
              : 'El despachador simula el ciclo de vida completo (tiempos de red, estados WAMID, recibos de entrega y lectura) para pruebas sin costo ni riesgo de consumo de cuota.'}
          </p>
        </div>

        {/* How to configure variables */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              <span>Configuración de Credenciales de Servidor (.env)</span>
            </h4>
            <button
              onClick={handleCopyEnv}
              className="text-[11px] font-semibold text-[#374151] hover:text-[#111827] flex items-center gap-1 bg-[#faf9f6] border border-[#dedbd3] px-2.5 py-1 rounded-lg transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar Variables'}</span>
            </button>
          </div>

          <div className="bg-[#111827] text-[#e5e7eb] p-3.5 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
            <pre>{envSample}</pre>
          </div>
        </div>

        {/* Webhook details */}
        <div className="space-y-2 pt-2 border-t border-[#f0eee9] text-xs">
          <h4 className="font-bold text-[#111827] flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Endpoint de Webhook para Estados de Entrega y Lectura</span>
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

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
