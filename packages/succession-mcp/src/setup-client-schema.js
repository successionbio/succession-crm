#!/usr/bin/env node
/**
 * Succession CRM — Client Data Model Setup
 *
 * Pre-loads the data model for a new client instance.
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   TWENTY_API_KEY=xxx node setup-client-schema.js
 *   TWENTY_API_KEY=xxx node setup-client-schema.js --dry-run
 *   TWENTY_API_KEY=xxx TWENTY_BASE_URL=http://localhost:3000 node setup-client-schema.js
 */

const TWENTY_BASE_URL = process.env.TWENTY_BASE_URL || "https://crm.succession.bio";
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!TWENTY_API_KEY) {
  console.error("TWENTY_API_KEY environment variable required");
  process.exit(1);
}

// ============================================================
// API Helpers
// ============================================================

async function graphql(query, variables = {}) {
  const res = await fetch(`${TWENTY_BASE_URL}/metadata`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TWENTY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(`GraphQL: ${JSON.stringify(data.errors)}`);
  return data.data;
}

// ============================================================
// State Cache
// ============================================================

let allObjects = [];
let allFields = [];

async function loadState() {
  const objData = await graphql(`{
    objects(paging: { first: 200 }) {
      edges { node { id nameSingular namePlural isCustom isActive } }
    }
  }`);
  allObjects = objData.objects.edges.map((e) => e.node);

  for (const obj of allObjects) {
    const fieldData = await graphql(`{
      object(id: "${obj.id}") {
        fields(paging: { first: 300 }) {
          edges { node { id name type isCustom isActive label } }
        }
      }
    }`);
    const fields = fieldData.object.fields.edges.map((e) => ({
      ...e.node,
      objectId: obj.id,
      objectName: obj.nameSingular,
    }));
    allFields.push(...fields);
  }
  console.log(`Loaded ${allObjects.length} objects, ${allFields.length} fields`);
}

function findObject(name) {
  return allObjects.find((o) => o.nameSingular === name);
}

function findField(objectName, fieldName) {
  return allFields.find((f) => f.objectName === objectName && f.name === fieldName);
}

// ============================================================
// Mutations
// ============================================================

async function createCustomObject(def) {
  const existing = findObject(def.nameSingular);
  if (existing) {
    console.log(`  ✓ "${def.nameSingular}" already exists`);
    return existing;
  }
  if (DRY_RUN) {
    console.log(`  [DRY] Would create "${def.nameSingular}"`);
    return { id: "dry-run", nameSingular: def.nameSingular };
  }

  const mutation = `mutation {
    createOneObject(input: {
      nameSingular: "${def.nameSingular}"
      namePlural: "${def.namePlural}"
      labelSingular: "${def.labelSingular}"
      labelPlural: "${def.labelPlural}"
      description: "${(def.description || "").replace(/"/g, '\\"')}"
      icon: "${def.icon || "IconCube"}"
      isLabelSyncedWithName: false
    }) { id nameSingular }
  }`;
  const result = (await graphql(mutation)).createOneObject;
  console.log(`  ✅ Created "${def.nameSingular}" (${result.id})`);

  // Refresh state so fields can find the new object
  allObjects.push({ ...result, isCustom: true, isActive: true, namePlural: def.namePlural });
  return result;
}

async function createField(objectName, field) {
  const existing = findField(objectName, field.name);
  if (existing) {
    console.log(`    ✓ ${objectName}.${field.name} exists`);
    return existing;
  }
  if (DRY_RUN) {
    console.log(`    [DRY] Would create ${objectName}.${field.name}`);
    return { id: "dry-run" };
  }

  const obj = findObject(objectName);
  if (!obj) throw new Error(`Object "${objectName}" not found`);

  const optionsStr = field.options
    ? `, options: [${field.options.map((o) => `{label: "${o.label}", value: "${o.value}", color: "${o.color}", position: ${o.position}}`).join(", ")}]`
    : "";

  const defaultStr = field.defaultValue ? `, defaultValue: ${field.defaultValue}` : "";

  const mutation = `mutation {
    createOneField(input: {
      objectMetadataId: "${obj.id}"
      name: "${field.name}"
      label: "${field.label}"
      type: ${field.type}
      description: "${(field.description || "").replace(/"/g, '\\"')}"
      ${optionsStr}
      ${defaultStr}
    }) { id name }
  }`;

  const result = (await graphql(mutation)).createOneField;
  console.log(`    ✅ ${objectName}.${field.name}`);
  allFields.push({ ...result, objectId: obj.id, objectName, type: field.type, isCustom: true });
  return result;
}

async function createRelation(rel) {
  const sourceObj = findObject(rel.sourceObjectName);
  const targetObj = findObject(rel.targetObjectName);
  if (!sourceObj) throw new Error(`Source "${rel.sourceObjectName}" not found`);
  if (!targetObj) throw new Error(`Target "${rel.targetObjectName}" not found`);

  // Check if relation already exists (by source field name)
  const existingField = findField(rel.sourceObjectName, rel.sourceFieldName);
  if (existingField) {
    console.log(`    ✓ Relation ${rel.sourceObjectName}.${rel.sourceFieldName} exists`);
    return;
  }
  if (DRY_RUN) {
    console.log(`    [DRY] Would create relation ${rel.sourceObjectName}.${rel.sourceFieldName} → ${rel.targetObjectName}`);
    return;
  }

  const mutation = `mutation {
    createOneRelation(input: {
      relationType: ${rel.type}
      fromObjectMetadataId: "${sourceObj.id}"
      toObjectMetadataId: "${targetObj.id}"
      fromLabel: "${rel.sourceLabel}"
      fromName: "${rel.sourceFieldName}"
      fromIcon: "${rel.sourceIcon || "IconLink"}"
      toLabel: "${rel.targetLabel}"
      toName: "${rel.targetFieldName}"
      toIcon: "${rel.targetIcon || "IconLink"}"
    }) { id }
  }`;

  await graphql(mutation);
  console.log(`    ✅ Relation ${rel.sourceObjectName}.${rel.sourceFieldName} → ${rel.targetObjectName}`);
}

// ============================================================
// SCHEMA DEFINITION — Client Data Model
// ============================================================

// --- Layer 1: Custom fields on standard objects ---

const COMPANY_CUSTOM_FIELDS = [
  { name: "industry", label: "Industry", type: "SELECT", description: "Life science sub-industry", options: [
    { label: "Biotech", value: "BIOTECH", color: "blue", position: 0 },
    { label: "Pharma", value: "PHARMA", color: "purple", position: 1 },
    { label: "CRO", value: "CRO", color: "turquoise", position: 2 },
    { label: "CDMO", value: "CDMO", color: "turquoise", position: 3 },
    { label: "Med Device", value: "MED_DEVICE", color: "orange", position: 4 },
    { label: "Diagnostics", value: "DIAGNOSTICS", color: "yellow", position: 5 },
    { label: "Lab Equipment", value: "LAB_EQUIPMENT", color: "gray", position: 6 },
    { label: "Reagents", value: "REAGENTS", color: "gray", position: 7 },
    { label: "Digital Health", value: "DIGITAL_HEALTH", color: "green", position: 8 },
    { label: "Other", value: "OTHER", color: "gray", position: 9 },
  ]},
  { name: "therapeuticArea", label: "Therapeutic Area", type: "TEXT", description: "e.g., oncology, neuroscience, immunology" },
  { name: "technology", label: "Technology / Modality", type: "TEXT", description: "e.g., mRNA, cell therapy, CRISPR, antibodies" },
  { name: "fundingStage", label: "Funding Stage", type: "SELECT", options: [
    { label: "Pre-Seed", value: "PRE_SEED", color: "gray", position: 0 },
    { label: "Seed", value: "SEED", color: "gray", position: 1 },
    { label: "Series A", value: "SERIES_A", color: "blue", position: 2 },
    { label: "Series B", value: "SERIES_B", color: "blue", position: 3 },
    { label: "Series C+", value: "SERIES_C_PLUS", color: "purple", position: 4 },
    { label: "Public", value: "PUBLIC", color: "green", position: 5 },
    { label: "Private (Bootstrapped)", value: "PRIVATE", color: "orange", position: 6 },
  ]},
  { name: "companyType", label: "Company Type", type: "SELECT", options: [
    { label: "Prospect", value: "PROSPECT", color: "blue", position: 0 },
    { label: "Customer", value: "CUSTOMER", color: "green", position: 1 },
    { label: "Partner", value: "PARTNER", color: "purple", position: 2 },
    { label: "Competitor", value: "COMPETITOR", color: "red", position: 3 },
    { label: "Other", value: "OTHER", color: "gray", position: 4 },
  ], defaultValue: "'PROSPECT'" },
  { name: "icpScore", label: "ICP Score", type: "NUMBER", description: "AI-generated ICP fit score (0-100)" },
  { name: "icpScoreReason", label: "ICP Score Reason", type: "TEXT", description: "Why this company scored this way" },
  { name: "enrichmentStatus", label: "Enrichment Status", type: "SELECT", options: [
    { label: "Not Enriched", value: "NOT_ENRICHED", color: "gray", position: 0 },
    { label: "Enriched", value: "ENRICHED", color: "green", position: 1 },
    { label: "Failed", value: "FAILED", color: "red", position: 2 },
  ], defaultValue: "'NOT_ENRICHED'" },
  { name: "lastEnrichedAt", label: "Last Enriched", type: "DATE_TIME" },
  { name: "successionDbId", label: "Database ID", type: "TEXT", description: "Succession database record ID" },
  { name: "websiteUrl", label: "Website", type: "LINK", description: "Company website" },
  { name: "yearFounded", label: "Year Founded", type: "NUMBER" },
  { name: "totalFunding", label: "Total Funding", type: "CURRENCY" },
  { name: "recentSignal", label: "Recent Signal", type: "TEXT", description: "Most recent trigger event" },
  { name: "recentSignalDate", label: "Signal Date", type: "DATE_TIME" },
];

const PERSON_CUSTOM_FIELDS = [
  { name: "seniority", label: "Seniority", type: "SELECT", options: [
    { label: "C-Suite", value: "C_SUITE", color: "purple", position: 0 },
    { label: "VP", value: "VP", color: "blue", position: 1 },
    { label: "Director", value: "DIRECTOR", color: "turquoise", position: 2 },
    { label: "Manager", value: "MANAGER", color: "yellow", position: 3 },
    { label: "Individual Contributor", value: "IC", color: "gray", position: 4 },
  ]},
  { name: "department", label: "Department", type: "SELECT", options: [
    { label: "R&D", value: "RND", color: "blue", position: 0 },
    { label: "Clinical", value: "CLINICAL", color: "purple", position: 1 },
    { label: "Commercial", value: "COMMERCIAL", color: "green", position: 2 },
    { label: "Manufacturing", value: "MANUFACTURING", color: "orange", position: 3 },
    { label: "Regulatory", value: "REGULATORY", color: "yellow", position: 4 },
    { label: "Operations", value: "OPERATIONS", color: "turquoise", position: 5 },
    { label: "Finance", value: "FINANCE", color: "gray", position: 6 },
    { label: "IT", value: "IT", color: "gray", position: 7 },
    { label: "Procurement", value: "PROCUREMENT", color: "orange", position: 8 },
    { label: "Quality", value: "QUALITY", color: "turquoise", position: 9 },
  ]},
  { name: "leadStage", label: "Lead Stage", type: "SELECT", options: [
    { label: "Not Contacted", value: "NOT_CONTACTED", color: "gray", position: 0 },
    { label: "Contacted", value: "CONTACTED", color: "blue", position: 1 },
    { label: "Interested", value: "INTERESTED", color: "green", position: 2 },
    { label: "Meeting Booked", value: "MEETING_BOOKED", color: "purple", position: 3 },
    { label: "Meeting Completed", value: "MEETING_COMPLETED", color: "purple", position: 4 },
    { label: "Qualified", value: "QUALIFIED", color: "green", position: 5 },
    { label: "Not Qualified", value: "NOT_QUALIFIED", color: "red", position: 6 },
    { label: "Nurture", value: "NURTURE", color: "orange", position: 7 },
  ], defaultValue: "'NOT_CONTACTED'" },
  { name: "leadSource", label: "Lead Source", type: "SELECT", options: [
    { label: "Database", value: "DATABASE", color: "blue", position: 0 },
    { label: "Enrichment", value: "ENRICHMENT", color: "turquoise", position: 1 },
    { label: "Import", value: "IMPORT", color: "gray", position: 2 },
    { label: "Inbound", value: "INBOUND", color: "green", position: 3 },
    { label: "Referral", value: "REFERRAL", color: "orange", position: 4 },
    { label: "Event", value: "EVENT", color: "purple", position: 5 },
    { label: "Manual", value: "MANUAL", color: "gray", position: 6 },
  ]},
  { name: "enrichmentStatus", label: "Enrichment Status", type: "SELECT", options: [
    { label: "Not Enriched", value: "NOT_ENRICHED", color: "gray", position: 0 },
    { label: "Enriched", value: "ENRICHED", color: "green", position: 1 },
    { label: "Failed", value: "FAILED", color: "red", position: 2 },
  ], defaultValue: "'NOT_ENRICHED'" },
  { name: "lastEnrichedAt", label: "Last Enriched", type: "DATE_TIME" },
  { name: "successionDbId", label: "Database ID", type: "TEXT", description: "Succession database record ID" },
  { name: "researchArea", label: "Research Area", type: "TEXT", description: "Research focus for scientists/R&D contacts" },
  { name: "sentiment", label: "Sentiment", type: "SELECT", options: [
    { label: "Positive", value: "POSITIVE", color: "green", position: 0 },
    { label: "Neutral", value: "NEUTRAL", color: "gray", position: 1 },
    { label: "Negative", value: "NEGATIVE", color: "red", position: 2 },
  ]},
];

const OPPORTUNITY_STAGES = [
  { label: "Lead", value: "LEAD", color: "gray", position: 0 },
  { label: "Discovery", value: "DISCOVERY", color: "blue", position: 1 },
  { label: "Proposal", value: "PROPOSAL", color: "yellow", position: 2 },
  { label: "Negotiation", value: "NEGOTIATION", color: "orange", position: 3 },
  { label: "Closed Won", value: "CLOSED_WON", color: "green", position: 4 },
  { label: "Closed Lost", value: "CLOSED_LOST", color: "red", position: 5 },
];

const OPPORTUNITY_CUSTOM_FIELDS = [
  { name: "lostReason", label: "Lost Reason", type: "TEXT" },
  { name: "monthlyValue", label: "Monthly Value", type: "CURRENCY", description: "For recurring revenue deals" },
  { name: "sourceChannel", label: "Source Channel", type: "SELECT", options: [
    { label: "Email Campaign", value: "EMAIL_CAMPAIGN", color: "blue", position: 0 },
    { label: "LinkedIn Campaign", value: "LINKEDIN_CAMPAIGN", color: "turquoise", position: 1 },
    { label: "Inbound", value: "INBOUND", color: "green", position: 2 },
    { label: "Referral", value: "REFERRAL", color: "orange", position: 3 },
    { label: "Event", value: "EVENT", color: "purple", position: 4 },
    { label: "Other", value: "OTHER", color: "gray", position: 5 },
  ]},
];

// --- Layer 2: Context Engine Objects ---

const CUSTOM_OBJECTS = [
  // --- Company Profile (singleton — the client's own company intelligence) ---
  {
    nameSingular: "companyProfile",
    namePlural: "companyProfiles",
    labelSingular: "Company Profile",
    labelPlural: "Company Profiles",
    description: "Your company intelligence — ICP, brand voice, and qualification criteria. Filled during onboarding, refined over time.",
    icon: "IconTarget",
    fields: [
      { name: "companyName", label: "Company Name", type: "TEXT", description: "Your company name" },
      { name: "companyOverview", label: "Overview", type: "TEXT", description: "What your company does, products/services, differentiators" },
      { name: "website", label: "Website", type: "TEXT" },
      { name: "icpIndustries", label: "ICP Industries", type: "TEXT", description: "Target industries (comma-separated)" },
      { name: "icpTherapeuticAreas", label: "ICP Therapeutic Areas", type: "TEXT" },
      { name: "icpModalities", label: "ICP Technologies", type: "TEXT", description: "Target modalities/technologies" },
      { name: "icpCompanyTypes", label: "ICP Company Types", type: "TEXT", description: "e.g., biotech, pharma, CRO" },
      { name: "icpCompanySize", label: "ICP Company Size", type: "TEXT", description: "e.g., 50-500 employees" },
      { name: "icpFundingStages", label: "ICP Funding Stages", type: "TEXT", description: "e.g., Series A, Series B" },
      { name: "icpGeographies", label: "ICP Geographies", type: "TEXT", description: "Target countries/regions" },
      { name: "icpDisqualifiers", label: "ICP Disqualifiers", type: "TEXT", description: "Reasons to exclude companies" },
      { name: "icpSignals", label: "ICP Signals", type: "TEXT", description: "Buying signals to watch for" },
      { name: "brandTone", label: "Brand Tone", type: "SELECT", options: [
        { label: "Direct", value: "DIRECT", color: "blue", position: 0 },
        { label: "Consultative", value: "CONSULTATIVE", color: "green", position: 1 },
        { label: "Technical", value: "TECHNICAL", color: "purple", position: 2 },
        { label: "Casual", value: "CASUAL", color: "orange", position: 3 },
      ], defaultValue: "'CONSULTATIVE'" },
      { name: "brandSayThis", label: "Say This", type: "TEXT", description: "Phrases, themes, and positioning to use in outreach" },
      { name: "brandNeverSayThis", label: "Never Say This", type: "TEXT", description: "Phrases and topics to avoid" },
      { name: "proofPoints", label: "Proof Points", type: "TEXT", description: "Metrics, case studies, social proof for messaging" },
    ],
    relations: [],
  },

  // --- Persona (target buyer types) ---
  {
    nameSingular: "persona",
    namePlural: "personas",
    labelSingular: "Persona",
    labelPlural: "Personas",
    description: "Target buyer persona — defines who you sell to and how to message them.",
    icon: "IconUserCircle",
    fields: [
      { name: "personaName", label: "Name", type: "TEXT", description: "e.g., VP R&D, Head of Procurement" },
      { name: "titles", label: "Job Titles", type: "TEXT", description: "Comma-separated titles that match this persona" },
      { name: "department", label: "Department", type: "TEXT" },
      { name: "seniorityLevel", label: "Seniority", type: "TEXT" },
      { name: "painPoints", label: "Pain Points", type: "TEXT", description: "Problems this persona faces" },
      { name: "valueProps", label: "Value Props", type: "TEXT", description: "Value propositions that resonate" },
      { name: "motivators", label: "Motivators", type: "TEXT", description: "What drives their decisions" },
      { name: "responsibilities", label: "Responsibilities", type: "TEXT", description: "What they're responsible for" },
      { name: "buyingRole", label: "Buying Role", type: "SELECT", options: [
        { label: "Champion", value: "CHAMPION", color: "green", position: 0 },
        { label: "Decision Maker", value: "DECISION_MAKER", color: "purple", position: 1 },
        { label: "Influencer", value: "INFLUENCER", color: "blue", position: 2 },
        { label: "End User", value: "END_USER", color: "gray", position: 3 },
      ]},
      { name: "messagingNotes", label: "Messaging Notes", type: "TEXT", description: "Specific guidance for writing to this persona" },
    ],
    relations: [
      {
        sourceObjectName: "persona",
        sourceFieldName: "personaProfile",
        sourceLabel: "Profile",
        sourceIcon: "IconTarget",
        targetObjectName: "companyProfile",
        targetFieldName: "personas",
        targetLabel: "Personas",
        targetIcon: "IconUserCircle",
        type: "MANY_TO_ONE",
      },
    ],
  },

  // --- Product (what the client sells) ---
  {
    nameSingular: "product",
    namePlural: "products",
    labelSingular: "Product",
    labelPlural: "Products",
    description: "Products and services you offer — used in messaging and qualification.",
    icon: "IconPackage",
    fields: [
      { name: "productName", label: "Name", type: "TEXT" },
      { name: "productType", label: "Type", type: "SELECT", options: [
        { label: "Service", value: "SERVICE", color: "blue", position: 0 },
        { label: "Software", value: "SOFTWARE", color: "purple", position: 1 },
        { label: "Platform", value: "PLATFORM", color: "turquoise", position: 2 },
        { label: "Instrument", value: "INSTRUMENT", color: "orange", position: 3 },
        { label: "Reagent", value: "REAGENT", color: "yellow", position: 4 },
        { label: "Consumable", value: "CONSUMABLE", color: "gray", position: 5 },
        { label: "Other", value: "OTHER", color: "gray", position: 6 },
      ]},
      { name: "overview", label: "Overview", type: "TEXT" },
      { name: "primaryUseCase", label: "Primary Use Case", type: "TEXT" },
      { name: "keyValueProps", label: "Key Value Props", type: "TEXT" },
      { name: "differentiators", label: "Differentiators", type: "TEXT" },
      { name: "competitors", label: "Competitors", type: "TEXT", description: "Competitor products/companies" },
      { name: "averagePrice", label: "Average Price", type: "TEXT" },
      { name: "salesCycleMonths", label: "Sales Cycle (months)", type: "NUMBER" },
    ],
    relations: [
      {
        sourceObjectName: "product",
        sourceFieldName: "productProfile",
        sourceLabel: "Profile",
        sourceIcon: "IconTarget",
        targetObjectName: "companyProfile",
        targetFieldName: "products",
        targetLabel: "Products",
        targetIcon: "IconPackage",
        type: "MANY_TO_ONE",
      },
    ],
  },

  // --- Case Study (success stories for messaging) ---
  {
    nameSingular: "caseStudy",
    namePlural: "caseStudies",
    labelSingular: "Case Study",
    labelPlural: "Case Studies",
    description: "Success stories to reference in outreach messaging.",
    icon: "IconTrophy",
    fields: [
      { name: "title", label: "Title", type: "TEXT" },
      { name: "customerName", label: "Customer Name", type: "TEXT" },
      { name: "customerType", label: "Customer Type", type: "TEXT", description: "Industry/type of the case study customer" },
      { name: "problem", label: "Problem", type: "TEXT" },
      { name: "solution", label: "Solution", type: "TEXT" },
      { name: "outcome", label: "Outcome", type: "TEXT" },
      { name: "proofPoint", label: "Proof Point", type: "TEXT", description: "Key metric or quote" },
      { name: "isPublic", label: "Can Reference in Outreach?", type: "BOOLEAN", description: "Whether this can be mentioned in campaigns" },
    ],
    relations: [
      {
        sourceObjectName: "caseStudy",
        sourceFieldName: "caseStudyProfile",
        sourceLabel: "Profile",
        sourceIcon: "IconTarget",
        targetObjectName: "companyProfile",
        targetFieldName: "caseStudies",
        targetLabel: "Case Studies",
        targetIcon: "IconTrophy",
        type: "MANY_TO_ONE",
      },
      {
        sourceObjectName: "caseStudy",
        sourceFieldName: "caseStudyProduct",
        sourceLabel: "Product",
        sourceIcon: "IconPackage",
        targetObjectName: "product",
        targetFieldName: "caseStudies",
        targetLabel: "Case Studies",
        targetIcon: "IconTrophy",
        type: "MANY_TO_ONE",
      },
    ],
  },

  // --- Layer 3: Outreach Objects ---

  // --- Campaign ---
  {
    nameSingular: "campaign",
    namePlural: "campaigns",
    labelSingular: "Campaign",
    labelPlural: "Campaigns",
    description: "Outreach campaign — email or LinkedIn sequence sent to a target list.",
    icon: "IconSend",
    fields: [
      { name: "channel", label: "Channel", type: "SELECT", options: [
        { label: "Email", value: "EMAIL", color: "blue", position: 0 },
        { label: "LinkedIn", value: "LINKEDIN", color: "turquoise", position: 1 },
        { label: "Multi-Channel", value: "MULTI_CHANNEL", color: "purple", position: 2 },
      ]},
      { name: "campaignStatus", label: "Status", type: "SELECT", options: [
        { label: "Draft", value: "DRAFT", color: "gray", position: 0 },
        { label: "Active", value: "ACTIVE", color: "green", position: 1 },
        { label: "Paused", value: "PAUSED", color: "yellow", position: 2 },
        { label: "Completed", value: "COMPLETED", color: "blue", position: 3 },
      ], defaultValue: "'DRAFT'" },
      { name: "theme", label: "Theme", type: "TEXT", description: "Campaign angle or topic" },
      { name: "totalLeads", label: "Total Leads", type: "NUMBER" },
      { name: "totalSent", label: "Total Sent", type: "NUMBER" },
      { name: "totalDelivered", label: "Total Delivered", type: "NUMBER" },
      { name: "totalOpened", label: "Total Opened", type: "NUMBER" },
      { name: "totalReplied", label: "Total Replied", type: "NUMBER" },
      { name: "totalPositive", label: "Positive Replies", type: "NUMBER" },
      { name: "totalBounced", label: "Total Bounced", type: "NUMBER" },
      { name: "openRate", label: "Open Rate %", type: "NUMBER" },
      { name: "replyRate", label: "Reply Rate %", type: "NUMBER" },
      { name: "meetingsBooked", label: "Meetings Booked", type: "NUMBER" },
      { name: "launchedAt", label: "Launched At", type: "DATE_TIME" },
      { name: "completedAt", label: "Completed At", type: "DATE_TIME" },
    ],
    relations: [
      {
        sourceObjectName: "campaign",
        sourceFieldName: "campaignPersona",
        sourceLabel: "Persona",
        sourceIcon: "IconUserCircle",
        targetObjectName: "persona",
        targetFieldName: "campaigns",
        targetLabel: "Campaigns",
        targetIcon: "IconSend",
        type: "MANY_TO_ONE",
      },
    ],
  },

  // --- Campaign Membership (junction: Person ↔ Campaign) ---
  {
    nameSingular: "campaignMembership",
    namePlural: "campaignMemberships",
    labelSingular: "Campaign Member",
    labelPlural: "Campaign Members",
    description: "Links a person to a campaign with stage tracking.",
    icon: "IconUsers",
    fields: [
      { name: "leadStage", label: "Stage", type: "SELECT", options: [
        { label: "Not Contacted", value: "NOT_CONTACTED", color: "gray", position: 0 },
        { label: "Contacted", value: "CONTACTED", color: "blue", position: 1 },
        { label: "Interested", value: "INTERESTED", color: "green", position: 2 },
        { label: "Meeting Booked", value: "MEETING_BOOKED", color: "purple", position: 3 },
        { label: "Meeting Completed", value: "MEETING_COMPLETED", color: "purple", position: 4 },
        { label: "Qualified", value: "QUALIFIED", color: "green", position: 5 },
        { label: "Not Qualified", value: "NOT_QUALIFIED", color: "red", position: 6 },
        { label: "Nurture", value: "NURTURE", color: "orange", position: 7 },
      ], defaultValue: "'NOT_CONTACTED'" },
      { name: "sentiment", label: "Sentiment", type: "SELECT", options: [
        { label: "Positive", value: "POSITIVE", color: "green", position: 0 },
        { label: "Neutral", value: "NEUTRAL", color: "gray", position: 1 },
        { label: "Negative", value: "NEGATIVE", color: "red", position: 2 },
      ]},
      { name: "channel", label: "Channel", type: "SELECT", options: [
        { label: "Email", value: "EMAIL", color: "blue", position: 0 },
        { label: "LinkedIn", value: "LINKEDIN", color: "turquoise", position: 1 },
      ]},
      { name: "addedAt", label: "Added At", type: "DATE_TIME" },
    ],
    relations: [
      {
        sourceObjectName: "campaignMembership",
        sourceFieldName: "memberCampaign",
        sourceLabel: "Campaign",
        sourceIcon: "IconSend",
        targetObjectName: "campaign",
        targetFieldName: "members",
        targetLabel: "Members",
        targetIcon: "IconUsers",
        type: "MANY_TO_ONE",
      },
      {
        sourceObjectName: "campaignMembership",
        sourceFieldName: "memberPerson",
        sourceLabel: "Person",
        sourceIcon: "IconUser",
        targetObjectName: "person",
        targetFieldName: "campaignMemberships",
        targetLabel: "Campaign Memberships",
        targetIcon: "IconUsers",
        type: "MANY_TO_ONE",
      },
      {
        sourceObjectName: "campaignMembership",
        sourceFieldName: "memberCompany",
        sourceLabel: "Company",
        sourceIcon: "IconBuilding",
        targetObjectName: "company",
        targetFieldName: "campaignMemberships",
        targetLabel: "Campaign Members",
        targetIcon: "IconUsers",
        type: "MANY_TO_ONE",
      },
    ],
  },

  // --- Sequence (email/LinkedIn templates with steps) ---
  {
    nameSingular: "sequence",
    namePlural: "sequences",
    labelSingular: "Sequence",
    labelPlural: "Sequences",
    description: "Outreach sequence — multi-step email or LinkedIn messaging template.",
    icon: "IconListNumbers",
    fields: [
      { name: "channel", label: "Channel", type: "SELECT", options: [
        { label: "Email", value: "EMAIL", color: "blue", position: 0 },
        { label: "LinkedIn", value: "LINKEDIN", color: "turquoise", position: 1 },
      ]},
      { name: "sequenceStatus", label: "Status", type: "SELECT", options: [
        { label: "Draft", value: "DRAFT", color: "gray", position: 0 },
        { label: "Ready", value: "READY", color: "green", position: 1 },
        { label: "Archived", value: "ARCHIVED", color: "red", position: 2 },
      ], defaultValue: "'DRAFT'" },
      { name: "stepCount", label: "Steps", type: "NUMBER", description: "Number of steps in the sequence" },
      { name: "stepsJson", label: "Sequence Steps", type: "TEXT", description: "JSON array of steps. Each step: {number, subject, body, waitDays}" },
      { name: "isTemplate", label: "Is Template?", type: "BOOLEAN", description: "Reusable template vs one-off" },
      { name: "timesUsed", label: "Times Used", type: "NUMBER", description: "How many campaigns have used this sequence" },
    ],
    relations: [
      {
        sourceObjectName: "sequence",
        sourceFieldName: "sequencePersona",
        sourceLabel: "Persona",
        sourceIcon: "IconUserCircle",
        targetObjectName: "persona",
        targetFieldName: "sequences",
        targetLabel: "Sequences",
        targetIcon: "IconListNumbers",
        type: "MANY_TO_ONE",
      },
    ],
  },

  // --- Layer 4: Intelligence Objects ---

  // --- Signal (trigger events) ---
  {
    nameSingular: "signal",
    namePlural: "signals",
    labelSingular: "Signal",
    labelPlural: "Signals",
    description: "Trigger event detected for a prospect company — funding, hires, launches, publications.",
    icon: "IconBolt",
    fields: [
      { name: "signalType", label: "Type", type: "SELECT", options: [
        { label: "Funding", value: "FUNDING", color: "green", position: 0 },
        { label: "New Hire", value: "NEW_HIRE", color: "blue", position: 1 },
        { label: "Product Launch", value: "PRODUCT_LAUNCH", color: "purple", position: 2 },
        { label: "Publication", value: "PUBLICATION", color: "turquoise", position: 3 },
        { label: "Regulatory", value: "REGULATORY", color: "yellow", position: 4 },
        { label: "Partnership", value: "PARTNERSHIP", color: "orange", position: 5 },
        { label: "Acquisition", value: "ACQUISITION", color: "red", position: 6 },
        { label: "Clinical Trial", value: "CLINICAL_TRIAL", color: "purple", position: 7 },
        { label: "Leadership Change", value: "LEADERSHIP_CHANGE", color: "blue", position: 8 },
      ]},
      { name: "headline", label: "Headline", type: "TEXT" },
      { name: "details", label: "Details", type: "TEXT" },
      { name: "sourceUrl", label: "Source URL", type: "TEXT" },
      { name: "detectedAt", label: "Detected At", type: "DATE_TIME" },
      { name: "isActioned", label: "Actioned?", type: "BOOLEAN", description: "Has someone acted on this signal?" },
    ],
    relations: [
      {
        sourceObjectName: "signal",
        sourceFieldName: "signalCompany",
        sourceLabel: "Company",
        sourceIcon: "IconBuilding",
        targetObjectName: "company",
        targetFieldName: "signals",
        targetLabel: "Signals",
        targetIcon: "IconBolt",
        type: "MANY_TO_ONE",
      },
    ],
  },

  // --- Event Bookmark (tracked events from the database) ---
  {
    nameSingular: "eventBookmark",
    namePlural: "eventBookmarks",
    labelSingular: "Event",
    labelPlural: "Events",
    description: "Life science events you're tracking — conferences, trade shows, webinars.",
    icon: "IconCalendarEvent",
    fields: [
      { name: "eventName", label: "Event Name", type: "TEXT" },
      { name: "eventDate", label: "Date", type: "DATE" },
      { name: "endDate", label: "End Date", type: "DATE" },
      { name: "location", label: "Location", type: "TEXT" },
      { name: "eventType", label: "Type", type: "SELECT", options: [
        { label: "Conference", value: "CONFERENCE", color: "blue", position: 0 },
        { label: "Trade Show", value: "TRADE_SHOW", color: "purple", position: 1 },
        { label: "Symposium", value: "SYMPOSIUM", color: "turquoise", position: 2 },
        { label: "Webinar", value: "WEBINAR", color: "green", position: 3 },
        { label: "Workshop", value: "WORKSHOP", color: "orange", position: 4 },
      ]},
      { name: "website", label: "Website", type: "TEXT" },
      { name: "successionEventId", label: "Database Event ID", type: "TEXT", description: "Succession database event ID" },
      { name: "notes", label: "Notes", type: "TEXT" },
      { name: "eventStatus", label: "Status", type: "SELECT", options: [
        { label: "Interested", value: "INTERESTED", color: "gray", position: 0 },
        { label: "Planning", value: "PLANNING", color: "blue", position: 1 },
        { label: "Registered", value: "REGISTERED", color: "green", position: 2 },
        { label: "Attended", value: "ATTENDED", color: "purple", position: 3 },
      ]},
    ],
    relations: [],
  },

  // --- Meeting (meetings with prospects) ---
  {
    nameSingular: "meeting",
    namePlural: "meetings",
    labelSingular: "Meeting",
    labelPlural: "Meetings",
    description: "Meetings with prospects and customers.",
    icon: "IconVideo",
    fields: [
      { name: "meetingDate", label: "Date", type: "DATE_TIME" },
      { name: "duration", label: "Duration (min)", type: "NUMBER" },
      { name: "meetingType", label: "Type", type: "SELECT", options: [
        { label: "Discovery", value: "DISCOVERY", color: "blue", position: 0 },
        { label: "Demo", value: "DEMO", color: "purple", position: 1 },
        { label: "Proposal Review", value: "PROPOSAL_REVIEW", color: "yellow", position: 2 },
        { label: "Follow-Up", value: "FOLLOW_UP", color: "turquoise", position: 3 },
        { label: "Onboarding", value: "ONBOARDING", color: "green", position: 4 },
        { label: "QBR", value: "QBR", color: "orange", position: 5 },
        { label: "Other", value: "OTHER", color: "gray", position: 6 },
      ]},
      { name: "summary", label: "Summary", type: "TEXT" },
      { name: "actionItems", label: "Action Items", type: "TEXT" },
      { name: "outcome", label: "Outcome", type: "SELECT", options: [
        { label: "Positive", value: "POSITIVE", color: "green", position: 0 },
        { label: "Neutral", value: "NEUTRAL", color: "gray", position: 1 },
        { label: "Negative", value: "NEGATIVE", color: "red", position: 2 },
      ]},
      { name: "recordingUrl", label: "Recording URL", type: "TEXT" },
      { name: "calendarEventId", label: "Calendar Event ID", type: "TEXT", description: "Cal.com event ID" },
    ],
    relations: [
      {
        sourceObjectName: "meeting",
        sourceFieldName: "meetingPerson",
        sourceLabel: "Contact",
        sourceIcon: "IconUser",
        targetObjectName: "person",
        targetFieldName: "meetings",
        targetLabel: "Meetings",
        targetIcon: "IconVideo",
        type: "MANY_TO_ONE",
      },
      {
        sourceObjectName: "meeting",
        sourceFieldName: "meetingCompany",
        sourceLabel: "Company",
        sourceIcon: "IconBuilding",
        targetObjectName: "company",
        targetFieldName: "meetings",
        targetLabel: "Meetings",
        targetIcon: "IconVideo",
        type: "MANY_TO_ONE",
      },
      {
        sourceObjectName: "meeting",
        sourceFieldName: "meetingOpportunity",
        sourceLabel: "Deal",
        sourceIcon: "IconCurrencyDollar",
        targetObjectName: "opportunity",
        targetFieldName: "meetings",
        targetLabel: "Meetings",
        targetIcon: "IconVideo",
        type: "MANY_TO_ONE",
      },
    ],
  },
];

// ============================================================
// Main
// ============================================================

async function main() {
  console.log(`\n🧬 Succession CRM — Client Schema Setup${DRY_RUN ? " [DRY RUN]" : ""}`);
  console.log(`   Target: ${TWENTY_BASE_URL}\n`);

  await loadState();

  // 1. Custom fields on standard objects
  console.log("\n📋 Company custom fields:");
  for (const field of COMPANY_CUSTOM_FIELDS) {
    await createField("company", field);
  }

  console.log("\n👤 Person custom fields:");
  for (const field of PERSON_CUSTOM_FIELDS) {
    await createField("person", field);
  }

  console.log("\n💰 Opportunity custom fields:");
  for (const field of OPPORTUNITY_CUSTOM_FIELDS) {
    await createField("opportunity", field);
  }

  // 2. Custom objects (context engine, outreach, intelligence)
  for (const objDef of CUSTOM_OBJECTS) {
    console.log(`\n🔧 ${objDef.labelSingular}:`);
    await createCustomObject(objDef);

    for (const field of objDef.fields) {
      await createField(objDef.nameSingular, field);
    }

    for (const rel of objDef.relations || []) {
      await createRelation(rel);
    }
  }

  // 3. Summary
  await loadState();
  const customObjects = allObjects.filter((o) => o.isCustom && o.isActive);
  const customFields = allFields.filter((f) => f.isCustom);

  console.log("\n✅ Schema setup complete:");
  console.log(`   Custom objects: ${customObjects.length} (${customObjects.map((o) => o.nameSingular).join(", ")})`);
  console.log(`   Custom fields: ${customFields.length}`);
  console.log("");
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
