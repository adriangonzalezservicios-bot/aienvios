import React from 'react';
import { X, FolderKanban, Trash2, ArrowRight, CheckCircle2, Clock, Play, AlertOctagon } from 'lucide-react';
import { Campaign } from '../types';

interface CampaignHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: Campaign[];
  currentCampaignId: string | null;
  onSelectCampaign: (id: string) => void;
  onDeleteCampaign: (id: string) => Promise<void>;
}

export const CampaignHistoryModal: React.FC<CampaignHistoryModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  currentCampaignId,
  onSelectCampaign,
  onDeleteCampaign,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#dedbd3] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0eee9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-[#111827] flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#111827]">Historial de Campañas</h3>
              <p className="text-xs text-[#6b7280]">Selecciona o administra tus campañas guardadas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-12 text-center text-gray-400 italic text-xs">
            No hay campañas guardadas en el sistema.
          </div>
        ) : (
          <div className="space-y-2.5">
            {campaigns.map((camp) => {
              const isCurrent = camp.id === currentCampaignId;
              const total = camp.contacts?.length || 0;
              const sent = camp.contacts?.filter((c) => ['accepted', 'delivered', 'read'].includes(c.status)).length || 0;
              const failed = camp.contacts?.filter((c) => c.status === 'failed').length || 0;

              return (
                <div
                  key={camp.id}
                  className={`border rounded-xl p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                      : 'border-[#dedbd3] bg-[#faf9f6] hover:bg-[#f4f2ed]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-[#111827]">{camp.name}</h4>
                      {isCurrent && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                          Activa
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-[#6b7280]">
                      <span>Plantilla: <strong className="text-[#111827] font-mono">{camp.templateName}</strong></span>
                      <span>•</span>
                      <span>Total: <strong className="text-[#111827]">{total} contactos</strong></span>
                      <span>•</span>
                      <span>Enviados: <strong className="text-emerald-700">{sent}</strong></span>
                      {failed > 0 && (
                        <>
                          <span>•</span>
                          <span>Errores: <strong className="text-red-600">{failed}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        onSelectCampaign(camp.id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      <span>Abrir</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => onDeleteCampaign(camp.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar campaña"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
