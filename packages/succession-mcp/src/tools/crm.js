// CRM tools — People, Companies, Notes, Tasks, Opportunities, Search
// Talks to Twenty CRM REST API

export function getCrmTools() {
  return [
    // --- People ---
    {
      name: "crm_create_person",
      description: "Create a person in the CRM",
      inputSchema: {
        type: "object",
        properties: {
          firstName: { type: "string", description: "First name" },
          lastName: { type: "string", description: "Last name" },
          email: { type: "string", description: "Email address" },
          phone: { type: "string", description: "Phone number" },
          jobTitle: { type: "string", description: "Job title" },
          companyId: { type: "string", description: "Company ID to link to" },
          linkedinUrl: { type: "string", description: "LinkedIn profile URL" },
          city: { type: "string", description: "City" },
        },
        required: ["firstName", "lastName"],
      },
    },
    {
      name: "crm_get_person",
      description: "Get a person by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Person ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "crm_list_people",
      description: "List people with optional search and filtering",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Results to return (default: 20)" },
          offset: { type: "number", description: "Results to skip (default: 0)" },
          search: { type: "string", description: "Search by name or email" },
          companyId: { type: "string", description: "Filter by company ID" },
        },
      },
    },
    {
      name: "crm_update_person",
      description: "Update a person's details",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Person ID" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          jobTitle: { type: "string" },
          companyId: { type: "string" },
          linkedinUrl: { type: "string" },
          city: { type: "string" },
        },
        required: ["id"],
      },
    },
    {
      name: "crm_delete_person",
      description: "Delete a person from the CRM",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", description: "Person ID" } },
        required: ["id"],
      },
    },

    // --- Companies ---
    {
      name: "crm_create_company",
      description: "Create a company in the CRM",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Company name" },
          domainName: { type: "string", description: "Company domain (e.g. acme.com)" },
          address: { type: "string", description: "Address" },
          employees: { type: "number", description: "Employee count" },
          linkedinUrl: { type: "string", description: "LinkedIn company URL" },
          annualRecurringRevenue: { type: "number", description: "ARR" },
          idealCustomerProfile: { type: "boolean", description: "Matches ICP?" },
        },
        required: ["name"],
      },
    },
    {
      name: "crm_get_company",
      description: "Get a company by ID",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", description: "Company ID" } },
        required: ["id"],
      },
    },
    {
      name: "crm_list_companies",
      description: "List companies with optional search",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Results to return (default: 20)" },
          offset: { type: "number", description: "Results to skip (default: 0)" },
          search: { type: "string", description: "Search by company name" },
        },
      },
    },
    {
      name: "crm_update_company",
      description: "Update a company's details",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Company ID" },
          name: { type: "string" },
          domainName: { type: "string" },
          address: { type: "string" },
          employees: { type: "number" },
          linkedinUrl: { type: "string" },
          annualRecurringRevenue: { type: "number" },
        },
        required: ["id"],
      },
    },
    {
      name: "crm_delete_company",
      description: "Delete a company from the CRM",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", description: "Company ID" } },
        required: ["id"],
      },
    },

    // --- Notes ---
    {
      name: "crm_create_note",
      description: "Create a note",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Note title" },
          body: { type: "string", description: "Note content" },
        },
        required: ["title", "body"],
      },
    },
    {
      name: "crm_list_notes",
      description: "List notes with optional search",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" },
          offset: { type: "number" },
          search: { type: "string" },
        },
      },
    },
    {
      name: "crm_update_note",
      description: "Update a note",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Note ID" },
          title: { type: "string" },
          body: { type: "string" },
        },
        required: ["id"],
      },
    },
    {
      name: "crm_delete_note",
      description: "Delete a note",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", description: "Note ID" } },
        required: ["id"],
      },
    },

    // --- Tasks ---
    {
      name: "crm_create_task",
      description: "Create a task",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          body: { type: "string", description: "Task description" },
          dueAt: { type: "string", description: "Due date (ISO 8601)" },
          status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"] },
          assigneeId: { type: "string", description: "Assignee person ID" },
        },
        required: ["title"],
      },
    },
    {
      name: "crm_list_tasks",
      description: "List tasks with optional filtering",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" },
          offset: { type: "number" },
          status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"] },
          assigneeId: { type: "string" },
        },
      },
    },
    {
      name: "crm_update_task",
      description: "Update a task",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID" },
          title: { type: "string" },
          body: { type: "string" },
          dueAt: { type: "string" },
          status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"] },
          assigneeId: { type: "string" },
        },
        required: ["id"],
      },
    },
    {
      name: "crm_delete_task",
      description: "Delete a task",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", description: "Task ID" } },
        required: ["id"],
      },
    },

    // --- Opportunities ---
    {
      name: "crm_create_opportunity",
      description: "Create a deal/opportunity in the pipeline",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Deal name" },
          amount: { type: "number", description: "Deal value" },
          stage: { type: "string", description: "Pipeline stage" },
          closeDate: { type: "string", description: "Expected close date (ISO 8601)" },
          companyId: { type: "string", description: "Company ID" },
          personId: { type: "string", description: "Primary contact person ID" },
        },
        required: ["name"],
      },
    },
    {
      name: "crm_list_opportunities",
      description: "List opportunities/deals with optional filtering",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" },
          offset: { type: "number" },
          stage: { type: "string", description: "Filter by pipeline stage" },
          companyId: { type: "string", description: "Filter by company" },
        },
      },
    },
    {
      name: "crm_update_opportunity",
      description: "Update a deal/opportunity",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Opportunity ID" },
          name: { type: "string" },
          amount: { type: "number" },
          stage: { type: "string" },
          closeDate: { type: "string" },
        },
        required: ["id"],
      },
    },

    // --- Search ---
    {
      name: "crm_search",
      description: "Search across CRM records (people, companies, notes, tasks)",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          objectTypes: {
            type: "array",
            items: { type: "string" },
            description: "Object types to search (e.g., ['people', 'companies']). Defaults to all.",
          },
          limit: { type: "number", description: "Results per type (default: 10)" },
        },
        required: ["query"],
      },
    },
  ];
}

export class CrmHandler {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(endpoint, method = "GET", data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };
    if (data && method !== "GET") {
      options.body = JSON.stringify(data);
    }
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`CRM API ${method} ${endpoint}: ${res.status} — ${text}`);
    }
    return res.json();
  }

  async handle(name, args) {
    switch (name) {
      // People
      case "crm_create_person":
        return this.request("/rest/people", "POST", args);
      case "crm_get_person":
        return this.request(`/rest/people/${args.id}`);
      case "crm_list_people": {
        const { limit = 20, offset = 0, search, companyId } = args || {};
        let ep = `/rest/people?limit=${limit}&offset=${offset}`;
        if (search) ep += `&search=${encodeURIComponent(search)}`;
        if (companyId) ep += `&companyId=${companyId}`;
        return this.request(ep);
      }
      case "crm_update_person": {
        const { id, ...data } = args;
        return this.request(`/rest/people/${id}`, "PATCH", data);
      }
      case "crm_delete_person":
        return this.request(`/rest/people/${args.id}`, "DELETE");

      // Companies
      case "crm_create_company":
        return this.request("/rest/companies", "POST", args);
      case "crm_get_company":
        return this.request(`/rest/companies/${args.id}`);
      case "crm_list_companies": {
        const { limit = 20, offset = 0, search } = args || {};
        let ep = `/rest/companies?limit=${limit}&offset=${offset}`;
        if (search) ep += `&search=${encodeURIComponent(search)}`;
        return this.request(ep);
      }
      case "crm_update_company": {
        const { id, ...data } = args;
        return this.request(`/rest/companies/${id}`, "PATCH", data);
      }
      case "crm_delete_company":
        return this.request(`/rest/companies/${args.id}`, "DELETE");

      // Notes
      case "crm_create_note":
        return this.request("/rest/notes", "POST", args);
      case "crm_list_notes": {
        const { limit = 20, offset = 0, search } = args || {};
        let ep = `/rest/notes?limit=${limit}&offset=${offset}`;
        if (search) ep += `&search=${encodeURIComponent(search)}`;
        return this.request(ep);
      }
      case "crm_update_note": {
        const { id, ...data } = args;
        return this.request(`/rest/notes/${id}`, "PATCH", data);
      }
      case "crm_delete_note":
        return this.request(`/rest/notes/${args.id}`, "DELETE");

      // Tasks
      case "crm_create_task":
        return this.request("/rest/tasks", "POST", args);
      case "crm_list_tasks": {
        const { limit = 20, offset = 0, status, assigneeId } = args || {};
        let ep = `/rest/tasks?limit=${limit}&offset=${offset}`;
        if (status) ep += `&status=${status}`;
        if (assigneeId) ep += `&assigneeId=${assigneeId}`;
        return this.request(ep);
      }
      case "crm_update_task": {
        const { id, ...data } = args;
        return this.request(`/rest/tasks/${id}`, "PATCH", data);
      }
      case "crm_delete_task":
        return this.request(`/rest/tasks/${args.id}`, "DELETE");

      // Opportunities
      case "crm_create_opportunity":
        return this.request("/rest/opportunities", "POST", args);
      case "crm_list_opportunities": {
        const { limit = 20, offset = 0, stage, companyId } = args || {};
        let ep = `/rest/opportunities?limit=${limit}&offset=${offset}`;
        if (stage) ep += `&stage=${encodeURIComponent(stage)}`;
        if (companyId) ep += `&companyId=${companyId}`;
        return this.request(ep);
      }
      case "crm_update_opportunity": {
        const { id, ...data } = args;
        return this.request(`/rest/opportunities/${id}`, "PATCH", data);
      }

      // Search
      case "crm_search": {
        const { query, objectTypes = ["people", "companies"], limit = 10 } = args;
        const results = {};
        for (const type of objectTypes) {
          try {
            results[type] = await this.request(
              `/rest/${type}?search=${encodeURIComponent(query)}&limit=${limit}`
            );
          } catch (e) {
            results[type] = { error: e.message };
          }
        }
        return results;
      }

      default:
        throw new Error(`Unknown CRM tool: ${name}`);
    }
  }
}
