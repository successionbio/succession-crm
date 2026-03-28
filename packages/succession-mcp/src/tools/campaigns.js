// Campaign tools — Create, manage, and launch outreach campaigns

export function getCampaignTools() {
  return [
    {
      name: "campaign_create",
      description:
        "Create a new outreach campaign. Requires a target list, messaging, and sender configuration.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Campaign name" },
          channel: { type: "string", enum: ["email", "linkedin", "multichannel"] },
          leads: {
            type: "array",
            items: {
              type: "object",
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
                email: { type: "string" },
                company: { type: "string" },
                linkedinUrl: { type: "string" },
              },
            },
            description: "Target leads for the campaign",
          },
          messaging: {
            type: "object",
            description: "Messaging sequence (steps with subject, body, waitDays)",
          },
          senderAccountId: { type: "string", description: "Sender account ID" },
          startDate: { type: "string", description: "Campaign start date (ISO 8601). Defaults to now." },
        },
        required: ["name", "channel"],
      },
    },
    {
      name: "campaign_list",
      description: "List campaigns with optional status filtering.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["draft", "active", "paused", "completed"],
            description: "Filter by status",
          },
          limit: { type: "number" },
          offset: { type: "number" },
        },
      },
    },
    {
      name: "campaign_get",
      description: "Get full campaign details — leads, messaging, performance stats.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Campaign ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "campaign_stats",
      description: "Get campaign performance stats — opens, clicks, replies, bounces, meetings booked.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Campaign ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "campaign_pause",
      description: "Pause an active campaign.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Campaign ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "campaign_resume",
      description: "Resume a paused campaign.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Campaign ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "campaign_add_leads",
      description: "Add leads to an existing campaign.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Campaign ID" },
          leads: {
            type: "array",
            items: {
              type: "object",
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
                email: { type: "string" },
                company: { type: "string" },
                linkedinUrl: { type: "string" },
              },
            },
          },
        },
        required: ["id", "leads"],
      },
    },
    {
      name: "campaign_list_senders",
      description: "List available sender accounts for campaigns.",
      inputSchema: {
        type: "object",
        properties: {
          channel: { type: "string", enum: ["email", "linkedin"] },
        },
      },
    },
  ];
}

export class CampaignHandler {
  constructor(config) {
    this.configured = false; // TODO: Wire to Bison / campaign API
  }

  async handle(name, args) {
    if (!this.configured) {
      return {
        status: "not_configured",
        message: "Campaign tools are not configured yet. Set up sender accounts and campaign API access first.",
        tool: name,
        args,
      };
    }

    return { status: "not_implemented", tool: name, args };
  }
}
