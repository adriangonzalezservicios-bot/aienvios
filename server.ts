import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { Campaign, CampaignLog, Contact, HealthResponse } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// In-memory persistent state & dynamic credentials
let dynamicWhatsAppToken = process.env.WHATSAPP_TOKEN?.trim() || "";
let dynamicPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "";
let dynamicApiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
let dynamicBusinessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || "";

const campaigns = new Map<string, Campaign>();
const activeDispatchers = new Map<string, { timer?: NodeJS.Timeout; isRunning: boolean; abortController: AbortController }>();
const sseClients = new Map<string, Set<Response>>();

// WhatsApp Meta Cloud API config
const getWhatsAppConfig = () => {
  const token = dynamicWhatsAppToken;
  const phoneNumberId = dynamicPhoneNumberId;
  const apiVersion = dynamicApiVersion;
  const businessAccountId = dynamicBusinessAccountId;
  const isConfigured = Boolean(token && phoneNumberId);

  return {
    token,
    phoneNumberId,
    apiVersion,
    businessAccountId,
    isConfigured,
    mode: isConfigured ? ("live" as const) : ("simulation" as const),
  };
};

function addLog(campaign: Campaign, level: CampaignLog["level"], message: string) {
  const logItem: CampaignLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    level,
    message,
  };
  campaign.logs.unshift(logItem);
  if (campaign.logs.length > 300) {
    campaign.logs = campaign.logs.slice(0, 300);
  }
  broadcastCampaignUpdate(campaign.id);
}

function broadcastCampaignUpdate(campaignId: string) {
  const campaign = campaigns.get(campaignId);
  if (!campaign) return;
  const clients = sseClients.get(campaignId);
  if (clients && clients.size > 0) {
    const payload = `data: ${JSON.stringify(campaign)}\n\n`;
    for (const client of clients) {
      try {
        client.write(payload);
      } catch (err) {
        // connection closed
      }
    }
  }
}

// Meta WhatsApp Cloud API send function
async function sendWhatsAppTemplateMessage(
  recipientPhone: string,
  templateName: string,
  languageCode: string,
  contactName: string,
  variables: string[]
): Promise<{ wamid: string }> {
  const config = getWhatsAppConfig();

  // Clean phone number (digits only, ensure country code)
  const cleanPhone = recipientPhone.replace(/[^\d]/g, "");

  if (config.mode === "simulation") {
    // High-fidelity simulation mode
    // Simulates realistic network delay (400ms - 900ms)
    await new Promise((res) => setTimeout(res, 400 + Math.random() * 500));
    
    // Simulate rare random failure if number looks malformed
    if (cleanPhone.length < 8) {
      throw new Error(`Número de teléfono inválido (${recipientPhone}). Debe incluir código de país.`);
    }

    const fakeWamid = `wamid.HBgL${Math.random().toString(36).substring(2, 10).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
    return { wamid: fakeWamid };
  }

  // Live Meta WhatsApp Cloud API request
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  // Build body parameters replacing {{nombre}} with contact name
  const bodyParameters = variables.map((v) => {
    let replacedText = v.replace(/\{\{\s*nombre\s*\}\}/gi, contactName || "Cliente");
    return {
      type: "text",
      text: replacedText,
    };
  });

  const body: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode || "es_AR",
      },
    },
  };

  if (bodyParameters.length > 0) {
    body.template.components = [
      {
        type: "body",
        parameters: bodyParameters,
      },
    ];
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.error?.error_user_msg || `Meta API Error (${response.status})`;
    throw new Error(errorMsg);
  }

  const wamid = data?.messages?.[0]?.id || `wamid.live_${Date.now()}`;
  return { wamid };
}

// Background Campaign Dispatcher with Anti-Ban Rhythm & Fail-Safe Breakers
async function startCampaignDispatcher(campaignId: string) {
  const campaign = campaigns.get(campaignId);
  if (!campaign) return;

  // Stop existing runner if any
  stopCampaignDispatcher(campaignId, false);

  const abortController = new AbortController();
  const dispatcherState = { isRunning: true, abortController };
  activeDispatchers.set(campaignId, dispatcherState);

  campaign.status = "running";
  campaign.startedAt = campaign.startedAt || new Date().toISOString();
  campaign.updatedAt = new Date().toISOString();
  addLog(campaign, "info", `Iniciando despacho de campaña "${campaign.name}" (${getWhatsAppConfig().mode === "live" ? "API Oficial WhatsApp" : "Modo Simulación Segura"}).`);

  // Asynchronous execution loop
  (async () => {
    while (dispatcherState.isRunning && campaign.status === "running") {
      // Find next pending contact
      const pendingContactIndex = campaign.contacts.findIndex(
        (c) => c.status === "pending" || c.status === "queued"
      );

      if (pendingContactIndex === -1) {
        // All contacts processed
        campaign.status = "finished";
        campaign.finishedAt = new Date().toISOString();
        campaign.currentActionText = "Campaña finalizada con éxito.";
        addLog(campaign, "success", `Campaña completada. Todos los contactos fueron procesados.`);
        break;
      }

      const contact = campaign.contacts[pendingContactIndex];
      campaign.currentIndex = pendingContactIndex + 1;
      contact.status = "sending";
      campaign.currentActionText = `Enviando a ${contact.name} (${contact.phone})... [${campaign.currentIndex}/${campaign.contacts.length}]`;
      broadcastCampaignUpdate(campaignId);

      try {
        const res = await sendWhatsAppTemplateMessage(
          contact.phone,
          campaign.templateName,
          campaign.languageCode,
          contact.name,
          campaign.variables
        );

        contact.status = "accepted";
        contact.wamid = res.wamid;
        contact.sentAt = new Date().toISOString();
        contact.error = undefined;
        campaign.currentBatchCount = (campaign.currentBatchCount || 0) + 1;

        addLog(campaign, "success", `Mensaje aceptado para ${contact.name} (${contact.phone}) · WAMID: ${contact.wamid}`);

        // In simulation mode, simulate realistic delivered and read status progression
        if (getWhatsAppConfig().mode === "simulation") {
          setTimeout(() => {
            const currentC = campaigns.get(campaignId);
            if (!currentC) return;
            const target = currentC.contacts.find((c) => c.id === contact.id);
            if (target && target.status === "accepted") {
              target.status = "delivered";
              target.deliveredAt = new Date().toISOString();
              broadcastCampaignUpdate(campaignId);

              // 75% read rate
              if (Math.random() < 0.75) {
                setTimeout(() => {
                  const target2 = currentC.contacts.find((c) => c.id === contact.id);
                  if (target2 && target2.status === "delivered") {
                    target2.status = "read";
                    target2.readAt = new Date().toISOString();
                    broadcastCampaignUpdate(campaignId);
                  }
                }, 1500 + Math.random() * 3500);
              }
            }
          }, 1200 + Math.random() * 2000);
        }
      } catch (err: any) {
        contact.status = "failed";
        contact.error = err.message || "Error al despachar mensaje";
        campaign.lastError = `${contact.name} (${contact.phone}): ${contact.error}`;
        addLog(campaign, "error", `Fallo al enviar a ${contact.name} (${contact.phone}): ${contact.error}`);

        // Circuit breaker: check failure rate
        const totalProcessed = campaign.contacts.filter((c) => c.status !== "pending" && c.status !== "queued").length;
        const totalFailed = campaign.contacts.filter((c) => c.status === "failed").length;
        const currentFailureRate = totalProcessed > 0 ? totalFailed / totalProcessed : 0;

        if (totalProcessed >= 3 && currentFailureRate > campaign.settings.stopOnFailureRate) {
          campaign.status = "stopped";
          campaign.currentActionText = `Detenida automáticamente: Tasa de error (${(currentFailureRate * 100).toFixed(1)}%) superó el límite de seguridad (${(campaign.settings.stopOnFailureRate * 100).toFixed(0)}%).`;
          addLog(
            campaign,
            "warn",
            `CIRCUITO DE SEGURIDAD ACTIVADO: Despacho detenido para proteger la cuenta. Tasa de fallo: ${(currentFailureRate * 100).toFixed(1)}%`
          );
          break;
        }
      }

      campaign.updatedAt = new Date().toISOString();
      broadcastCampaignUpdate(campaignId);

      // Check if there are more pending contacts
      const hasMore = campaign.contacts.some((c) => c.status === "pending" || c.status === "queued");
      if (!hasMore || !dispatcherState.isRunning || campaign.status !== "running") {
        break;
      }

      // Check if we need a batch break
      if (campaign.currentBatchCount >= campaign.settings.batchSize) {
        campaign.currentBatchCount = 0;
        const breakSeconds = Math.round(campaign.settings.breakMs / 1000);
        addLog(campaign, "info", `Pausa de lote completada (${campaign.settings.batchSize} mensajes). Descanso preventivo de ${Math.round(breakSeconds / 60)} min.`);

        let remaining = breakSeconds;
        while (remaining > 0 && dispatcherState.isRunning && campaign.status === "running") {
          campaign.currentActionText = `Descanso de lote en curso: reanudando en ${Math.floor(remaining / 60)}m ${remaining % 60}s...`;
          broadcastCampaignUpdate(campaignId);
          await new Promise((res) => setTimeout(res, 1000));
          remaining -= 1;
        }
      } else {
        // Individual message jitter delay
        const minMs = Math.max(1000, campaign.settings.minDelayMs);
        const maxMs = Math.max(minMs, campaign.settings.maxDelayMs);
        const delay = Math.floor(minMs + Math.random() * (maxMs - minMs));
        const delaySec = Math.round(delay / 1000);

        let remaining = delaySec;
        while (remaining > 0 && dispatcherState.isRunning && campaign.status === "running") {
          campaign.currentActionText = `Esperando ${remaining}s antes del próximo envío (ritmo prudente con jitter)...`;
          broadcastCampaignUpdate(campaignId);
          await new Promise((res) => setTimeout(res, 1000));
          remaining -= 1;
        }
      }
    }

    activeDispatchers.delete(campaignId);
    broadcastCampaignUpdate(campaignId);
  })();
}

function stopCampaignDispatcher(campaignId: string, markStopped = true) {
  const runner = activeDispatchers.get(campaignId);
  if (runner) {
    runner.isRunning = false;
    runner.abortController.abort();
    activeDispatchers.delete(campaignId);
  }
  const campaign = campaigns.get(campaignId);
  if (campaign && markStopped) {
    if (campaign.status === "running") {
      campaign.status = "stopped";
      campaign.currentActionText = "Campaña detenida por el usuario.";
      addLog(campaign, "warn", "Campaña detenida manualmente.");
    }
    campaign.updatedAt = new Date().toISOString();
    broadcastCampaignUpdate(campaignId);
  }
}

// Initial Demo Campaign
const demoCampaign: Campaign = {
  id: "camp_demo_akari",
  name: "Aviso cambio de número + lista de precios",
  templateName: "akari_lista_precios",
  languageCode: "es_AR",
  variables: [
    "{{nombre}}",
    "https://akari.com/lista-precios",
    "https://wa.me/5491100001111",
  ],
  contacts: [
    { id: "1", name: "Juan Pérez", phone: "+5491112345678", status: "pending" },
    { id: "2", name: "María López", phone: "+5491198765432", status: "pending" },
    { id: "3", name: "Carlos Gómez", phone: "+5491165432109", status: "pending" },
    { id: "4", name: "Sofía Martínez", phone: "+5491144332211", status: "pending" },
    { id: "5", name: "Lucía Fernández", phone: "+5491155667788", status: "pending" },
    { id: "6", name: "Diego Rossi", phone: "+5491177889900", status: "pending" },
  ],
  settings: {
    minDelayMs: 5000, // 5s for snappy testing/live
    maxDelayMs: 12000,
    batchSize: 4,
    breakMs: 30000, // 30s
    stopOnFailureRate: 0.2, // 20%
  },
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currentIndex: 0,
  currentBatchCount: 0,
  logs: [
    {
      id: "log_init",
      timestamp: new Date().toLocaleTimeString("es-AR"),
      level: "info",
      message: "Campaña de demostración inicializada lista para configurar y despachar.",
    },
  ],
};
campaigns.set(demoCampaign.id, demoCampaign);

// --- REST API ROUTES ---

// 1. Health & Meta Configuration Check
app.get("/api/health", (req: Request, res: Response) => {
  const config = getWhatsAppConfig();
  const response: HealthResponse = {
    status: "ok",
    whatsappConfigured: config.isConfigured,
    mode: config.mode,
    phoneNumberId: config.phoneNumberId ? `${config.phoneNumberId.slice(0, 4)}...${config.phoneNumberId.slice(-4)}` : undefined,
    apiVersion: config.apiVersion,
    activeCampaignsCount: Array.from(campaigns.values()).filter((c) => c.status === "running").length,
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// 1.1 Get current credentials configuration (masked token)
app.get("/api/config", (req: Request, res: Response) => {
  const config = getWhatsAppConfig();
  res.json({
    phoneNumberId: config.phoneNumberId,
    apiVersion: config.apiVersion,
    businessAccountId: config.businessAccountId,
    hasToken: Boolean(config.token),
    tokenMasked: config.token ? `${config.token.slice(0, 7)}...${config.token.slice(-6)}` : "",
    isConfigured: config.isConfigured,
    mode: config.mode,
  });
});

// 1.2 Save credentials directly from UI
app.post("/api/config", (req: Request, res: Response) => {
  const { token, phoneNumberId, apiVersion, businessAccountId } = req.body;
  if (typeof token === "string" && token.trim()) {
    dynamicWhatsAppToken = token.trim();
  }
  if (typeof phoneNumberId === "string") {
    dynamicPhoneNumberId = phoneNumberId.trim();
  }
  if (typeof apiVersion === "string" && apiVersion.trim()) {
    dynamicApiVersion = apiVersion.trim();
  }
  if (typeof businessAccountId === "string") {
    dynamicBusinessAccountId = businessAccountId.trim();
  }

  const config = getWhatsAppConfig();
  res.json({
    success: true,
    isConfigured: config.isConfigured,
    mode: config.mode,
    phoneNumberId: config.phoneNumberId,
  });
});

// 2. List all campaigns
app.get("/api/campaigns", (req: Request, res: Response) => {
  const list = Array.from(campaigns.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  res.json(list);
});

// 3. Create Campaign
app.post("/api/campaigns", (req: Request, res: Response) => {
  try {
    const { name, templateName, languageCode, variables, contacts, settings } = req.body;

    if (!name || !templateName) {
      return res.status(400).json({ error: "El nombre de la campaña y la plantilla son obligatorios." });
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: "Debe incluir al menos un contacto válido." });
    }

    const id = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const formattedContacts: Contact[] = contacts.map((c: any, index: number) => ({
      id: c.id || String(index + 1),
      name: (c.name || "Cliente").trim(),
      phone: String(c.phone || "").trim(),
      status: "pending",
    }));

    const newCampaign: Campaign = {
      id,
      name: name.trim(),
      templateName: templateName.trim(),
      languageCode: (languageCode || "es_AR").trim(),
      variables: Array.isArray(variables) ? variables : [],
      contacts: formattedContacts,
      settings: {
        minDelayMs: Number(settings?.minDelayMs) || 30000,
        maxDelayMs: Number(settings?.maxDelayMs) || 90000,
        batchSize: Number(settings?.batchSize) || 5,
        breakMs: Number(settings?.breakMs) || 600000,
        stopOnFailureRate: Number(settings?.stopOnFailureRate) || 0.2,
      },
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentIndex: 0,
      currentBatchCount: 0,
      logs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString("es-AR"),
          level: "info",
          message: `Campaña creada con ${formattedContacts.length} contactos.`,
        },
      ],
    };

    campaigns.set(id, newCampaign);
    res.status(201).json(newCampaign);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error al crear la campaña." });
  }
});

// 4. Get single campaign
app.get("/api/campaigns/:id", (req: Request, res: Response) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaña no encontrada." });
  }
  res.json(campaign);
});

// 5. Update Campaign (Settings, variables, name)
app.put("/api/campaigns/:id", (req: Request, res: Response) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaña no encontrada." });
  }

  if (campaign.status === "running") {
    return res.status(400).json({ error: "No se puede editar una campaña en ejecución. Paúsala primero." });
  }

  const { name, templateName, languageCode, variables, settings, contacts } = req.body;
  if (name) campaign.name = name;
  if (templateName) campaign.templateName = templateName;
  if (languageCode) campaign.languageCode = languageCode;
  if (variables) campaign.variables = variables;
  if (settings) campaign.settings = { ...campaign.settings, ...settings };
  if (contacts && Array.isArray(contacts)) {
    campaign.contacts = contacts;
  }
  campaign.updatedAt = new Date().toISOString();

  addLog(campaign, "info", "Configuración de campaña actualizada.");
  res.json(campaign);
});

// 6. Start Campaign
app.post("/api/campaigns/:id/start", (req: Request, res: Response) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaña no encontrada." });
  }

  if (campaign.status === "running") {
    return res.json(campaign);
  }

  startCampaignDispatcher(campaign.id);
  res.json(campaign);
});

// 7. Pause Campaign
app.post("/api/campaigns/:id/pause", (req: Request, res: Response) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaña no encontrada." });
  }

  const runner = activeDispatchers.get(campaign.id);
  if (runner) {
    runner.isRunning = false;
    activeDispatchers.delete(campaign.id);
  }

  campaign.status = "paused";
  campaign.currentActionText = "Campaña en pausa.";
  campaign.updatedAt = new Date().toISOString();
  addLog(campaign, "warn", "Campaña pausada por el usuario.");
  broadcastCampaignUpdate(campaign.id);

  res.json(campaign);
});

// 8. Stop Campaign
app.post("/api/campaigns/:id/stop", (req: Request, res: Response) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaña no encontrada." });
  }

  stopCampaignDispatcher(campaign.id, true);
  res.json(campaign);
});

// 9. Retry Failed contacts
app.post("/api/campaigns/:id/retry-failed", (req: Request, res: Response) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaña no encontrada." });
  }

  let resetCount = 0;
  for (const contact of campaign.contacts) {
    if (contact.status === "failed") {
      contact.status = "pending";
      contact.error = undefined;
      resetCount++;
    }
  }

  if (resetCount > 0) {
    campaign.lastError = undefined;
    if (campaign.status === "finished" || campaign.status === "stopped") {
      campaign.status = "draft";
    }
    addLog(campaign, "info", `Se reestablecieron ${resetCount} contactos fallidos a estado pendiente.`);
    campaign.updatedAt = new Date().toISOString();
    broadcastCampaignUpdate(campaign.id);
  }

  res.json({ campaign, resetCount });
});

// 10. Test single message dispatch
app.post("/api/campaigns/:id/test-message", async (req: Request, res: Response) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaña no encontrada." });
  }

  const { testPhone, testName } = req.body;
  if (!testPhone) {
    return res.status(400).json({ error: "Debe ingresar un número de teléfono para la prueba." });
  }

  try {
    const result = await sendWhatsAppTemplateMessage(
      testPhone,
      campaign.templateName,
      campaign.languageCode,
      testName || "Prueba",
      campaign.variables
    );

    addLog(campaign, "success", `Mensaje de prueba enviado exitosamente a ${testPhone} · WAMID: ${result.wamid}`);
    res.json({ success: true, wamid: result.wamid });
  } catch (err: any) {
    addLog(campaign, "error", `Fallo en mensaje de prueba a ${testPhone}: ${err.message}`);
    res.status(500).json({ error: err.message || "Error al enviar mensaje de prueba." });
  }
});

// 11. Delete Campaign
app.delete("/api/campaigns/:id", (req: Request, res: Response) => {
  const campaignId = req.params.id;
  stopCampaignDispatcher(campaignId, false);
  campaigns.delete(campaignId);
  res.json({ success: true });
});

// 12. Real-Time Server-Sent Events (SSE) Stream
app.get("/api/campaigns/:id/events", (req: Request, res: Response) => {
  const campaignId = req.params.id;
  const campaign = campaigns.get(campaignId);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (!sseClients.has(campaignId)) {
    sseClients.set(campaignId, new Set());
  }
  const clients = sseClients.get(campaignId)!;
  clients.add(res);

  if (campaign) {
    res.write(`data: ${JSON.stringify(campaign)}\n\n`);
  }

  req.on("close", () => {
    clients.delete(res);
  });
});

// 13. Meta WhatsApp Webhook Endpoint (For live receipt status updates)
app.get("/api/webhook", (req: Request, res: Response) => {
  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || "akari_verify_token_secure";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post("/api/webhook", (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0]?.value;
      const statuses = changes?.statuses;

      if (Array.isArray(statuses)) {
        for (const statusObj of statuses) {
          const wamid = statusObj.id;
          const status = statusObj.status; // "sent", "delivered", "read", "failed"
          const recipientId = statusObj.recipient_id;

          // Find contact across all campaigns
          for (const [campId, campaign] of campaigns.entries()) {
            const contact = campaign.contacts.find(
              (c) => c.wamid === wamid || c.phone.replace(/[^\d]/g, "") === recipientId?.replace(/[^\d]/g, "")
            );

            if (contact) {
              if (status === "delivered") {
                contact.status = "delivered";
                contact.deliveredAt = new Date().toISOString();
              } else if (status === "read") {
                contact.status = "read";
                contact.readAt = new Date().toISOString();
              } else if (status === "failed") {
                contact.status = "failed";
                contact.error = statusObj.errors?.[0]?.title || "Error en entrega";
              }
              broadcastCampaignUpdate(campId);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Webhook parse error:", err);
  }
  res.sendStatus(200);
});

// Vite middleware setup
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AKARI WhatsApp Campaigns server running on http://0.0.0.0:${PORT}`);
  });
}

start();
