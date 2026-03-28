// Database tools — Life science company & people database
// TODO: Wire to Supabase when database is ready
// For now, all tools return structured "not configured" responses
// so the MCP schema is complete and clients can see what's coming.

export function getDatabaseTools() {
  return [
    {
      name: "db_search_companies",
      description:
        "Search the life science company database. Filter by industry, size, geography, technology, therapeutic area, and more.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search query" },
          industry: {
            type: "string",
            description: "Industry filter (e.g., biotech, pharma, CRO, CDMO, medtech, diagnostics)",
          },
          therapeuticArea: {
            type: "string",
            description: "Therapeutic area (e.g., oncology, neuroscience, immunology, rare disease)",
          },
          technology: {
            type: "string",
            description: "Technology/modality (e.g., mRNA, cell therapy, CRISPR, antibodies, small molecule)",
          },
          country: { type: "string", description: "Country filter" },
          city: { type: "string", description: "City filter" },
          minEmployees: { type: "number", description: "Minimum employee count" },
          maxEmployees: { type: "number", description: "Maximum employee count" },
          fundingStage: {
            type: "string",
            description: "Funding stage (e.g., seed, series-a, series-b, public)",
          },
          limit: { type: "number", description: "Results to return (default: 25)" },
          offset: { type: "number", description: "Results to skip (default: 0)" },
        },
      },
    },
    {
      name: "db_get_company",
      description:
        "Get full details for a company from the database — overview, employees, publications, funding, events, and signals.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Database company ID" },
          domain: { type: "string", description: "Company domain (alternative to ID)" },
        },
      },
    },
    {
      name: "db_search_people",
      description:
        "Search the life science people database. Filter by title, company, department, seniority, and research area.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search query" },
          title: { type: "string", description: "Job title filter (e.g., VP R&D, Head of Discovery)" },
          seniority: {
            type: "string",
            description: "Seniority level (e.g., c-suite, vp, director, manager, individual-contributor)",
          },
          department: {
            type: "string",
            description: "Department (e.g., R&D, clinical, commercial, manufacturing, regulatory)",
          },
          companyId: { type: "string", description: "Filter by database company ID" },
          companyDomain: { type: "string", description: "Filter by company domain" },
          country: { type: "string", description: "Country filter" },
          researchArea: { type: "string", description: "Research area or expertise" },
          limit: { type: "number", description: "Results to return (default: 25)" },
          offset: { type: "number", description: "Results to skip (default: 0)" },
        },
      },
    },
    {
      name: "db_get_person",
      description: "Get full details for a person from the database — profile, publications, company history.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Database person ID" },
          email: { type: "string", description: "Email address (alternative to ID)" },
          linkedinUrl: { type: "string", description: "LinkedIn URL (alternative to ID)" },
        },
      },
    },
    {
      name: "db_search_publications",
      description:
        "Search scientific publications by author, topic, journal, or company affiliation.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search (title, abstract, keywords)" },
          author: { type: "string", description: "Author name" },
          journal: { type: "string", description: "Journal name" },
          companyAffiliation: { type: "string", description: "Company or institution name" },
          yearFrom: { type: "number", description: "Published after this year" },
          yearTo: { type: "number", description: "Published before this year" },
          limit: { type: "number", description: "Results to return (default: 25)" },
        },
      },
    },
    {
      name: "db_export",
      description:
        "Export a list of companies or people from the database as structured data. Requires a paid plan.",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["companies", "people"], description: "What to export" },
          ids: {
            type: "array",
            items: { type: "string" },
            description: "List of database IDs to export",
          },
          fields: {
            type: "array",
            items: { type: "string" },
            description: "Fields to include in export (default: all)",
          },
        },
        required: ["type", "ids"],
      },
    },
  ];
}

export class DatabaseHandler {
  constructor(config) {
    this.supabaseUrl = config?.supabaseUrl;
    this.supabaseKey = config?.supabaseKey;
    this.configured = !!(this.supabaseUrl && this.supabaseKey);
  }

  async handle(name, args) {
    if (!this.configured) {
      return {
        status: "not_configured",
        message:
          "Life science database is not connected yet. Contact your administrator to configure database access.",
        tool: name,
        args,
      };
    }

    // TODO: Implement when Supabase database is ready
    switch (name) {
      case "db_search_companies":
        return this.searchCompanies(args);
      case "db_get_company":
        return this.getCompany(args);
      case "db_search_people":
        return this.searchPeople(args);
      case "db_get_person":
        return this.getPerson(args);
      case "db_search_publications":
        return this.searchPublications(args);
      case "db_export":
        return this.exportRecords(args);
      default:
        throw new Error(`Unknown database tool: ${name}`);
    }
  }

  // Placeholder implementations — replace with Supabase queries
  async searchCompanies(args) {
    return { status: "not_implemented", tool: "db_search_companies", args };
  }
  async getCompany(args) {
    return { status: "not_implemented", tool: "db_get_company", args };
  }
  async searchPeople(args) {
    return { status: "not_implemented", tool: "db_search_people", args };
  }
  async getPerson(args) {
    return { status: "not_implemented", tool: "db_get_person", args };
  }
  async searchPublications(args) {
    return { status: "not_implemented", tool: "db_search_publications", args };
  }
  async exportRecords(args) {
    return { status: "not_implemented", tool: "db_export", args };
  }
}
