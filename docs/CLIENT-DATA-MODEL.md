# Succession CRM — Client Data Model Architecture

> **Source of truth** for the client-facing CRM data model. Every new client instance is provisioned with this schema. Update this document first, then update the setup script (`packages/succession-mcp/src/setup-client-schema.js`) to match.

## Design Principles

1. **This is the client's CRM, not ours.** Companies and People represent their prospects/customers. Context engine objects represent their own company intelligence.
2. **Life science first.** Fields like therapeutic area, modality, and funding stage are first-class — not afterthoughts crammed into custom text fields.
3. **AI-ready.** Every object is designed to be read and written by the Succession MCP. The context engine objects feed directly into AI skills (qualification, messaging, list building).
4. **No internal IDs exposed.** Portal IDs, Bison campaign IDs, and other internal Succession infrastructure references do NOT belong in the client schema. The only bridge field is `successionDbId` which links CRM records back to the Succession database.
5. **Communications use the native timeline.** Emails and LinkedIn messages show up on Person/Company timelines via Twenty's built-in email sync and activity feed — no separate Outreach Activity object.

---

## Schema Overview

```
LAYER 1: Standard Objects (Twenty built-in, custom fields added)
├── Company .............. Prospect/customer companies
├── Person ............... Contacts at those companies
├── Opportunity .......... Deals in the pipeline
├── Note ................. Standard notes (no changes)
└── Task ................. Standard tasks (no changes)

LAYER 2: Context Engine (client's own company intelligence)
├── Company Profile ...... Singleton — ICP, brand voice, qualifiers
├── Persona .............. Target buyer types (VP R&D, Head of Procurement, etc.)
├── Product .............. Client's own products/services
└── Case Study ........... Success stories for use in messaging

LAYER 3: Outreach (campaign execution)
├── Campaign ............. Email/LinkedIn outreach campaigns
├── Campaign Membership .. Junction: Person ↔ Campaign (with stage tracking)
└── Sequence ............. Multi-step messaging templates (editable copy)

LAYER 4: Intelligence (signals, events, meetings)
├── Signal ............... Trigger events (funding, hires, publications, etc.)
├── Event Bookmark ....... Life science events being tracked
└── Meeting .............. Meetings with prospects/customers
```

---

## Layer 1: Standard Objects

### Company

Represents a prospect, customer, partner, or competitor in the client's pipeline.

**Standard Twenty fields:** name, domainName, address, employees, linkedinUrl, annualRecurringRevenue, idealCustomerProfile

**Custom fields:**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `industry` | SELECT | Life science sub-industry | Biotech, Pharma, CRO, CDMO, Med Device, Diagnostics, Lab Equipment, Reagents, Digital Health, Other |
| `therapeuticArea` | TEXT | Target therapeutic area | e.g., oncology, neuroscience, immunology, rare disease |
| `technology` | TEXT | Technology / modality | e.g., mRNA, cell therapy, CRISPR, antibodies, small molecule |
| `fundingStage` | SELECT | Funding stage | Pre-Seed, Seed, Series A, Series B, Series C+, Public, Private (Bootstrapped) |
| `companyType` | SELECT | Relationship type | Prospect (default), Customer, Partner, Competitor, Other |
| `icpScore` | NUMBER | AI-generated ICP fit score | 0-100, calculated by the qualification skill |
| `icpScoreReason` | TEXT | Why this score was given | Auto-populated by AI qualification |
| `enrichmentStatus` | SELECT | Enrichment state | Not Enriched (default), Enriched, Failed |
| `lastEnrichedAt` | DATE_TIME | Last enrichment timestamp | |
| `successionDbId` | TEXT | Succession database record ID | Hidden from UI. Links to our database for sync. |
| `websiteUrl` | LINK | Company website | |
| `yearFounded` | NUMBER | Year founded | |
| `totalFunding` | CURRENCY | Total funding raised | |
| `recentSignal` | TEXT | Most recent trigger event | Auto-populated from Signal objects |
| `recentSignalDate` | DATE_TIME | When the signal occurred | |

### Person

Represents a contact at a prospect/customer company.

**Standard Twenty fields:** firstName, lastName, email, phone, jobTitle, linkedinUrl, city, avatarUrl, company (relation)

**Custom fields:**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `seniority` | SELECT | Seniority level | C-Suite, VP, Director, Manager, Individual Contributor |
| `department` | SELECT | Functional department | R&D, Clinical, Commercial, Manufacturing, Regulatory, Operations, Finance, IT, Procurement, Quality |
| `leadStage` | SELECT | Current outreach stage | Not Contacted (default), Contacted, Interested, Meeting Booked, Meeting Completed, Qualified, Not Qualified, Nurture |
| `leadSource` | SELECT | How this person was found | Database, Enrichment, Import, Inbound, Referral, Event, Manual |
| `sentiment` | SELECT | Latest sentiment from outreach | Positive, Neutral, Negative |
| `enrichmentStatus` | SELECT | Enrichment state | Not Enriched (default), Enriched, Failed |
| `lastEnrichedAt` | DATE_TIME | Last enrichment timestamp | |
| `successionDbId` | TEXT | Succession database record ID | Hidden from UI |
| `researchArea` | TEXT | Research focus area | For scientists and R&D contacts |

### Opportunity

Represents a deal in the sales pipeline.

**Standard Twenty fields:** name, amount, stage, closeDate, company (relation), person (relation)

**Custom pipeline stages:** Lead → Discovery → Proposal → Negotiation → Closed Won / Closed Lost

**Custom fields:**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `lostReason` | TEXT | Why the deal was lost | |
| `monthlyValue` | CURRENCY | Monthly recurring value | For subscription/retainer deals |
| `sourceChannel` | SELECT | Originating channel | Email Campaign, LinkedIn Campaign, Inbound, Referral, Event, Other |

---

## Layer 2: Context Engine

These objects represent **the client's own company** — their ICP, brand, products, and proof points. Filled during onboarding, continuously refined. Every AI skill reads these objects to personalize output.

### Company Profile

**Singleton.** One per CRM instance. Represents the client's own company and targeting criteria.

| Field | Type | Description |
|-------|------|-------------|
| `companyName` | TEXT | Client's own company name |
| `companyOverview` | TEXT | What they do, core products, differentiators |
| `website` | TEXT | Their website |
| `icpIndustries` | TEXT | Target industries (comma-separated) |
| `icpTherapeuticAreas` | TEXT | Target therapeutic areas |
| `icpModalities` | TEXT | Target technologies/modalities |
| `icpCompanyTypes` | TEXT | Target company types (biotech, pharma, CRO) |
| `icpCompanySize` | TEXT | Target employee range (e.g., "50-500") |
| `icpFundingStages` | TEXT | Target funding stages |
| `icpGeographies` | TEXT | Target countries/regions |
| `icpDisqualifiers` | TEXT | Reasons to exclude companies |
| `icpSignals` | TEXT | Buying signals to watch for |
| `brandTone` | SELECT | Messaging tone — Direct, Consultative (default), Technical, Casual |
| `brandSayThis` | TEXT | Phrases, themes, positioning to use |
| `brandNeverSayThis` | TEXT | Phrases and topics to avoid |
| `proofPoints` | TEXT | Metrics, case studies, social proof for messaging |

**Relations:** None (top-level singleton). Personas, Products, and Case Studies link back to this.

### Persona

Target buyer persona. Multiple per CRM. Defines who the client sells to and how to message them.

| Field | Type | Description |
|-------|------|-------------|
| `personaName` | TEXT | e.g., "VP R&D", "Head of Procurement" |
| `titles` | TEXT | Comma-separated job titles that match |
| `department` | TEXT | Target department |
| `seniorityLevel` | TEXT | Target seniority |
| `painPoints` | TEXT | Problems this persona faces |
| `valueProps` | TEXT | Value propositions that resonate |
| `motivators` | TEXT | What drives their decisions |
| `responsibilities` | TEXT | What they're responsible for |
| `buyingRole` | SELECT | Champion, Decision Maker, Influencer, End User |
| `messagingNotes` | TEXT | Specific guidance for writing to this persona |

**Relations:**
- → Company Profile (many-to-one)

### Product

Products and services the client offers. Used in messaging generation and qualification.

| Field | Type | Description |
|-------|------|-------------|
| `productName` | TEXT | Product/service name |
| `productType` | SELECT | Service, Software, Platform, Instrument, Reagent, Consumable, Other |
| `overview` | TEXT | What it does |
| `primaryUseCase` | TEXT | Primary use case |
| `keyValueProps` | TEXT | Key value propositions |
| `differentiators` | TEXT | What makes it different |
| `competitors` | TEXT | Competitor products/companies |
| `averagePrice` | TEXT | Average sales price |
| `salesCycleMonths` | NUMBER | Typical sales cycle length |

**Relations:**
- → Company Profile (many-to-one)

### Case Study

Success stories that can be referenced in outreach messaging.

| Field | Type | Description |
|-------|------|-------------|
| `title` | TEXT | Case study title |
| `customerName` | TEXT | Customer featured |
| `customerType` | TEXT | Industry/type of the customer |
| `problem` | TEXT | What problem was solved |
| `solution` | TEXT | What was done |
| `outcome` | TEXT | Results achieved |
| `proofPoint` | TEXT | Key metric or quote |
| `isPublic` | BOOLEAN | Can this be referenced in outreach? |

**Relations:**
- → Company Profile (many-to-one)
- → Product (many-to-one, optional)

---

## Layer 3: Outreach

### Campaign

An outreach campaign — email or LinkedIn sequence sent to a target list.

| Field | Type | Description |
|-------|------|-------------|
| `name` | TEXT | Campaign name (Twenty standard) |
| `channel` | SELECT | Email, LinkedIn, Multi-Channel |
| `campaignStatus` | SELECT | Draft (default), Active, Paused, Completed |
| `theme` | TEXT | Campaign angle or topic |
| `totalLeads` | NUMBER | Total leads in campaign |
| `totalSent` | NUMBER | Messages sent |
| `totalDelivered` | NUMBER | Messages delivered |
| `totalOpened` | NUMBER | Messages opened |
| `totalReplied` | NUMBER | Replies received |
| `totalPositive` | NUMBER | Positive replies |
| `totalBounced` | NUMBER | Bounced messages |
| `openRate` | NUMBER | Open rate % |
| `replyRate` | NUMBER | Reply rate % |
| `meetingsBooked` | NUMBER | Meetings booked from campaign |
| `launchedAt` | DATE_TIME | When campaign went live |
| `completedAt` | DATE_TIME | When campaign finished |

**Relations:**
- → Persona (many-to-one) — which persona this campaign targets

### Campaign Membership

Junction table linking People to Campaigns. Tracks per-lead stage within a campaign.

| Field | Type | Description |
|-------|------|-------------|
| `leadStage` | SELECT | Not Contacted (default), Contacted, Interested, Meeting Booked, Meeting Completed, Qualified, Not Qualified, Nurture |
| `sentiment` | SELECT | Positive, Neutral, Negative |
| `channel` | SELECT | Email, LinkedIn |
| `addedAt` | DATE_TIME | When lead was added to campaign |

**Relations:**
- → Campaign (many-to-one)
- → Person (many-to-one)
- → Company (many-to-one)

### Sequence

Multi-step outreach messaging template. Stores actual email/LinkedIn copy that is editable in the CRM and sent via the campaign infrastructure (Bison API for email, HeyReach for LinkedIn).

| Field | Type | Description |
|-------|------|-------------|
| `name` | TEXT | Sequence name (Twenty standard) |
| `channel` | SELECT | Email, LinkedIn |
| `sequenceStatus` | SELECT | Draft (default), Ready, Archived |
| `stepCount` | NUMBER | Number of steps |
| `stepsJson` | TEXT | JSON array of steps. Each step: `{number, subject, body, waitDays}` |
| `isTemplate` | BOOLEAN | Is this a reusable template? |
| `timesUsed` | NUMBER | How many campaigns have used this sequence |

**Relations:**
- → Persona (many-to-one) — which persona this sequence is written for

**Steps JSON format:**
```json
[
  {
    "number": 1,
    "subject": "{First|Hey} — quick question about {Company}",
    "body": "Hi {First},\n\nI noticed your team at {Company} is...",
    "waitDays": 0
  },
  {
    "number": 2,
    "subject": "Re: {First|Hey} — quick question about {Company}",
    "body": "Hi {First},\n\nJust following up on my note...",
    "waitDays": 3
  }
]
```

**Future consideration:** When we build a visual sequence editor in the CRM UI, this JSON field will be replaced by a proper step-by-step editor component. The JSON format is the interim storage mechanism.

---

## Layer 4: Intelligence

### Signal

Trigger events detected for prospect companies. Auto-populated from the Succession signals pipeline and surfaced on Company timelines.

| Field | Type | Description |
|-------|------|-------------|
| `signalType` | SELECT | Funding, New Hire, Product Launch, Publication, Regulatory, Partnership, Acquisition, Clinical Trial, Leadership Change |
| `headline` | TEXT | Short description of the signal |
| `details` | TEXT | Full context |
| `sourceUrl` | TEXT | Where the signal was found |
| `detectedAt` | DATE_TIME | When the signal was detected |
| `isActioned` | BOOLEAN | Has someone acted on this signal? |

**Relations:**
- → Company (many-to-one)

### Event Bookmark

Life science events the client is tracking. Sourced from the Succession events database or added manually.

| Field | Type | Description |
|-------|------|-------------|
| `eventName` | TEXT | Event name |
| `eventDate` | DATE | Start date |
| `endDate` | DATE | End date |
| `location` | TEXT | City, country |
| `eventType` | SELECT | Conference, Trade Show, Symposium, Webinar, Workshop |
| `website` | TEXT | Event website |
| `successionEventId` | TEXT | Succession database event ID (for sync) |
| `notes` | TEXT | User's notes |
| `eventStatus` | SELECT | Interested, Planning, Registered, Attended |

**Relations:** None (standalone). Events relate to campaigns thematically, not via foreign key.

### Meeting

Meetings with prospects and customers. Linked to Cal.com calendar events.

| Field | Type | Description |
|-------|------|-------------|
| `meetingDate` | DATE_TIME | When the meeting occurred |
| `duration` | NUMBER | Duration in minutes |
| `meetingType` | SELECT | Discovery, Demo, Proposal Review, Follow-Up, Onboarding, QBR, Other |
| `summary` | TEXT | Meeting summary/notes |
| `actionItems` | TEXT | Action items from the meeting |
| `outcome` | SELECT | Positive, Neutral, Negative |
| `recordingUrl` | TEXT | Recording link |
| `calendarEventId` | TEXT | Cal.com event ID |

**Relations:**
- → Person (many-to-one) — primary contact in the meeting
- → Company (many-to-one)
- → Opportunity (many-to-one) — deal this meeting relates to

---

## Relationship Map

```
Company Profile (singleton)
├── Persona ──────────── → Campaign
│                         → Sequence
├── Product
│   └── Case Study
└── Case Study

Company (prospect)
├── Person
│   ├── Campaign Membership → Campaign
│   └── Meeting → Opportunity
├── Campaign Membership
├── Signal
├── Meeting
└── Opportunity

Event Bookmark (standalone)
```

---

## Provisioning Checklist

When spinning up a new client instance:

1. **Run setup script** — `node setup-client-schema.js` creates all custom objects and fields
2. **Create Company Profile** — One record with the client's company info (populated during onboarding)
3. **Create Personas** — At least 1-2 personas defined during onboarding
4. **Import existing data** — Migrate from HubSpot/Pipedrive/CSV, auto-enrich from database
5. **Configure Cal.com** — Create team/org, set up booking pages
6. **Configure campaign infrastructure** — Set up sender accounts, domain verification
7. **Enable signals** — Subscribe to signals matching their ICP

---

## Future Considerations

- **Sequence Editor UI** — Replace `stepsJson` TEXT field with a visual step editor component in the CRM
- **Event ↔ Campaign linking** — When events become a first-class campaign type, add a relation from Campaign → Event Bookmark
- **Marketing objects (Mautic sync)** — When marketing add-on launches, add: Marketing Email, Landing Page, Form Submission, Web Visit objects
- **Document tracking (Papermark sync)** — Add: Shared Document object with view analytics
- **Database access tiers** — Free tier: browse-only (no `successionDbId` populated). Paid tier: import to CRM populates the link field
- **Multi-workspace** — If we move to true multi-tenant with workspace isolation, the Company Profile singleton pattern needs to be enforced at the app level

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-28 | Initial data model | Platform launch planning |
