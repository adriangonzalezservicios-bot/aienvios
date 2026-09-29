import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Key,
  FileText,
  Users,
  Clock,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  Zap,
  Phone,
  Check,
  Copy,
  AlertCircle
} from 'lucide-react';
import { WhatsAppPreviewCard } from './WhatsAppPreviewCard';

interface SetupWizardProps {
  onComplete: (data: {
    campaignName: string;
    templateName: string;
    languageCode: string;
    variables: string[];
    contacts: Array<{ name: string; phone: string }>;
    credentials?: {
      phoneNumberId: string;
      token: string;
    };
    settings: {
      minDelayMs: number;
      maxDelayMs: number;
      batchSize: number;
      breakMs: number;
      stopOnFailureRate: number;
    };
  }) => Promise<void>;
  onCancel: () => void;
  initialPhoneNumberId?: string;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  onComplete,
  onCancel,
  initialPhoneNumberId = '1256380654232561',
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  // Step 1: Credenciales Meta WhatsApp
  const [phoneNumberId, setPhoneNumberId] = useState(initialPhoneNumberId);
  const [token, setToken] = useState('');
  const [useSimulationMode, setUseSimulationMode] = useState(false);

  // Step 2: Plantilla Meta
  const [campaignName, setCampaignName] = useState('Campaña Lista de Precios');
  const [templateName, setTemplateName] = useState('whatsapp_list');
  const [languageCode, setLanguageCode] = useState('es_AR');
  const [hasNameVariable, setHasNameVariable] = useState(true);
  const [variable2, setVariable2] = useState('');
  const [variable3, setVariable3] = useState('');

  // Step 3: Contactos
  const [contactsRaw, setContactsRaw] = useState(
    'Juan Pérez, 5491112345678\nMaría López, 5491198765432\nCarlos Gómez, 5491165432109'
  );

  // Step 4: Ritmo de Envío
  const [rhythmMode, setRhythmMode] = useState<'recommended' | 'cautious' | 'snappy'>('recommended');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse Contacts
  const parsedContacts = contactsRaw
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

  // Build variables array
  const computedVariables: string[] = [];
  if (hasNameVariable) computedVariables.push('{{nombre}}');
  if (variable2.trim()) computedVariables.push(variable2.trim());
  if (variable3.trim()) computedVariables.push(variable3.trim());

  const handleFinish = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Compute rhythm settings based on profile
    let settings = {
      minDelayMs: 30000,
      maxDelayMs: 75000,
      batchSize: 5,
      breakMs: 600000,
      stopOnFailureRate: 0.2,
    };

    if (rhythmMode === 'cautious') {
      settings = {
        minDelayMs: 60000,
        maxDelayMs: 120000,
        batchSize: 4,
        breakMs: 900000,
        stopOnFailureRate: 0.15,
      };
    } else if (rhythmMode === 'snappy') {
      settings = {
        minDelayMs: 8000,
        maxDelayMs: 20000,
        batchSize: 10,
        breakMs: 60000,
        stopOnFailureRate: 0.25,
      };
    }

    try {
      await onComplete({
        campaignName: campaignName.trim() || 'Mi Campaña de WhatsApp',
        templateName: templateName.trim(),
        languageCode,
        variables: computedVariables,
        contacts: parsedContacts,
        credentials:
          !useSimulationMode && phoneNumberId.trim()
            ? {
                phoneNumberId: phoneNumberId.trim(),
                token: token.trim(),
              }
            : undefined,
        settings,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al completar el asistente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-[#dedbd3] rounded-3xl p-6 md:p-8 shadow-xl max-w-4xl mx-auto space-y-6">
      {/* Header with step progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#111827]">
                Asistente Guiado Paso a Paso
              </h2>
              <p className="text-xs text-[#6b7280]">
                Te guiamos para configurar tus credenciales, plantilla y lista de contactos fácilmente.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-xs text-[#6b7280] hover:text-[#111827] px-3 py-1.5 rounded-lg border border-[#e5e3dc] hover:bg-[#faf9f6] transition cursor-pointer"
          >
            Volver a vista normal
          </button>
        </div>

        {/* Steps indicator bar */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[
            { step: 1, label: '1. Conexión Meta', icon: Key },
            { step: 2, label: '2. Plantilla', icon: FileText },
            { step: 3, label: '3. Contactos', icon: Users },
            { step: 4, label: '4. Ritmo y Listo', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div
                key={item.step}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  isCurrent
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 shadow-xs'
                    : isDone
                    ? 'border-[#dcd9d0] bg-[#faf9f6] text-[#374151]'
                    : 'border-[#eae7df] bg-white text-[#9ca3af]'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] shrink-0 font-bold ${
                    isCurrent
                      ? 'bg-emerald-600 text-white'
                      : isDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : item.step}
                </div>
                <span className="hidden sm:inline truncate">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: CONEXIÓN META */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-[#faf9f6] border border-[#dedbd3] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#111827] flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <span>Paso 1: Identificador de WhatsApp & Token</span>
              </h3>
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 underline"
              >
                <span>Abrir Meta Developers</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-[#555] leading-relaxed">
              Ya hemos detectado tu identificador de teléfono en Meta. Puedes pegarlo aquí o activar el modo simulación para hacer una prueba completa primero sin costo.
            </p>

            <div className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Identificador de número de teléfono (Phone Number ID)
                </label>
                <input
                  type="text"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="ej. 1256380654232561"
                  className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Sugerido de tu pantalla: <strong>1256380654232561</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhoneNumberId('1256380654232561')}
                    className="text-[11px] text-emerald-700 hover:underline font-bold"
                  >
                    Usar este
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Token de acceso de Meta (WHATSAPP_TOKEN)
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Pega aquí el token que comienza con EAA... (o déjalo vacío para simular)"
                  className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                />
                <p className="text-[11px] text-[#6b7280] mt-1">
                  En Meta Developers &gt; Tu App &gt; WhatsApp &gt; Configuración de la API &gt; Token de acceso temporal.
                </p>
              </div>

              {/* Simulation Mode Toggle Card */}
              <div className="pt-2 border-t border-[#f0eee9]">
                <label className="flex items-start gap-3 p-3 bg-white border border-[#dedbd3] rounded-xl cursor-pointer hover:bg-[#faf9f6] transition">
                  <input
                    type="checkbox"
                    checked={useSimulationMode}
                    onChange={(e) => setUseSimulationMode(e.target.checked)}
                    className="mt-0.5 accent-emerald-600 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#111827]">
                      Probar primero en Modo Simulación Segura (Sin Token aún)
                    </span>
                    <p className="text-[#6b7280] text-[11px] mt-0.5">
                      Podrás ver toda la campaña corriendo, simulación de entregas, lecturas y cálculo de tiempos reales sin arriesgar tu número.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PLANTILLA META */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#faf9f6] border border-[#dedbd3] rounded-2xl p-4 sm:p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#111827] flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Paso 2: Datos de tu Plantilla en Meta</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Nombre de la Campaña (Interno)
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="ej. Campaña Lista de Precios"
                  className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2 text-xs text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Nombre exacto de la plantilla
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="ej. whatsapp_list"
                    className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Detectada: <strong>whatsapp_list</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setTemplateName('whatsapp_list')}
                      className="text-[11px] text-emerald-700 hover:underline font-bold"
                    >
                      Usar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Idioma
                  </label>
                  <select
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    className="w-full bg-white border border-[#dedbd3] rounded-xl px-3.5 py-2 text-xs text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                  >
                    <option value="es_AR">Español (Argentina) - es_AR</option>
                    <option value="es_ES">Español (España) - es_ES</option>
                    <option value="es_MX">Español (México) - es_MX</option>
                    <option value="en_US">Inglés (EE. UU.) - en_US</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-[#f0eee9] space-y-2.5">
                <span className="block text-xs font-bold text-[#111827]">
                  Variables del Mensaje (Parámetros)
                </span>

                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasNameVariable}
                    onChange={(e) => setHasNameVariable(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span className="font-semibold text-[#374151]">
                    Variable 1: Personalizar con el nombre del cliente <code className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{'{{nombre}}'}</code>
                  </span>
                </label>

                <div>
                  <label className="block text-[11px] font-medium text-[#6b7280] mb-1">
                    Variable 2 (Opcional, ej: enlace a lista o aviso)
                  </label>
                  <input
                    type="text"
                    value={variable2}
                    onChange={(e) => setVariable2(e.target.value)}
                    placeholder="ej. https://akari.com/lista-precios"
                    className="w-full bg-white border border-[#dedbd3] rounded-xl px-3 py-1.5 text-xs text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#6b7280] mb-1">
                    Variable 3 (Opcional, ej: nuevo número de WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={variable3}
                    onChange={(e) => setVariable3(e.target.value)}
                    placeholder="ej. https://wa.me/5491128952406"
                    className="w-full bg-white border border-[#dedbd3] rounded-xl px-3 py-1.5 text-xs text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4b5563]">
              Previsualización en WhatsApp
            </span>
            <WhatsAppPreviewCard
              templateName={templateName}
              variables={computedVariables}
              sampleContactName="Juan Pérez"
            />
          </div>
        </div>
      )}

      {/* STEP 3: CONTACTOS */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-[#faf9f6] border border-[#dedbd3] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#111827] flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Paso 3: Destinatarios de la Campaña</span>
              </h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {parsedContacts.length} contactos válidos
              </span>
            </div>

            <p className="text-xs text-[#555]">
              Pega la lista de tus contactos en formato <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#dedbd3]">Nombre, Teléfono con código de país</code>.
            </p>

            <textarea
              value={contactsRaw}
              onChange={(e) => setContactsRaw(e.target.value)}
              placeholder="Juan Pérez, 5491112345678&#10;María López, 5491198765432"
              rows={6}
              className="w-full bg-white border border-[#dedbd3] rounded-xl p-3.5 text-xs font-mono text-[#111827] focus:ring-2 focus:ring-[#25D366] outline-hidden leading-relaxed resize-y"
            />

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setContactsRaw(
                      'Juan Pérez, 5491112345678\nMaría López, 5491198765432\nCarlos Gómez, 5491165432109\nSofía Martínez, 5491144332211\nLucía Fernández, 5491155667788'
                    )
                  }
                  className="px-3 py-1.5 bg-white border border-[#dedbd3] hover:bg-[#f0eee9] rounded-lg font-medium text-[#374151] transition"
                >
                  Cargar lista de ejemplo (5 contactos)
                </button>
                <button
                  type="button"
                  onClick={() => setContactsRaw('')}
                  className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg font-medium transition"
                >
                  Limpiar
                </button>
              </div>
              <span className="text-[11px] text-[#6b7280]">
                Código de país para Argentina: <strong>54911...</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: RITMO Y CONFIRMACIÓN */}
      {currentStep === 4 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-[#faf9f6] border border-[#dedbd3] rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="font-bold text-sm text-[#111827] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Paso 4: Elige el Ritmo de Envío (Protección Anti-Ban)</span>
            </h3>

            <p className="text-xs text-[#555]">
              Elige cómo deseas que el despachador dosifique los envíos para cuidar la reputación de tu línea comercial en Meta:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'recommended' as const,
                  title: 'Prudente (Recomendado)',
                  desc: '30s a 75s entre mensajes. Bloques de 5 envíos con 10 min de descanso.',
                  badge: 'Equilibrado y Seguro',
                  badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                },
                {
                  id: 'cautious' as const,
                  title: 'Ultra Cauteloso',
                  desc: '60s a 120s entre mensajes. Bloques de 4 con 15 min de descanso.',
                  badge: 'Para cuentas nuevas',
                  badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
                },
                {
                  id: 'snappy' as const,
                  title: 'Rápido / Pruebas',
                  desc: '8s a 20s entre mensajes. Ideal para pruebas y números de test verificados.',
                  badge: 'Mayor velocidad',
                  badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
                },
              ].map((prof) => (
                <div
                  key={prof.id}
                  onClick={() => setRhythmMode(prof.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between gap-3 ${
                    rhythmMode === prof.id
                      ? 'border-emerald-600 bg-white shadow-md'
                      : 'border-[#dedbd3] bg-[#faf9f6] hover:bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${prof.badgeColor}`}>
                      {prof.badge}
                    </span>
                    <h4 className="font-bold text-xs text-[#111827] mt-1.5">{prof.title}</h4>
                    <p className="text-[11px] text-[#6b7280] leading-relaxed">{prof.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className={`w-4 h-4 ${rhythmMode === prof.id ? 'opacity-100' : 'opacity-20'}`} />
                    <span>{rhythmMode === prof.id ? 'Seleccionado' : 'Elegir'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Review */}
            <div className="bg-white border border-[#dedbd3] rounded-xl p-4 space-y-2 text-xs">
              <span className="font-bold text-[#111827] block">Resumen listo para iniciar:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#4b5563]">
                <div>
                  <span className="text-[#6b7280] block">Campaña:</span>
                  <strong className="text-[#111827]">{campaignName}</strong>
                </div>
                <div>
                  <span className="text-[#6b7280] block">Plantilla:</span>
                  <strong className="text-[#111827] font-mono">{templateName}</strong>
                </div>
                <div>
                  <span className="text-[#6b7280] block">Destinatarios:</span>
                  <strong className="text-emerald-700">{parsedContacts.length} contactos</strong>
                </div>
                <div>
                  <span className="text-[#6b7280] block">Modo:</span>
                  <strong className="text-[#111827]">{token ? 'Meta WhatsApp Real' : 'Simulación'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-[#f0eee9]">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#374151] hover:text-[#111827] px-4 py-2.5 rounded-xl border border-[#dedbd3] hover:bg-[#faf9f6] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Paso Anterior</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-[#6b7280] hover:text-[#111827] px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
        )}

        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={currentStep === 2 && !templateName.trim()}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#111827] hover:bg-[#1f2937] px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
          >
            <span>Siguiente Paso</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#25D366]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={isSubmitting || parsedContacts.length === 0}
            className="flex items-center gap-2 text-xs font-bold text-white bg-[#111827] hover:bg-[#1f2937] px-6 py-2.5 rounded-xl transition cursor-pointer shadow-md"
          >
            <Zap className="w-4 h-4 text-[#25D366]" />
            <span>{isSubmitting ? 'Guardando Campaña...' : 'Crear y Abrir Campaña'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
