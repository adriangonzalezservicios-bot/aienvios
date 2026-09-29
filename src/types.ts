export type ContactStatus = 'pending' | 'queued' | 'sending' | 'accepted' | 'delivered' | 'read' | 'failed';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  status: ContactStatus;
  wamid?: string;
  error?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface CampaignSettings {
  minDelayMs: number;
  maxDelayMs: number;
  batchSize: number;
  breakMs: number;
  stopOnFailureRate: number; // e.g. 0.20 for 20%
}

export type CampaignStatus = 'draft' | 'running' | 'paused' | 'stopped' | 'finished';

export type LogLevel = 'info' | 'success' | 'warn' | 'error';

export interface CampaignLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface Campaign {
  id: string;
  name: string;
  templateName: string;
  languageCode: string;
  variables: string[];
  contacts: Contact[];
  settings: CampaignSettings;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  currentIndex: number;
  currentBatchCount: number;
  lastError?: string;
  currentActionText?: string;
  logs: CampaignLog[];
}

export interface HealthResponse {
  status: string;
  whatsappConfigured: boolean;
  mode: 'live' | 'simulation';
  phoneNumberId?: string;
  apiVersion: string;
  activeCampaignsCount: number;
  timestamp: string;
}
