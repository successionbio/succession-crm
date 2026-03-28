// Events tools — Life science event database, speakers, attendees
// TODO: Wire to Supabase events table when ready

export function getEventsTools() {
  return [
    {
      name: "events_search",
      description:
        "Search the life science events database. Find conferences, trade shows, and symposiums by topic, location, date, or industry.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search (event name, topic, keyword)" },
          type: {
            type: "string",
            enum: ["conference", "trade-show", "symposium", "webinar", "workshop"],
            description: "Event type filter",
          },
          therapeuticArea: { type: "string", description: "Therapeutic area focus" },
          technology: { type: "string", description: "Technology/modality focus" },
          country: { type: "string", description: "Country" },
          city: { type: "string", description: "City" },
          dateFrom: { type: "string", description: "Events starting after this date (ISO 8601)" },
          dateTo: { type: "string", description: "Events starting before this date (ISO 8601)" },
          limit: { type: "number", description: "Results to return (default: 25)" },
        },
      },
    },
    {
      name: "events_get",
      description: "Get full details for an event — schedule, speakers, exhibitors, and attendee companies.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Event ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "events_speakers",
      description: "Get the speaker list for an event. Returns people with their company, title, and talk details.",
      inputSchema: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "Event ID" },
          search: { type: "string", description: "Filter speakers by name, company, or topic" },
        },
        required: ["eventId"],
      },
    },
    {
      name: "events_exhibitors",
      description: "Get the exhibitor/sponsor list for an event.",
      inputSchema: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "Event ID" },
          search: { type: "string", description: "Filter exhibitors by name" },
        },
        required: ["eventId"],
      },
    },
    {
      name: "events_find_people",
      description:
        "Find people attending or speaking at an event. Can filter by title, company, or seniority to build targeted outreach lists.",
      inputSchema: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "Event ID" },
          role: {
            type: "string",
            enum: ["speaker", "attendee", "exhibitor", "any"],
            description: "Role at the event (default: any)",
          },
          title: { type: "string", description: "Job title filter" },
          seniority: { type: "string", description: "Seniority filter" },
          company: { type: "string", description: "Company name filter" },
          limit: { type: "number", description: "Results to return (default: 50)" },
        },
        required: ["eventId"],
      },
    },
  ];
}

export class EventsHandler {
  constructor(config) {
    this.supabaseUrl = config?.supabaseUrl;
    this.supabaseKey = config?.supabaseKey;
    this.configured = !!(this.supabaseUrl && this.supabaseKey);
  }

  async handle(name, args) {
    if (!this.configured) {
      return {
        status: "not_configured",
        message: "Events database is not connected yet. Contact your administrator to configure.",
        tool: name,
        args,
      };
    }

    // TODO: Implement when events data is in Supabase
    return { status: "not_implemented", tool: name, args };
  }
}
