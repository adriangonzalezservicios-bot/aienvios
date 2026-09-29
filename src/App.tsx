import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { CampaignForm } from './components/CampaignForm';
import { CampaignMonitor } from './components/CampaignMonitor';
import { TestMessageModal } from './components/TestMessageModal';
import { ApiConfigModal } from './components/ApiConfigModal';
import { CampaignHistoryModal } from './components/CampaignHistoryModal';
import { Campaign, HealthResponse } from './types';
import { PlusCircle, BarChart3, AlertTriangle, ShieldCheck, Sparkles, MessageSquare } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'monitor' | 'create'>('monitor');
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Modals state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Test modal parameters
  const [testTemplateData, setTestTemplateData] = useState<{
    templateName: string;
    languageCode: string;
    variables: string[];
  }>({
    templateName: 'akari_lista_precios',
    languageCode: 'es_AR',
    variables: ['{{nombre}}', 'https://akari.com/lista-precios'],
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // Current active campaign
  const currentCampaign = campaigns.find((c) => c.id === currentCampaignId) || campaigns[0] || null;

  // 1. Fetch Health
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.warn('Health check unreachable:', err);
    }
  }, []);

  // 2. Fetch All Campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data: Campaign[] = await res.json();
        setCampaigns(data);
        if (data.length > 0 && !currentCampaignId) {
          setCurrentCampaignId(data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
    }
  }, [currentCampaignId]);

  // Initial load
  useEffect(() => {
    checkHealth();
    fetchCampaigns();
  }, [checkHealth, fetchCampaigns]);

  // Real-Time SSE Listener for active campaign
  useEffect(() => {
    if (!currentCampaign?.id) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/campaigns/${currentCampaign.id}/events`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const updatedCampaign: Campaign = JSON.parse(event.data);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === updatedCampaign.id ? updatedCampaign : c))
        );
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };

    es.onerror = () => {
      // Browser will auto-reconnect SSE
    };

    return () => {
      es.close();
    };
  }, [currentCampaign?.id]);

  // Actions
  const handleCreateCampaign = async (data: {
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
  }) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const newCamp = await res.json();
      if (!res.ok) {
        throw new Error(newCamp.error || 'Fallo al crear la campaña.');
      }

      setCampaigns((prev) => [newCamp, ...prev]);
      setCurrentCampaignId(newCamp.id);
      setViewMode('monitor');
    } catch (err: any) {
      setGlobalError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCampaign = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/start`, { method: 'POST' });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseCampaign = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopCampaign = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/stop`, { method: 'POST' });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryFailed = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/retry-failed`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.campaign) {
        setCampaigns((prev) => prev.map((c) => (c.id === id ? data.campaign : c)));
      }
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshCampaign = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (res.ok) {
        const updated = await res.json();
        setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      setCampaigns((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (currentCampaignId === id) {
          setCurrentCampaignId(filtered[0]?.id || null);
          if (filtered.length === 0) setViewMode('create');
        }
        return filtered;
      });
    } catch (err: any) {
      setGlobalError(err.message);
    }
  };

  const handleSendTestMessage = async (phone: string, name: string) => {
    if (!currentCampaign) {
      throw new Error('No hay una campaña seleccionada.');
    }

    const res = await fetch(`/api/campaigns/${currentCampaign.id}/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testPhone: phone, testName: name }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al despachar mensaje de prueba.');
    }
    return data;
  };

  const handleOpenTestModal = (templateName: string, languageCode: string, variables: string[]) => {
    setTestTemplateData({ templateName, languageCode, variables });
    setIsTestModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex flex-col text-[#191918]">
      {/* Top Application Header */}
      <Header
        health={health}
        campaigns={campaigns}
        currentCampaignId={currentCampaignId}
        onSelectCampaign={(id) => {
          setCurrentCampaignId(id);
          setViewMode('monitor');
        }}
        onNewCampaign={() => setViewMode('create')}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Global Error Notice if any */}
        {globalError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{globalError}</span>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-red-600 hover:text-red-900 font-bold ml-4 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* View Switcher Bar (Tabs) */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#dedbd3] shadow-xs">
            <button
              onClick={() => setViewMode('monitor')}
              disabled={!currentCampaign}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                viewMode === 'monitor'
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'text-[#4b5563] hover:text-[#111827]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Monitor de Campaña</span>
            </button>

            <button
              onClick={() => setViewMode('create')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'create'
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'text-[#4b5563] hover:text-[#111827]'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#25D366]" />
              <span>Nueva Campaña</span>
            </button>
          </div>

          {currentCampaign && viewMode === 'monitor' && (
            <button
              onClick={() =>
                handleOpenTestModal(
                  currentCampaign.templateName,
                  currentCampaign.languageCode,
                  currentCampaign.variables
                )
              }
              className="bg-white hover:bg-[#faf9f6] text-[#374151] border border-[#dedbd3] font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Test rápido (1 mensaje)</span>
            </button>
          )}
        </div>

        {/* View Content */}
        {viewMode === 'create' || !currentCampaign ? (
          <CampaignForm
            onCreateCampaign={handleCreateCampaign}
            onOpenTestModal={handleOpenTestModal}
            isLoading={isLoading}
          />
        ) : (
          <CampaignMonitor
            campaign={currentCampaign}
            onStart={handleStartCampaign}
            onPause={handlePauseCampaign}
            onStop={handleStopCampaign}
            onRetryFailed={handleRetryFailed}
            onRefresh={handleRefreshCampaign}
            onTestMessage={() =>
              handleOpenTestModal(
                currentCampaign.templateName,
                currentCampaign.languageCode,
                currentCampaign.variables
              )
            }
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e6e4dc] bg-white py-4 mt-12 text-center text-xs text-[#6b6964]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#111827]">AKARI</span>
            <span>·</span>
            <span>WhatsApp Cloud API Campaign Dispatcher</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Graph API v21.0 Compliant</span>
            <span>•</span>
            <span>Algoritmo de Ritmo Prudente Anti-Ban</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TestMessageModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        templateName={testTemplateData.templateName}
        languageCode={testTemplateData.languageCode}
        variables={testTemplateData.variables}
        campaignId={currentCampaign?.id}
        onSendTest={handleSendTestMessage}
      />

      <ApiConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        health={health}
      />

      <CampaignHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        campaigns={campaigns}
        currentCampaignId={currentCampaignId}
        onSelectCampaign={(id) => {
          setCurrentCampaignId(id);
          setViewMode('monitor');
        }}
        onDeleteCampaign={handleDeleteCampaign}
      />
    </div>
  );
}
