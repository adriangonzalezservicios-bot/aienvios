import React from 'react';
import { MessageSquare, ShieldCheck, ShieldAlert, Sparkles, Settings2, FolderKanban, PlusCircle } from 'lucide-react';
import { HealthResponse, Campaign } from '../types';

interface HeaderProps {
  health: HealthResponse | null;
  campaigns: Campaign[];
  currentCampaignId: string | null;
  onSelectCampaign: (id: string) => void;
  onNewCampaign: () => void;
  onOpenConfig: () => void;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  campaigns,
  currentCampaignId,
  onSelectCampaign,
  onNewCampaign,
  onOpenConfig,
  onOpenHistory,
}) => {
  const isConfigured = health?.whatsappConfigured;

  return (
    <header className="bg-white border-b border-[#e6e4dc] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#111827] text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-5 h-5 text-[#25D366]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#111827]">AKARI</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[#25D366]/15 text-[#1b7f43] border border-[#25D366]/30">
                WhatsApp Campaigns
              </span>
            </div>
            <p className="text-xs text-[#6b6964]">
              Despacho inteligente de plantillas con ritmo prudente y control anti-bloqueo.
            </p>
          </div>
        </div>

        {/* Right action controls & status */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Status badge */}
          <button
            onClick={onOpenConfig}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
            title="Ver detalles de conexión a WhatsApp Cloud API"
          >
            {isConfigured ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>API WhatsApp Conectada</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Modo Simulación Segura</span>
              </>
            )}
            <Settings2 className="w-3 h-3 ml-0.5 opacity-60" />
          </button>

          {/* Campaign Selector if there are campaigns */}
          {campaigns.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={currentCampaignId || ''}
                onChange={(e) => onSelectCampaign(e.target.value)}
                className="text-xs bg-[#fbfaf8] border border-[#dcd9d0] rounded-lg px-2.5 py-1.5 text-[#1f2937] font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 max-w-[200px] truncate"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>

              <button
                onClick={onOpenHistory}
                className="p-1.5 rounded-lg border border-[#dcd9d0] bg-[#fbfaf8] text-[#4b5563] hover:text-[#111827] hover:bg-white transition-colors"
                title="Historial de Campañas"
              >
                <FolderKanban className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* New Campaign CTA */}
          <button
            onClick={onNewCampaign}
            className="inline-flex items-center gap-1.5 bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#25D366]" />
            <span>Nueva Campaña</span>
          </button>
        </div>
      </div>
    </header>
  );
};
