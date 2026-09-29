import React from 'react';
import { CheckCheck, MessageSquare, Phone, MoreVertical } from 'lucide-react';

interface WhatsAppPreviewCardProps {
  templateName: string;
  variables: string[];
  sampleContactName?: string;
}

export const WhatsAppPreviewCard: React.FC<WhatsAppPreviewCardProps> = ({
  templateName,
  variables,
  sampleContactName = 'Juan Pérez',
}) => {
  const currentTime = new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-[#efeae2] rounded-xl border border-[#d3ccbf] overflow-hidden shadow-xs flex flex-col">
      {/* WhatsApp simulated chat header */}
      <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#128c7e] flex items-center justify-center text-white font-bold text-xs">
            AK
          </div>
          <div>
            <div className="text-xs font-semibold leading-tight">AKARI Oficial (Cuenta Comercial)</div>
            <div className="text-[10px] text-emerald-100 flex items-center gap-1">
              <span>WhatsApp Cloud API</span> · <span>Plantilla: {templateName || 'plantilla_default'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <Phone className="w-3.5 h-3.5" />
          <MoreVertical className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Chat canvas */}
      <div className="p-4 flex flex-col gap-2 min-h-[160px] bg-[radial-gradient(#dcd4c3_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="self-center bg-[#fff]/80 border border-[#ded8cc] text-[#54656f] text-[10px] px-2 py-0.5 rounded-md font-medium shadow-xs">
          Mensaje de Plantilla Oficial
        </div>

        {/* Message bubble */}
        <div className="self-start max-w-[92%] bg-[#ffffff] rounded-lg rounded-tl-none p-3 shadow-xs border border-[#e2ddd3] text-[#111b21] relative">
          <div className="text-xs space-y-2 leading-relaxed">
            {variables.length === 0 ? (
              <p className="text-gray-400 italic text-xs">
                Escribe las variables del cuerpo abajo para ver la previsualización en tiempo real...
              </p>
            ) : (
              variables.map((variable, idx) => {
                const replaced = variable.replace(/\{\{\s*nombre\s*\}\}/gi, sampleContactName);
                const isUrl = variable.startsWith('http://') || variable.startsWith('https://');

                if (isUrl) {
                  return (
                    <div key={idx} className="pt-1">
                      <a
                        href={replaced}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 underline break-all text-xs font-medium hover:text-emerald-800 flex items-center gap-1"
                      >
                        🔗 {replaced}
                      </a>
                    </div>
                  );
                }

                return (
                  <p key={idx} className="whitespace-pre-line text-xs font-normal">
                    {replaced}
                  </p>
                );
              })
            )}
          </div>

          {/* Time and read ticks */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#667781]">
            <span>{currentTime}</span>
            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
          </div>
        </div>
      </div>
    </div>
  );
};
