// Profile tools — Company context engine (ICP, personas, messaging context)
// This is the persistent intelligence layer that makes every other tool smarter.

export function getProfileTools() {
  return [
    {
      name: "profile_setup",
      description:
        "Set up or update your company profile — the context engine that personalizes all AI tools. Includes company overview, ICP, personas, and messaging context.",
      inputSchema: {
        type: "object",
        properties: {
          companyOverview: {
            type: "string",
            description: "What your company does, core products/services, key differentiators",
          },
          icp: {
            type: "object",
            description: "Ideal Customer Profile definition",
            properties: {
              industries: {
                type: "array",
                items: { type: "string" },
                description: "Target industries (e.g., biotech, pharma, CRO)",
              },
              companySize: {
                type: "object",
                properties: {
                  min: { type: "number" },
                  max: { type: "number" },
                },
                description: "Target employee count range",
              },
              geographies: {
                type: "array",
                items: { type: "string" },
                description: "Target countries/regions",
              },
              signals: {
                type: "array",
                items: { type: "string" },
                description: "Buying signals to watch for (e.g., 'hiring scientists', 'new funding')",
              },
              disqualifiers: {
                type: "array",
                items: { type: "string" },
                description: "Reasons to exclude a company (e.g., 'competitor', 'too small')",
              },
            },
          },
          personas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Persona name (e.g., 'VP R&D')" },
                titles: {
                  type: "array",
                  items: { type: "string" },
                  description: "Job titles that match this persona",
                },
                painPoints: {
                  type: "array",
                  items: { type: "string" },
                  description: "Key pain points this persona faces",
                },
                valueProps: {
                  type: "array",
                  items: { type: "string" },
                  description: "Value propositions that resonate with this persona",
                },
                responsibilities: {
                  type: "array",
                  items: { type: "string" },
                  description: "What this persona is responsible for",
                },
              },
              required: ["name", "titles"],
            },
            description: "Target personas for outreach",
          },
          messagingContext: {
            type: "object",
            description: "Context for messaging generation",
            properties: {
              tone: {
                type: "string",
                enum: ["direct", "consultative", "technical", "casual"],
              },
              proofPoints: {
                type: "array",
                items: { type: "string" },
                description: "Social proof, case studies, metrics to reference",
              },
              avoidTopics: {
                type: "array",
                items: { type: "string" },
                description: "Topics or phrases to avoid in outreach",
              },
            },
          },
        },
      },
    },
    {
      name: "profile_get",
      description: "Get your current company profile — ICP, personas, messaging context.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "profile_update_persona",
      description: "Add or update a specific persona in your profile.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Persona name" },
          titles: { type: "array", items: { type: "string" } },
          painPoints: { type: "array", items: { type: "string" } },
          valueProps: { type: "array", items: { type: "string" } },
          responsibilities: { type: "array", items: { type: "string" } },
        },
        required: ["name"],
      },
    },
    {
      name: "profile_qualify_company",
      description:
        "Score a company against your ICP. Returns a fit score and reasoning based on your profile criteria.",
      inputSchema: {
        type: "object",
        properties: {
          companyId: { type: "string", description: "Database company ID" },
          companyDomain: { type: "string", description: "Company domain (alternative to ID)" },
          companyName: { type: "string", description: "Company name (least precise)" },
        },
      },
    },
    {
      name: "profile_qualify_batch",
      description: "Score multiple companies against your ICP. Returns fit scores for each.",
      inputSchema: {
        type: "object",
        properties: {
          companies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                domain: { type: "string" },
                name: { type: "string" },
              },
            },
            description: "Companies to qualify (max 50)",
          },
        },
        required: ["companies"],
      },
    },
  ];
}

export class ProfileHandler {
  constructor(config) {
    this.configured = false; // TODO: Wire to profile storage
  }

  async handle(name, args) {
    if (!this.configured) {
      return {
        status: "not_configured",
        message:
          "Company profile is not set up yet. Use profile_setup to create your ICP, personas, and messaging context.",
        tool: name,
        args,
      };
    }

    return { status: "not_implemented", tool: name, args };
  }
}
