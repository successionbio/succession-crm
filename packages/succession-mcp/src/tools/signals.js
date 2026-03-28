// Signals tools — News monitoring, trigger events, alerts
// TODO: Wire to signals pipeline when ready

export function getSignalsTools() {
  return [
    {
      name: "signals_search",
      description:
        "Search for recent signals/trigger events across life science companies — funding rounds, new hires, product launches, publications, regulatory filings, partnerships.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search" },
          type: {
            type: "string",
            enum: [
              "funding",
              "new-hire",
              "product-launch",
              "publication",
              "regulatory",
              "partnership",
              "acquisition",
              "clinical-trial",
              "leadership-change",
            ],
            description: "Signal type filter",
          },
          companyId: { type: "string", description: "Filter by database company ID" },
          companyDomain: { type: "string", description: "Filter by company domain" },
          dateFrom: { type: "string", description: "Signals after this date (ISO 8601)" },
          dateTo: { type: "string", description: "Signals before this date (ISO 8601)" },
          limit: { type: "number", description: "Results to return (default: 25)" },
        },
      },
    },
    {
      name: "signals_subscribe",
      description:
        "Subscribe to signals for specific companies or ICP criteria. Get notified when trigger events happen.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Subscription name (e.g., 'Series B Biotech Funding')" },
          companyIds: {
            type: "array",
            items: { type: "string" },
            description: "Specific company IDs to watch",
          },
          companyFilters: {
            type: "object",
            description: "ICP-based filters (same as db_search_companies filters)",
            properties: {
              industry: { type: "string" },
              therapeuticArea: { type: "string" },
              technology: { type: "string" },
              country: { type: "string" },
              minEmployees: { type: "number" },
              maxEmployees: { type: "number" },
            },
          },
          signalTypes: {
            type: "array",
            items: { type: "string" },
            description: "Types of signals to watch for",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "signals_list_subscriptions",
      description: "List your active signal subscriptions.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "signals_delete_subscription",
      description: "Delete a signal subscription.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Subscription ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "signals_feed",
      description:
        "Get your personalized signal feed — recent trigger events matching your subscriptions and ICP.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Results to return (default: 20)" },
          unreadOnly: { type: "boolean", description: "Only show unread signals (default: true)" },
        },
      },
    },
  ];
}

export class SignalsHandler {
  constructor(config) {
    this.configured = false; // TODO: Wire to signals pipeline
  }

  async handle(name, args) {
    if (!this.configured) {
      return {
        status: "not_configured",
        message: "Signals monitoring is not connected yet. Contact your administrator to configure.",
        tool: name,
        args,
      };
    }

    return { status: "not_implemented", tool: name, args };
  }
}
