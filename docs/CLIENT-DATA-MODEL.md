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
5. **Configure Cal.com** — Create team/org in multi-tenant instance, set up booking pages per rep
6. **Configure campaign infrastructure** — Set up sender accounts, domain verification
7. **Enable signals** — Subscribe to signals matching their ICP
8. **Provision Activepieces workspace** — Create client workspace, enable pre-built flows (Cal.com → CRM, Campaign → CRM)
9. **Configure Recall.ai** — Register client's calendar for auto-join, test with a sample meeting
10. **Connect external tools** — If client has existing tools (Gong, Google Calendar, etc.), set up OAuth connections in Activepieces

---

## Integrations Architecture

### Design Philosophy

The platform ships with a curated set of **pre-wired OSS integrations** that work out of the box. For everything else, an embedded integration platform (Activepieces) lets users connect their own tools via OAuth — no API keys, no code.

**Dogfooding rule:** We build and run every integration internally first on our own CRM instance. Once stable, it becomes available to clients. This means our internal Succession CRM is always the most integrated instance, and client-facing integrations are battle-tested before release.

### Infrastructure

```
Services Droplet (16GB)
├── Cal.com .............. cal.succession.bio (scheduling)
├── Mautic ............... marketing.succession.bio (marketing automation)
├── Activepieces ......... connect.succession.bio (integration platform)
├── Papermark ............ docs.succession.bio (document tracking)
├── Caddy ................ reverse proxy + SSL
└── Shared PostgreSQL

All OAuth tokens and API credentials stored encrypted (AES-256)
in Activepieces DB, isolated per client workspace.
```

### Pre-Wired Integrations (included, zero config)

These ship with every instance and are configured during provisioning:

#### Cal.com → CRM (Scheduling)

| Trigger | Action | CRM Object |
|---------|--------|------------|
| Meeting booked | Create Meeting record, link to Person + Company | Meeting |
| Meeting rescheduled | Update Meeting record | Meeting |
| Meeting cancelled | Update Meeting status | Meeting |
| New booking page created | Available as scheduling link on Person records | — |

**Tech:** Cal.com webhooks → Activepieces flow → Twenty REST API
**License:** AGPLv3 (all features available self-hosted, including round-robin and Teams features)

#### Mautic → CRM (Marketing Automation) — Marketing Add-On

| Trigger | Action | CRM Object |
|---------|--------|------------|
| Contact created in Mautic | Create/update Person in CRM | Person |
| Email opened/clicked | Activity on Person timeline | Person timeline |
| Form submitted | Create Person + Note with form data | Person, Note |
| Lead score updated | Update Person record | Person (custom field) |
| Contact added to segment | Tag Person in CRM | Person |
| Campaign email bounced | Update Person email status | Person |

**Bidirectional sync:**
| CRM Trigger | Mautic Action |
|-------------|---------------|
| Person created in CRM | Create contact in Mautic |
| Person stage changed to "Nurture" | Add to nurture segment |
| Deal closed won | Add to customer segment |

**Tech:** Mautic webhooks + REST API ↔ Activepieces ↔ Twenty REST API
**License:** GPLv3 (fully self-hostable, no feature gates)

#### Papermark → CRM (Document Tracking) — Marketing Add-On

| Trigger | Action | CRM Object |
|---------|--------|------------|
| Document viewed | Activity on Person/Company timeline | Timeline event |
| Document shared | Create Note with share link + tracking | Note |
| View analytics updated | Update document view count | Custom field on Note |

**Tech:** Papermark webhooks → Activepieces → Twenty REST API
**License:** AGPLv3

#### Succession Database → CRM

| Action | What happens | CRM Object |
|--------|-------------|------------|
| User imports company from database | Company created with enriched data, `successionDbId` linked | Company |
| User imports person from database | Person created with enriched data, linked to Company | Person |
| Signal detected for saved company | Signal record created, `recentSignal` field updated on Company | Signal, Company |
| Event bookmarked from database | Event Bookmark created with `successionEventId` | Event Bookmark |

**Tech:** Succession MCP tools → Twenty REST API (direct, no Activepieces needed)
**Gating:** Import requires paid plan. Free tier can browse but not push to CRM.

#### Succession Campaign Infrastructure → CRM

| Trigger | Action | CRM Object |
|---------|--------|------------|
| Campaign launched (Bison/HeyReach) | Campaign record created | Campaign |
| Email sent/opened/replied | Activity on Person timeline | Person timeline |
| LinkedIn message sent/replied | Activity on Person timeline | Person timeline |
| Lead stage changed | Update Campaign Membership stage | Campaign Membership |
| Meeting booked from campaign | Create Meeting, link to Campaign | Meeting, Campaign Membership |
| Campaign stats updated | Update Campaign record counts | Campaign |

**Tech:** Bison/HeyReach webhooks → Activepieces → Twenty REST API

### Meeting Intelligence (Recall.ai)

Context-aware meeting recording, transcription, and AI-powered notes. Unlike generic tools (Gong, Fireflies), Succession combines the transcript with CRM data to produce rich, actionable meeting intelligence.

#### How It Works

```
BEFORE THE CALL
  Cal.com meeting booked
    → Pre-call prep triggered
    → Pull from CRM:
       • Person record (title, department, research area, previous interactions)
       • Company record (industry, funding, ICP score, therapeutic area)
       • Opportunity (deal stage, value)
       • Company Profile (our products, value props, personas)
       • Previous meetings (last discussion, open action items)
       • Campaign history (what outreach they received)
    → Context packet assembled

DURING THE CALL
  Recall.ai bot joins the meeting
    → Real-time audio/video recording
    → Live transcript streaming

AFTER THE CALL
  Full transcript + context packet → Claude API
    → AI generates:
       • Context-aware meeting summary
       • Action items (tagged to CRM objects)
       • Deal stage recommendation
       • Suggested follow-up (references relevant case studies/products)
       • Competitor mentions flagged
       • Buying signals detected ("mentioned budget timeline", "asked about integration")
    → Auto-update CRM:
       • Meeting object created with summary + action items
       • Tasks created from action items (assigned to rep)
       • Opportunity stage updated if recommended
       • Signal created if trigger detected
       • Person/Company records updated with new intel
```

#### Why This Is Different

| Generic tool (Gong/Fireflies) | Succession Meeting Intelligence |
|-------------------------------|--------------------------------|
| "Discussed pricing" | "Dr. Chen asked about FlowMax Pro pricing for their 12-person assay dev team. Referenced BD Biosciences as current vendor." |
| "Follow up next week" | "Action: Send Xenogen Labs case study (40% assay dev time reduction — matches her stated bottleneck). Budget tied to Series C timeline (Q3 2026)." |
| Generic summary | Summary references ICP score, persona match, relevant products, and previous meeting context |
| No CRM updates | Auto-updates deal stage, creates tasks, flags signals |

#### Cost Model

| Component | Cost/hour | Per 30-min call |
|-----------|-----------|----------------|
| Recall.ai recording | $0.50/hr | $0.25 |
| Transcription | $0.15/hr | $0.075 |
| 30-day storage | $0.05/hr | $0.025 |
| Claude API (analysis) | ~$0.20/hr | $0.10 |
| **Total** | **$0.90/hr** | **~$0.45/call** |

At 30 meetings/month for a 5-person team: **~$13.50/mo COGS.** Included in the £500/mo plan.

**Free tier:** First 5 hours free (Recall.ai's free tier) = ~10 meetings. Good conversion lever.

#### Recall.ai Details

- **Platforms:** Zoom, Google Meet, Teams, Webex, GoTo Meeting, Slack
- **Billing:** Prorated to the second
- **Data residency:** US, EU, JP
- **API:** Full REST API for bot lifecycle, recording retrieval, transcript access
- **Not open source** — commercial API. This is the one non-OSS component in the stack.

### Bring-Your-Own Integrations (via Activepieces)

For tools clients already use, Activepieces provides a visual, no-code integration builder with OAuth credential management.

#### Integration Platform: Activepieces

**Why Activepieces over n8n:** MIT license for core. n8n's "Sustainable Use License" prohibits embedding in a product offered to clients. Activepieces lets us include it in the platform legally.

**What clients see:** A "Connected Apps" page in the platform UI. Click "Connect," OAuth popup, authorize, done. No API keys, no code.

**What we see:** Pre-built flow templates that clients can enable with one click. Custom "pieces" (Activepieces term for integrations) for Succession-specific workflows.

#### Supported External Tools

Clients can connect these via Activepieces (OAuth or API key, managed in the platform):

**Call Recording / Meeting Notes:**
| Tool | What syncs to CRM |
|------|-------------------|
| Gong | Call recordings, transcripts, action items → Meeting object + Person timeline |
| Fireflies.ai | Transcripts, summaries → Meeting object + Notes |
| Granola | Meeting notes, action items → Meeting object + Notes |
| Zoom (native recording) | Recording links, transcripts → Meeting object |
| Google Meet (native) | Recording links → Meeting object |
| Microsoft Teams | Recording links, transcripts → Meeting object |

**Calendars (if not using Cal.com):**
| Tool | What syncs |
|------|-----------|
| Google Calendar | Events → Meeting objects, availability for scheduling |
| Microsoft Outlook | Events → Meeting objects |
| Calendly | Bookings → Meeting objects, linked to Person + Company |

**Communication:**
| Tool | What syncs |
|------|-----------|
| Gmail / Google Workspace | Sent/received emails → Person timeline |
| Microsoft Outlook | Sent/received emails → Person timeline |
| Slack | Channel messages, DMs (opt-in) → Activity feed |

**Other CRMs (migration source):**
| Tool | What syncs |
|------|-----------|
| HubSpot | Contacts, companies, deals, notes → Full CRM import |
| Pipedrive | Contacts, organizations, deals → Full CRM import |
| Salesforce | Contacts, accounts, opportunities → Full CRM import |

**Marketing (if not using Mautic):**
| Tool | What syncs |
|------|-----------|
| Mailchimp | Email campaign stats, subscriber activity → Person timeline |
| ActiveCampaign | Automation events, contact activity → Person timeline |

**Data / Enrichment:**
| Tool | What syncs |
|------|-----------|
| Apollo | Contact/company data → Person + Company records |
| LinkedIn Sales Navigator | Saved leads → Person records |
| ZoomInfo | Contact data → Person + Company records |

#### How Custom Integrations Work

```
1. Client opens connect.succession.bio
2. Browses available integrations
3. Clicks "Connect Gong"
4. OAuth popup → authorizes Gong access
5. Token stored encrypted in Activepieces
6. Pre-built flow activates:
   Gong call completed → webhook → Activepieces
     → extract transcript + metadata
     → match to Person by email
     → create Meeting object in CRM
     → add transcript as Note
     → update Person timeline
7. Client sees meetings auto-appearing in their CRM
```

#### Building New Integrations

To add a new integration:

1. Build an Activepieces "piece" (TypeScript, follows their SDK)
2. Define triggers (webhooks/polling) and actions (API calls)
3. Create a flow template that maps the tool's data to CRM objects
4. Test internally on our CRM instance
5. Release to clients

**Standard mapping for any meeting tool → CRM:**
```json
{
  "meeting": {
    "meetingDate": "{{source.start_time}}",
    "duration": "{{source.duration_minutes}}",
    "meetingType": "{{mapped_type}}",
    "summary": "{{source.summary || source.transcript_summary}}",
    "actionItems": "{{source.action_items}}",
    "recordingUrl": "{{source.recording_url}}"
  },
  "relations": {
    "person": "{{match_by_email(source.participants)}}",
    "company": "{{person.company}}",
    "opportunity": "{{match_open_deal(person, company)}}"
  }
}
```

### Integration Rollout Plan

**Phase 1 — Internal dogfooding (we use it first)**
- Set up our own CRM instance on the client data model
- Wire Cal.com → CRM (scheduling)
- Wire Bison/HeyReach → CRM (campaign data)
- Wire Granola → CRM (meeting notes — we already have this sync)
- Deploy Activepieces on services droplet
- Test Recall.ai for our own client calls

**Phase 2 — Core integrations for clients**
- Cal.com pre-wired (zero config for new instances)
- Succession Database → CRM import flow
- Campaign infrastructure → CRM sync
- Recall.ai meeting intelligence (included in paid plan)
- HubSpot / Pipedrive migration flows

**Phase 3 — Bring-your-own tools**
- Activepieces UI exposed to clients
- Gong, Fireflies, Google Calendar, Outlook connectors
- Gmail / Outlook email sync
- Slack integration

**Phase 4 — Marketing add-on integrations**
- Mautic ↔ CRM bidirectional sync
- Papermark → CRM document tracking
- Mailchimp / ActiveCampaign connectors (for clients not using Mautic)

---

## Future Considerations

- **Sequence Editor UI** — Replace `stepsJson` TEXT field with a visual step editor component in the CRM
- **Event ↔ Campaign linking** — When events become a first-class campaign type, add a relation from Campaign → Event Bookmark
- **Marketing objects (Mautic sync)** — When marketing add-on launches, add: Marketing Email, Landing Page, Form Submission, Web Visit objects
- **Document tracking (Papermark sync)** — Add: Shared Document object with view analytics
- **Database access tiers** — Free tier: browse-only (no `successionDbId` populated). Paid tier: import to CRM populates the link field
- **Multi-workspace** — If we move to true multi-tenant with workspace isolation, the Company Profile singleton pattern needs to be enforced at the app level
- **Real-time meeting coaching** — Recall.ai supports media streaming. Future: live prompts during calls based on what's being discussed + CRM context
- **Activepieces marketplace** — Build a library of Succession-specific flow templates that clients can one-click enable

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-28 | Initial data model | Platform launch planning |
| 2026-03-28 | Added Integrations Architecture section | Cal.com, Mautic, Papermark, Recall.ai meeting intelligence, Activepieces integration platform, bring-your-own tool support |
