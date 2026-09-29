import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Download,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Send,
  CheckCheck,
  AlertOctagon,
  Terminal,
  Users,
  Copy,
  Check,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import { Campaign, Contact, ContactStatus } from '../types';

interface CampaignMonitorProps {
  campaign: Campaign;
  onStart: (id: string) => Promise<void>;
  onPause: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onRetryFailed: (id: string) => Promise<void>;
  onRefresh: (id: string) => Promise<void>;
  onTestMessage: () => void;
  isLoading: boolean;
}

export const CampaignMonitor: React.FC<CampaignMonitorProps> = ({
  campaign,
  onStart,
  onPause,
  onStop,
  onRetryFailed,
  onRefresh,
  onTestMessage,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'logs'>('contacts');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedLog, setCopiedLog] = useState(false);

  const contacts = campaign.contacts || [];

  // Metrics computation
  const stats = useMemo(() => {
    const total = contacts.length;
    const pending = contacts.filter((c) => c.status === 'pending' || c.status === 'queued').length;
    const sending = contacts.filter((c) => c.status === 'sending').length;
    const accepted = contacts.filter((c) => c.status === 'accepted').length;
    const delivered = contacts.filter((c) => c.status === 'delivered').length;
    const read = contacts.filter((c) => c.status === 'read').length;
    const failed = contacts.filter((c) => c.status === 'failed').length;
    const sentTotal = accepted + delivered + read;
    const processed = sentTotal + failed;
    const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

    return {
      total,
      pending,
      sending,
      accepted,
      delivered,
      read,
      failed,
      sentTotal,
      processed,
      percent,
    };
  }, [contacts]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Status filter
      if (statusFilter === 'pending' && c.status !== 'pending' && c.status !== 'queued') return false;
      if (statusFilter === 'sent' && !['accepted', 'delivered', 'read'].includes(c.status)) return false;
      if (statusFilter === 'delivered' && !['delivered', 'read'].includes(c.status)) return false;
      if (statusFilter === 'read' && c.status !== 'read') return false;
      if (statusFilter === 'failed' && c.status !== 'failed') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.includes(q);
        const matchesWamid = c.wamid?.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesWamid;
      }
      return true;
    });
  }, [contacts, statusFilter, searchQuery]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'Nombre', 'Telefono', 'Estado', 'WAMID', 'Fecha_Envio', 'Error'];
    const rows = contacts.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      c.status,
      c.wamid || '',
      c.sentAt || '',
      `"${(c.error || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `campaña_${campaign.name.replace(/\s+/g, '_')}_resultados.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLogs = () => {
    const text = campaign.logs.map((l) => `${l.timestamp} [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  // Status visual badge helper
  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            En Ejecución
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Pause className="w-3 h-3" />
            En Pausa
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-800 border border-gray-300">
            <Square className="w-3 h-3" />
            Detenida
          </span>
        );
      case 'finished':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <CheckCircle className="w-3 h-3" />
            Finalizada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#f3f1ec] text-[#4b5563] border border-[#dcd9d0]">
            Borrador
          </span>
        );
    }
  };

  const getContactStatusBadge = (status: ContactStatus) => {
    switch (status) {
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            Enviando...
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Send className="w-2.5 h-2.5" />
            Aceptado
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCheck className="w-2.5 h-2.5 text-teal-600" />
            Entregado
          </span>
        );
      case 'read':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-300">
            <CheckCheck className="w-2.5 h-2.5 text-sky-500" />
            Leído
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            <AlertOctagon className="w-2.5 h-2.5 text-red-600" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#faf9f6] text-[#6b7280] border border-[#e5e3dc]">
            <Clock className="w-2.5 h-2.5" />
            Pendiente
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-white border border-[#dedbd3] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#f0eee9]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-extrabold text-[#111827] tracking-tight">
                {campaign.name}
              </h2>
              {getStatusBadge(campaign.status)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6b7280]">
              <span>
                Plantilla: <strong className="text-[#111827] font-mono">{campaign.templateName}</strong> ({campaign.languageCode})
              </span>
              <span>•</span>
              <span>
                Ritmo: <strong className="text-[#111827]">{Math.round(campaign.settings.minDelayMs / 1000)}s - {Math.round(campaign.settings.maxDelayMs / 1000)}s</strong> / bloque de {campaign.settings.batchSize}
              </span>
              <span>•</span>
              <span>
                Creada: {new Date(campaign.createdAt).toLocaleDateString('es-AR')}
              </span>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {campaign.status !== 'running' ? (
              <button
                onClick={() => onStart(campaign.id)}
                disabled={isLoading || stats.pending === 0}
                className="bg-[#111827] hover:bg-[#1f2937] disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                <span>{campaign.status === 'paused' ? 'Reanudar' : 'Iniciar Campaña'}</span>
              </button>
            ) : (
              <button
                onClick={() => onPause(campaign.id)}
                disabled={isLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar</span>
              </button>
            )}

            <button
              onClick={() => onStop(campaign.id)}
              disabled={isLoading || ['stopped', 'finished', 'draft'].includes(campaign.status)}
              className="bg-white hover:bg-red-50 text-red-700 border border-red-200 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Detener</span>
            </button>

            {stats.failed > 0 && (
              <button
                onClick={() => onRetryFailed(campaign.id)}
                disabled={isLoading || campaign.status === 'running'}
                className="bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                <span>Reintentar Fallidos ({stats.failed})</span>
              </button>
            )}

            <button
              onClick={handleExportCsv}
              className="bg-white hover:bg-[#faf9f6] text-[#374151] border border-[#dedbd3] font-semibold text-xs px-3 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Exportar resultados a CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => onRefresh(campaign.id)}
              className="p-2.5 bg-white hover:bg-[#faf9f6] text-[#374151] border border-[#dedbd3] rounded-xl transition cursor-pointer"
              title="Actualizar estado"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Progress & Action Notification Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#111827] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#25D366] inline-block animate-ping"></span>
              {campaign.currentActionText || (campaign.status === 'draft' ? 'Lista para iniciar.' : 'En espera.')}
            </span>
            <span className="font-mono text-xs font-bold text-[#4b5563]">
              {stats.processed} / {stats.total} procesados ({stats.percent}%)
            </span>
          </div>

          <div className="w-full bg-[#eae7df] h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                campaign.status === 'running'
                  ? 'bg-gradient-to-r from-emerald-500 to-[#25D366]'
                  : campaign.status === 'finished'
                  ? 'bg-blue-600'
                  : campaign.status === 'paused'
                  ? 'bg-amber-500'
                  : 'bg-gray-400'
              }`}
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>

        {/* 5 Core Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          <div className="bg-[#faf9f6] border border-[#dedbd3] rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-[#6b7280] flex items-center justify-between">
              <span>Pendientes</span>
              <Clock className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="text-2xl font-black text-[#111827] mt-1 font-mono">{stats.pending}</div>
          </div>

          <div className="bg-[#faf9f6] border border-[#dedbd3] rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-emerald-800 flex items-center justify-between">
              <span>Aceptados</span>
              <Send className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">{stats.accepted}</div>
          </div>

          <div className="bg-[#faf9f6] border border-[#dedbd3] rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-teal-800 flex items-center justify-between">
              <span>Entregados</span>
              <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-teal-700 mt-1 font-mono">{stats.delivered}</div>
          </div>

          <div className="bg-[#faf9f6] border border-[#dedbd3] rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-sky-800 flex items-center justify-between">
              <span>Leídos</span>
              <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="text-2xl font-black text-sky-700 mt-1 font-mono">{stats.read}</div>
          </div>

          <div className="bg-[#faf9f6] border border-[#dedbd3] rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-red-800 flex items-center justify-between">
              <span>Errores</span>
              <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="text-2xl font-black text-red-600 mt-1 font-mono">{stats.failed}</div>
          </div>
        </div>

        {/* Last Error Notice if any */}
        {campaign.lastError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold">Último error registrado por el despachador:</div>
              <div className="font-mono text-[11px] break-all">{campaign.lastError}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs: Contactos vs Registro de Actividad */}
      <div className="bg-white border border-[#dedbd3] rounded-2xl overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#f0eee9] flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'contacts'
                  ? 'bg-[#111827] text-white'
                  : 'bg-[#faf9f6] text-[#4b5563] hover:text-[#111827] border border-[#dedbd3]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contactos ({contacts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-[#111827] text-white'
                  : 'bg-[#faf9f6] text-[#4b5563] hover:text-[#111827] border border-[#dedbd3]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Actividad en Vivo ({campaign.logs.length})</span>
            </button>
          </div>

          {activeTab === 'contacts' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-[#faf9f6] p-1 rounded-lg border border-[#dedbd3] text-xs">
                {['all', 'pending', 'sent', 'read', 'failed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md capitalize text-[11px] font-semibold transition cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white text-[#111827] shadow-xs'
                        : 'text-[#6b7280] hover:text-[#111827]'
                    }`}
                  >
                    {st === 'all'
                      ? 'Todos'
                      : st === 'pending'
                      ? 'Pendientes'
                      : st === 'sent'
                      ? 'Enviados'
                      : st === 'read'
                      ? 'Leídos'
                      : 'Fallidos'}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar nombre o teléfono..."
                  className="pl-8 pr-3 py-1 text-xs border border-[#dedbd3] rounded-lg bg-[#faf9f6] focus:bg-white focus:ring-2 focus:ring-[#25D366] outline-hidden w-48"
                />
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1.5 text-xs text-[#374151] hover:text-[#111827] bg-[#faf9f6] border border-[#dedbd3] px-3 py-1 rounded-lg transition"
            >
              {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLog ? 'Copiado' : 'Copiar Logs'}</span>
            </button>
          )}
        </div>

        {/* Tab 1: Contacts Table */}
        {activeTab === 'contacts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#faf9f6] border-b border-[#dedbd3] text-[#4b5563] font-bold">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">WAMID (Meta ID)</th>
                  <th className="py-3 px-4">Detalle / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eee9]">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                      No se encontraron contactos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact, idx) => (
                    <tr key={contact.id} className="hover:bg-[#fbfaf8] transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[#9ca3af]">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#111827]">{contact.name}</td>
                      <td className="py-2.5 px-4 font-mono text-[#374151]">{contact.phone}</td>
                      <td className="py-2.5 px-4">{getContactStatusBadge(contact.status)}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#6b7280]">
                        {contact.wamid ? (
                          <span className="bg-[#f0eee9] px-2 py-0.5 rounded text-[#374151] truncate max-w-[180px] inline-block" title={contact.wamid}>
                            {contact.wamid}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {contact.error ? (
                          <span className="text-red-700 font-medium">{contact.error}</span>
                        ) : contact.readAt ? (
                          <span className="text-sky-700">Leído {new Date(contact.readAt).toLocaleTimeString('es-AR')}</span>
                        ) : contact.deliveredAt ? (
                          <span className="text-teal-700">Entregado {new Date(contact.deliveredAt).toLocaleTimeString('es-AR')}</span>
                        ) : contact.sentAt ? (
                          <span className="text-emerald-700">Despachado {new Date(contact.sentAt).toLocaleTimeString('es-AR')}</span>
                        ) : (
                          <span className="text-gray-400">En espera</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Live Activity Logs Terminal */}
        {activeTab === 'logs' && (
          <div className="bg-[#111827] text-[#e5e7eb] p-4 font-mono text-xs max-h-96 overflow-y-auto space-y-1.5 selection:bg-emerald-800">
            {campaign.logs.length === 0 ? (
              <div className="text-gray-500 italic py-4 text-center">No hay registros de actividad aún.</div>
            ) : (
              campaign.logs.map((log) => (
                <div key={log.id} className="leading-relaxed flex items-start gap-2.5">
                  <span className="text-gray-500 select-none shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`font-bold uppercase text-[10px] px-1 rounded select-none shrink-0 ${
                      log.level === 'success'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : log.level === 'error'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : log.level === 'warn'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span
                    className={`${
                      log.level === 'error'
                        ? 'text-red-300'
                        : log.level === 'success'
                        ? 'text-emerald-300'
                        : log.level === 'warn'
                        ? 'text-amber-200'
                        : 'text-gray-200'
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
