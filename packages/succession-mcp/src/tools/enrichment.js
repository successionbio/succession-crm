// Enrichment tools — Email finding, company enrichment, validation
// Calls the enrichment worker at twenty-sync.successionbio.workers.dev

export function getEnrichmentTools() {
  return [
    {
      name: "enrich_person",
      description:
        "Enrich a person — find their work email, validate it, and pull LinkedIn profile data. Uses the enrichment waterfall (LeadMagic → Findymail → Apollo).",
      inputSchema: {
        type: "object",
        properties: {
          firstName: { type: "string", description: "First name" },
          lastName: { type: "string", description: "Last name" },
          company: { type: "string", description: "Company name" },
          domain: { type: "string", description: "Company domain (more accurate than name)" },
          linkedinUrl: { type: "string", description: "LinkedIn URL (if known)" },
          title: { type: "string", description: "Job title (helps disambiguation)" },
        },
        required: ["firstName", "lastName"],
      },
    },
    {
      name: "enrich_company",
      description:
        "Enrich a company — pull firmographic data, employee count, industry, funding, technologies, and domain info.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Company name" },
          domain: { type: "string", description: "Company domain (preferred)" },
        },
      },
    },
    {
      name: "enrich_batch",
      description:
        "Enrich a batch of people. Processes up to 50 at a time through the enrichment waterfall.",
      inputSchema: {
        type: "object",
        properties: {
          leads: {
            type: "array",
            items: {
              type: "object",
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
                company: { type: "string" },
                domain: { type: "string" },
                linkedinUrl: { type: "string" },
                title: { type: "string" },
              },
              required: ["firstName", "lastName"],
            },
            description: "Array of people to enrich (max 50)",
          },
        },
        required: ["leads"],
      },
    },
    {
      name: "validate_email",
      description: "Validate one or more email addresses. Checks deliverability, catch-all, disposable.",
      inputSchema: {
        type: "object",
        properties: {
          emails: {
            type: "array",
            items: { type: "string" },
            description: "Email addresses to validate",
          },
        },
        required: ["emails"],
      },
    },
    {
      name: "find_email",
      description: "Find someone's work email given their name and company/domain.",
      inputSchema: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          domain: { type: "string", description: "Company domain" },
          company: { type: "string", description: "Company name (if domain unknown)" },
        },
        required: ["firstName", "lastName"],
      },
    },
  ];
}

export class EnrichmentHandler {
  constructor(config) {
    this.workerUrl = config?.enrichmentWorkerUrl || "https://twenty-sync.successionbio.workers.dev";
    this.apiKey = config?.enrichmentApiKey;
    this.configured = !!this.apiKey;
  }

  async request(endpoint, method = "POST", data = null) {
    const url = `${this.workerUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };
    if (data) options.body = JSON.stringify(data);
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Enrichment API ${endpoint}: ${res.status} — ${text}`);
    }
    return res.json();
  }

  async handle(name, args) {
    if (!this.configured) {
      return {
        status: "not_configured",
        message: "Enrichment is not configured. Set ENRICHMENT_API_KEY to enable.",
        tool: name,
      };
    }

    switch (name) {
      case "enrich_person":
        return this.request("/webhook/enrich/person", "POST", args);

      case "enrich_company":
        return this.request("/webhook/enrich/company", "POST", args);

      case "enrich_batch": {
        if (args.leads?.length > 50) {
          throw new Error("Batch limit is 50 leads. Split into smaller batches.");
        }
        return this.request("/webhook/enrich/batch", "POST", args);
      }

      case "validate_email":
        return this.request("/webhook/enrich/validate-emails", "POST", args);

      case "find_email":
        return this.request("/webhook/enrich/find-email", "POST", args);

      default:
        throw new Error(`Unknown enrichment tool: ${name}`);
    }
  }
}
