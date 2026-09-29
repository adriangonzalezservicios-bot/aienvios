import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Clock,
  ShieldCheck,
  Zap,
  RotateCcw,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { WhatsAppPreviewCard } from './WhatsAppPreviewCard';
import { Contact } from '../types';

interface CampaignFormProps {
  onCreateCampaign: (data: {
    name: string;
    templateName: string;
    languageCode: string;
    variables: string[];
    contacts: Array<{ name: string; phone: string }>;
    settings: {
      minDelayMs: number;
      maxDelayMs: number;
      batchSize: number;
      breakMs: number;
      stopOnFailureRate: number;
    };
  }) => Promise<void>;
  onOpenTestModal: (templateName: string, languageCode: string, variables: string[]) => void;
  isLoading: boolean;
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
  onCreateCampaign,
  onOpenTestModal,
  isLoading,
}) => {
  // Campaign basic info
  const [name, setName] = useState('Aviso cambio de número + lista de precios');
  const [templateName, setTemplateName] = useState('akari_lista_precios');
  const [languageCode, setLanguageCode] = useState('es_AR');
  const [variablesText, setVariablesText] = useState(
    '{{nombre}}\nhttps://akari.com/lista-precios\nhttps://wa.me/5491100001111'
  );

  // Contacts CSV
  const [csvText, setCsvText] = useState(
    'Juan Pérez,5491112345678\nMaría López,5491198765432\nCarlos Gómez,5491165432109\nSofía Martínez,5491144332211\nLucía Fernández,5491155667788\nDiego Rossi,5491177889900'
  );

  // Anti-Ban & Safe Dispatch Settings
  const [minDelaySec, setMinDelaySec] = useState<number>(30);
  const [maxDelaySec, setMaxDelaySec] = useState<number>(90);
  const [batchSize, setBatchSize] = useState<number>(5);
  const [breakMin, setBreakMin] = useState<number>(10);
  const [failureRatePercent, setFailureRatePercent] = useState<number>(20);

  const [formError, setFormError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV
  const parseContacts = (text: string): Array<{ name: string; phone: string }> => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',');
        const namePart = (parts.shift() || 'Cliente').trim();
        const phonePart = parts.join(',').trim();
        return {
          name: namePart,
          phone: phonePart.startsWith('+') ? phonePart : `+${phonePart}`,
        };
      })
      .filter((c) => c.phone.replace(/[^\d]/g, '').length >= 8);
  };

  const parsedContacts = parseContacts(csvText);
  const parsedVariables = variablesText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLoadDemo = () => {
    setName('Aviso cambio de número + lista de precios');
    setTemplateName('akari_lista_precios');
    setLanguageCode('es_AR');
    setVariablesText('{{nombre}}\nhttps://akari.com/lista-precios\nhttps://wa.me/5491100001111');
    setCsvText(
      'Juan Pérez,5491112345678\nMaría López,5491198765432\nCarlos Gómez,5491165432109\nSofía Martínez,5491144332211\nLucía Fernández,5491155667788\nDiego Rossi,5491177889900'
    );
    setMinDelaySec(15);
    setMaxDelaySec(45);
    setBatchSize(5);
    setBreakMin(5);
    setFailureRatePercent(20);
    setFormError(null);
  };

  const handleClear = () => {
    setCsvText('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Por favor ingresa un nombre para la campaña.');
      return;
    }
    if (!templateName.trim()) {
      setFormError('Por favor especifica el nombre de la plantilla de WhatsApp aprobada.');
      return;
    }
    if (parsedContacts.length === 0) {
      setFormError('Debes ingresar al menos un contacto válido (con formato: Nombre, Teléfono).');
      return;
    }

    try {
      await onCreateCampaign({
        name: name.trim(),
        templateName: templateName.trim(),
        languageCode: languageCode.trim(),
        variables: parsedVariables,
        contacts: parsedContacts,
        settings: {
          minDelayMs: Math.max(1000, minDelaySec * 1000),
          maxDelayMs: Math.max(minDelaySec * 1000, maxDelaySec * 1000),
          batchSize: Math.max(1, batchSize),
          breakMs: Math.max(1000, breakMin * 60 * 1000),
          stopOnFailureRate: Math.min(1, Math.max(0.01, failureRatePercent / 100)),
        },
      });
    } catch (err: any) {
      setFormError(err.message || 'Error al crear la campaña.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Atención:</span> {formError}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Campaña */}
          <div className="bg-white border border-[#dedbd3] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#f0eee9]">
              <div className="w-6 h-6 rounded-full bg-[#111827] text-white flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h3 className="font-bold text-sm text-[#111827]">Configuración de Campaña</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                  Nombre de la Campaña
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Aviso cambio de número + lista de precios"
                  className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2.5 text-xs text-[#111827] focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-hidden transition"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                    Plantilla aprobada (Meta)
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="ej. akari_lista_precios"
                    className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-hidden transition"
                    required
                  />
                  <p className="text-[11px] text-[#6b7280] mt-1">
                    Debe coincidir con la plantilla registrada en Meta Business Manager.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                    Idioma de la plantilla
                  </label>
                  <select
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2.5 text-xs text-[#111827] focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-hidden transition"
                  >
                    <option value="es_AR">Español (Argentina) - es_AR</option>
                    <option value="es_ES">Español (España) - es_ES</option>
                    <option value="es_MX">Español (México) - es_MX</option>
                    <option value="es_CO">Español (Colombia) - es_CO</option>
                    <option value="en_US">Inglés (EE. UU.) - en_US</option>
                    <option value="pt_BR">Portugués (Brasil) - pt_BR</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#374151]">
                    Variables del cuerpo (una por línea)
                  </label>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                    Soporta {'{{nombre}}'}
                  </span>
                </div>
                <textarea
                  value={variablesText}
                  onChange={(e) => setVariablesText(e.target.value)}
                  placeholder="ej:&#10;{{nombre}}&#10;https://akari.com/lista-precios&#10;https://wa.me/5491100001111"
                  rows={4}
                  className="w-full bg-white border border-[#dedbd3] rounded-xl p-3 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-hidden transition leading-relaxed resize-y"
                />
                <p className="text-[11px] text-[#6b7280] mt-1">
                  Cada línea se asociará a un parámetro posicional en el cuerpo de la plantilla oficial de WhatsApp.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Contactos */}
          <div className="bg-white border border-[#dedbd3] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#f0eee9]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#111827] text-white flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <h3 className="font-bold text-sm text-[#111827]">Contactos de Destino</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#111827]/5 text-[#111827] border border-[#dedbd3]">
                  <Users className="w-3 h-3 text-[#25D366]" />
                  {parsedContacts.length} válidos
                </span>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition mb-3 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/60'
                  : 'border-[#dedbd3] bg-[#faf9f6] hover:bg-[#f4f2ed]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#4b5563]">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Arrastra un archivo .CSV o haz clic para subir contactos</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                CSV: <span className="font-mono text-[11px] font-normal text-[#6b7280]">nombre,telefono (uno por línea)</span>
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Juan Pérez,5491112345678&#10;María López,5491198765432&#10;Carlos Gómez,5491165432109"
                rows={5}
                className="w-full bg-white border border-[#dedbd3] rounded-xl p-3 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-hidden transition leading-relaxed resize-y"
              />
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="px-3 py-1.5 text-xs font-medium text-[#374151] bg-[#fbfaf8] hover:bg-[#f3f1ec] border border-[#dedbd3] rounded-lg transition"
                >
                  Cargar ejemplo
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50/70 hover:bg-red-100/70 border border-red-200 rounded-lg transition"
                >
                  Limpiar lista
                </button>
              </div>
              <span className="text-[11px] text-[#6b7280]">
                Formato telefónico E.164 (ej: 54911...)
              </span>
            </div>
          </div>

          {/* Section 3: Ritmo Prudente (Anti-Ban Engine) */}
          <div className="bg-white border border-[#dedbd3] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#f0eee9]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#111827] text-white flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <h3 className="font-bold text-sm text-[#111827]">Ritmo Prudente (Protección Anti-Ban)</h3>
              </div>
              <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Anti-Spam Filter Safe
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Mínimo entre mensajes (seg.)
                </label>
                <input
                  type="number"
                  min="2"
                  max="600"
                  value={minDelaySec}
                  onChange={(e) => setMinDelaySec(Number(e.target.value))}
                  className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                />
                <p className="text-[11px] text-[#6b7280] mt-0.5">Demora base entre cada destinatario.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Máximo entre mensajes (seg.)
                </label>
                <input
                  type="number"
                  min={minDelaySec}
                  max="1200"
                  value={maxDelaySec}
                  onChange={(e) => setMaxDelaySec(Number(e.target.value))}
                  className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                />
                <p className="text-[11px] text-[#6b7280] mt-0.5">Agrega jitter aleatorio para emular cadencia humana.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Mensajes por bloque (Lote)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                />
                <p className="text-[11px] text-[#6b7280] mt-0.5">Cantidad de envíos antes de descansar.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Descanso de bloque (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={breakMin}
                  onChange={(e) => setBreakMin(Number(e.target.value))}
                  className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                />
                <p className="text-[11px] text-[#6b7280] mt-0.5">Pausa preventiva para enfriar el número.</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#f0eee9]">
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Circuito de corte: Detener si la tasa de error supera el
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={failureRatePercent}
                  onChange={(e) => setFailureRatePercent(Number(e.target.value))}
                  className="w-full accent-[#111827]"
                />
                <span className="font-mono text-xs font-bold text-[#111827] w-12 text-right">
                  {failureRatePercent}%
                </span>
              </div>
              <p className="text-[11px] text-[#6b7280] mt-1">
                Si un lote supera este porcentaje de rechazos, el despachador se pausa automáticamente para proteger la reputación de la línea en Meta.
              </p>
            </div>
          </div>

          {/* Submission and quick test buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading || parsedContacts.length === 0}
              className="flex-1 bg-[#111827] hover:bg-[#1f2937] disabled:opacity-50 text-white font-bold text-xs py-3.5 px-6 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-[#25D366]" />
              <span>{isLoading ? 'Creando Campaña...' : 'Crear y Guardar Campaña'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenTestModal(templateName, languageCode, parsedVariables)}
              disabled={!templateName.trim()}
              className="bg-white hover:bg-[#faf9f6] text-[#374151] border border-[#dedbd3] font-semibold text-xs py-3.5 px-5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Test rápido (1 mensaje)</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live WhatsApp Template Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4b5563]">
                Vista Previa en WhatsApp
              </h4>
              <span className="text-[11px] text-[#6b7280]">
                Renderizado interactivo
              </span>
            </div>

            <WhatsAppPreviewCard
              templateName={templateName}
              variables={parsedVariables}
              sampleContactName={parsedContacts[0]?.name || 'Juan Pérez'}
            />

            <div className="mt-4 bg-[#fbfaf8] border border-[#dedbd3] rounded-xl p-4 text-xs text-[#555] space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
                <Info className="w-3.5 h-3.5 text-emerald-600" />
                <span>Normas de Seguridad & Entrega Oficial</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#6b7280]">
                El envío a través de WhatsApp Cloud API requiere que la plantilla esté previamente aprobada en Meta Business Manager. Las variables reemplazan {'{{1}}'}, {'{{2}}'}, etc. en el cuerpo del mensaje.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
