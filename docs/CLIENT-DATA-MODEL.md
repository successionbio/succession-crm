# Succession CRM — Platform Architecture & Data Model

> **Source of truth** for the Succession CRM platform — data model, infrastructure, integrations, and operational requirements. This is the master reference for internal development and agency handoff. Update this document first, then update implementation to match.

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

## Billing & Payments

### Stripe Integration

| Component | Purpose |
|-----------|---------|
| Stripe Checkout | Signup flow — free tier creates account, paid tier adds payment method |
| Stripe Subscriptions | Manage £500/mo platform, £300/mo marketing add-on, DFY tiers |
| Stripe Customer Portal | Clients self-serve upgrade/downgrade, update payment, view invoices |
| Stripe Webhooks | `invoice.paid` → activate/renew, `invoice.payment_failed` → grace period, `customer.subscription.deleted` → downgrade to free |

### Subscription Lifecycle

```
Signup (free)
  → Create Stripe Customer (no payment method)
  → Provision CRM workspace + free tier access
  → MCP authenticates with API key, returns free-tier tools only

Upgrade to paid
  → Stripe Checkout with payment method
  → Webhook: subscription.created
  → Unlock full MCP tools, database export, enrichment, campaigns
  → Provision Activepieces workspace, Cal.com team, Recall.ai config

Payment failure
  → Stripe retries (3 attempts over 7 days)
  → After final failure: 7-day grace period (full access)
  → After grace: downgrade to free tier (CRM still works, paid features locked)
  → Data is NOT deleted — they can reactivate anytime

Churn from DFY
  → Cancel DFY subscription
  → Auto-create £500/mo platform subscription (or £800 with marketing)
  → Client keeps CRM, data, integrations — just loses managed service

Full cancellation
  → Downgrade to free tier (CRM + browse-only database)
  → Data retained for 90 days, then archived
  → Can reactivate within 90 days with full data restore
```

### Usage Metering

Enrichment usage tracked per client per billing cycle. Stored in Supabase, checked by the MCP before enrichment calls.

- **Free tier:** 0 enrichments (browse only)
- **Paid tier:** Fair use (~1,000/month soft cap). Alert at 80%, flag for review at 150%.
- **DFY tier:** Unlimited (included in service fee)

Fair use cap will be refined based on actual usage data from dogfooding and early clients.

---

## Auth & Identity

### Client Authentication Flow

```
Client signs up at succession.bio/signup
  → Email + password (or Google OAuth)
  → Stripe Customer created
  → Twenty CRM workspace provisioned
  → API key generated and stored
  → Client receives:
    1. CRM login URL (crm.succession.bio/workspace/{id})
    2. MCP API key (for Claude Desktop / Claude Code plugin)
    3. Welcome email with onboarding guide
```

### MCP Authentication

On every MCP startup:
1. Client's API key sent in environment variable
2. MCP calls auth gateway: `GET /auth/verify?key={API_KEY}`
3. Gateway returns: `{ tier: "paid", workspace_id: "xxx", features: [...] }`
4. MCP enables/disables tools based on tier
5. If key is invalid or subscription lapsed → MCP starts in free-tier mode

### Single Sign-On Across Services

All platform services authenticate through one identity:

| Service | Auth method |
|---------|------------|
| Twenty CRM | Native Twenty auth (email/password or SSO) |
| Activepieces | OAuth via CRM identity (Twenty as the identity provider) |
| Cal.com | OAuth via CRM identity |
| Mautic | OAuth via CRM identity (marketing add-on only) |
| MCP Plugin | API key (tied to CRM identity) |

**Implementation:** Twenty acts as the OAuth provider. All other services use "Login with Succession CRM." One login, everything connected.

### Roles & Permissions

| Role | Access |
|------|--------|
| **Admin** | Full access — billing, user management, integrations, all CRM data |
| **Manager** | CRM data, campaigns, sequences, analytics. No billing or user management. |
| **Rep** | Own contacts, assigned campaigns, meetings. Can't delete or bulk-modify. |
| **Read-only** | Browse CRM and database. Can't create or modify records. |

Roles enforced at the Twenty CRM level (Twenty has native RBAC). MCP respects the same roles via the auth gateway.

---

## Onboarding & Activation

### First 15 Minutes (the "Aha" Path)

The goal: client sees enriched data they didn't have before within 15 minutes of signing up.

```
Minute 0-2: Sign up
  → Email/password or Google OAuth
  → Choose: "Import from HubSpot" / "Import from CSV" / "Start fresh"

Minute 2-5: Migration (if importing)
  → Connect HubSpot (OAuth) or upload CSV
  → Auto-map fields, preview import
  → One click: import + auto-enrich from Succession database

Minute 5-10: Company Profile setup (guided)
  → "What does your company do?" → companyOverview
  → "Who do you sell to?" → ICP fields (industry, size, geography)
  → "What titles do you target?" → first Persona created
  → "What's your tone?" → brandTone
  → AI suggests: "Based on your ICP, here are 47 companies in our database that match."

Minute 10-15: The "aha" moment
  → Client sees 47 matching companies they didn't know about
  → Each pre-scored with ICP fit score
  → Click one: full company profile, employees, publications, funding
  → "Upgrade to export these and start reaching out" (if free tier)
  → OR: "Here are 12 contacts at these companies" (if paid)
```

### Onboarding Checklist (tracked in CRM)

Automatically created as Tasks in the client's CRM when they sign up:

- [ ] Complete company profile
- [ ] Create at least one persona
- [ ] Import or add 10+ contacts
- [ ] Browse the life science database
- [ ] Connect calendar (Cal.com or external)
- [ ] Send first campaign (or schedule a sequence)
- [ ] Book first meeting through the platform

Each task links to a help doc. Progress visible in a "Getting Started" dashboard widget.

---

## Email Sending Infrastructure

### The Question: Bison, or Build Our Own?

This is a key architectural decision that affects cost, control, and client experience.

**Option A: Clients use Bison (our existing infrastructure)**
- Bison handles deliverability, warm-up, sending limits, bounce handling
- We already have the API integration built
- Clients get sender accounts provisioned through our system
- We control the sending reputation
- Risk: Bison is a dependency. If they change pricing or terms, we're exposed.

**Option B: Clients bring their own sending**
- Client connects their Gmail/Outlook/SMTP via OAuth
- We route sequences through their own email
- They own their sending reputation
- More complex to manage (every client's deliverability is different)
- No dependency on a third-party sending service

**Option C: Hybrid (recommended)**
- Default: Bison-powered sending through Succession domains (managed warm-up, shared reputation)
- Optional: Client connects their own email (Gmail/Outlook) for personal sending
- Both options available, client chooses per campaign

### Domain & Deliverability Setup (for managed sending)

When a client upgrades to paid:

1. Provision sending domain(s): `{client}.outbound.succession.bio` or client's own domain
2. Configure SPF, DKIM, DMARC records
3. Warm up mailboxes (gradual volume increase over 2-3 weeks)
4. Monitor deliverability metrics per client
5. Bounce handling: auto-remove hard bounces, flag soft bounces

### Sending Limits

| Tier | Daily limit per mailbox | Mailboxes included |
|------|------------------------|--------------------|
| Paid (£500/mo) | 50 emails/day | 3 mailboxes |
| Marketing add-on | 5,000 marketing emails/mo (Mautic) | Separate from outbound |
| DFY | Managed by our team | As needed |

---

## Analytics & Reporting

### Pre-Built Dashboards

Twenty CRM has a native dashboard builder. Each client instance ships with pre-configured dashboards:

**Pipeline Dashboard**
- Deal count by stage (funnel visualization)
- Total pipeline value
- Average deal size
- Win rate (closed won / total closed)
- Average time in each stage
- Deals created this month vs last

**Campaign Performance Dashboard**
- Active campaigns with key stats (sent, opened, replied, meetings)
- Reply rate by campaign
- Best-performing sequences
- Meetings booked this week/month
- Lead stage distribution across all campaigns

**Database & Enrichment Dashboard**
- Total contacts and companies in CRM
- Enrichment status breakdown (enriched vs pending vs failed)
- ICP score distribution
- Contacts by source (database, import, inbound, event)
- Enrichment usage this month

**Meeting Intelligence Dashboard** (when Recall.ai is active)
- Meetings this week/month
- Average meeting duration
- Outcome distribution (positive/neutral/negative)
- Action items created vs completed
- Competitor mentions trend
- Signals detected from meetings

### Custom Dashboards

Clients can build their own dashboards using Twenty's dashboard builder. They can create charts, tables, and KPIs from any CRM data.

**Question to resolve:** Can we build custom dashboard templates that auto-populate with the client's data? Or does Twenty's dashboard system require manual setup per instance? Needs investigation during dogfooding phase.

---

## Provisioning Automation

### New Client Script

Goal: fully automated provisioning. Admin runs one command, everything is set up.

```bash
node provision-client.js \
  --name "Acme Biotech" \
  --email "founder@acmebio.com" \
  --tier "paid" \
  --stripe-customer "cus_xxx"
```

**What it does:**
1. Create Twenty CRM workspace
2. Run `setup-client-schema.js` (data model)
3. Create admin user account
4. Generate MCP API key
5. Create Activepieces workspace
6. Create Cal.com team/org
7. Provision sending domain + start warm-up
8. Create onboarding task checklist
9. Send welcome email with credentials
10. If migrating: trigger import flow

### Infrastructure Per Client

| Component | Per-client cost | Provisioning |
|-----------|----------------|-------------|
| CRM workspace | ~£2/mo (multi-tenant DB share) | Automated |
| Activepieces workspace | ~£1/mo | Automated |
| Cal.com team | ~£0.50/mo | Automated |
| Sending mailboxes (3x) | ~£5/mo | Semi-automated (DNS verification manual) |
| Recall.ai | Usage-based (~£10/mo avg) | Automated |
| **Total infra per client** | **~£18.50/mo** | |

At £500/mo subscription, that's 96% gross margin before enrichment costs.

---

## Outstanding Questions

### Email Sending

- [ ] **Bison dependency:** Do we continue with Bison for campaign sending, or build/adopt our own sending infrastructure? Bison works well but is a third-party dependency. If we scale to 100+ clients all sending through Bison, what's the cost/risk model?
- [ ] **Client-owned sending:** If a client wants to send from their own domain (not ours), what's the setup flow? Do we manage their DNS, or do they?
- [ ] **Deliverability monitoring:** Do we need a dedicated deliverability tool, or can we build monitoring from Bison's reporting API?

### Analytics & Dashboards

- [ ] **Twenty dashboard templates:** Can we pre-build dashboard templates that auto-populate per client? Or does each dashboard need manual configuration? Need to test during dogfooding.
- [ ] **Custom reporting API:** If Twenty's built-in dashboards aren't flexible enough, do we build a separate analytics layer? Or embed something like Metabase?

### Mobile

- [ ] **Twenty mobile readiness:** Twenty's current mobile experience is limited. This is not a launch blocker but needs to be on the roadmap. Options: responsive web improvements, PWA, or native mobile app.
- [ ] **MCP on mobile:** Claude has mobile apps. Can clients use the MCP from Claude's mobile app? Need to test.
- [ ] **Push notifications:** Cal.com meeting reminders, signal alerts, deal updates — these need a mobile notification channel. Novu (OSS notification infra) could handle this.

### Legal & Compliance

- [ ] **Terms of Service:** Need TOS covering: data ownership, data flywheel (do enriched contacts feed back into our database?), acceptable use, liability limits.
- [ ] **Data Processing Agreement (DPA):** Required for GDPR compliance. Must define: what data we process, where it's stored, retention periods, deletion rights.
- [ ] **Data residency:** Supabase and the services droplet are in specific regions. EU clients may require EU-only data storage. Need to define our data residency policy.
- [ ] **HIPAA:** Some life science clients handle patient-adjacent data. Do we need a BAA? Recall.ai offers HIPAA BAA on their Enterprise tier. If a client records calls discussing patient data, this matters.
- [ ] **Recording consent:** Two-party consent laws (California, Illinois, EU). Need: (1) consent language in Cal.com booking confirmations, (2) Recall.ai bot announces recording on join, (3) opt-out mechanism. Document jurisdiction requirements.
- [ ] **Data flywheel legal review:** If we store enriched professional contact data back into our database (name, title, company, work email), this needs explicit TOS coverage and potentially GDPR legal basis analysis. Life science data has extra sensitivity.
- [ ] **AGPL compliance:** Our CRM fork is public. Need to ensure any modifications include proper notices per AGPL Section 5. The NOTICE.md is in place but needs ongoing compliance as we add code.

### Support

- [ ] **Support model by tier:** Free = docs/community only? Paid = email support? DFY = dedicated Slack channel? Define SLAs.
- [ ] **Help docs / knowledge base:** Where does this live? Self-hosted (GitBook, Docusaurus) or SaaS (Notion, Intercom)?
- [ ] **In-app support:** Chat widget in the CRM? Or just a "Help" link to docs?
- [ ] **Bug reporting:** GitHub Issues on the public repo? Or a private support channel?
- [ ] **Onboarding calls:** Do paid clients get a 30-min onboarding call? Or is it fully self-serve with async support?

### Infrastructure & Ops

- [ ] **Backup strategy:** Client data backup frequency, retention, restore process. Twenty uses Postgres — need automated pg_dump or WAL-based backups.
- [ ] **Disaster recovery:** If the services droplet goes down, what's the recovery time? Do we need a hot standby?
- [ ] **Monitoring:** Uptime monitoring for CRM, Cal.com, Mautic, Activepieces. Consider OpenStatus (OSS, on Twenty's friends list) for a public status page.
- [ ] **Alerting:** Who gets paged when something breaks? PagerDuty/OpsGenie, or simpler (Slack alerts)?
- [ ] **Scaling:** At what client count does a single services droplet become insufficient? What's the vertical scaling ceiling before we need horizontal scaling?

---

## Risk Register

Issues that must be actively managed as the platform is built and launched.

### Execution Complexity

**Risk:** We're building 12+ systems (CRM, Cal.com, Mautic, Activepieces, Recall.ai, MCP, database API, auth, billing, migration tooling, enrichment proxy, marketing site). A small team cannot ship and maintain all of this simultaneously.

**Mitigation:** Ruthless phasing. Phase 1 = CRM + database browse + MCP + auth/billing. Nothing else. Each subsequent phase adds ONE system, fully stabilized before the next. Dogfooding internally catches issues before client exposure.

### Free Migration Cost

**Risk:** "Free migration from any CRM" could consume 2-8 hours per client for complex imports (50k+ contacts, custom properties, workflow migration). At scale, this doesn't work.

**Mitigation:** Automate 90% of migrations. Self-serve migration wizard for simple cases (CSV, standard HubSpot/Pipedrive). Set a complexity threshold — under 10k contacts = automated. Over that = guided self-serve or paid migration service (one-time fee).

### Fair Use Enrichment Limits

**Risk:** £500/mo flat pricing with "fair use" enrichment means a heavy user (15 reps, 3,000 enrichments/month) could cost £300-450/mo in third-party API fees. Margin goes to zero.

**Mitigation:** Define a real number for fair use before launching (likely ~1,000 enrichments/month). Alert at 80%, require conversation at 150%. Consider a second tier (£1,000/mo) for heavy users once usage patterns are clear. As the proprietary database grows, more lookups hit our data (zero cost) instead of third-party APIs.

### AGPL Exposure

**Risk:** Everything built in the CRM repo is public. A competitor could fork our UI customizations, custom apps, and Twenty integrations.

**Mitigation:** Keep the CRM layer thin. The CRM is a display shell — the intelligence (AI skills, enrichment pipeline, database, context engine logic) lives in private repos. If a competitor forks the CRM, they get a nice UI with no brains behind it.

### Twenty CRM Dependency

**Risk:** Twenty is a 2-year-old open-source project. It could pivot, abandon self-hosting, or break API compatibility in a major version.

**Mitigation:** Build via Twenty's API and custom objects, not by modifying core source code. If Twenty breaks compatibility, pin to a stable version. If abandoned, we maintain the fork — AGPL guarantees we always have the code. The fork approach is still 10x cheaper than building a CRM from scratch.

### Recall.ai Vendor Lock-In

**Risk:** Meeting Intelligence becomes a key differentiator. Recall.ai is the only provider for the "bot joins meetings" capability. Price increases or acquisition could impact us.

**Mitigation:** Abstract the recording layer as a pluggable module. The AI analysis pipeline (the real value) only needs a transcript — it doesn't care where it comes from. If an OSS meeting bot emerges, swap it in. Clients using Gong/Fireflies get context-aware analysis through the Activepieces integration path regardless.

### Multi-Tenant Data Isolation

**Risk:** Multiple clients on the same Twenty instance. A bug exposing Client A's data to Client B would destroy trust.

**Mitigation:** Verify Twenty's workspace isolation thoroughly during dogfooding. High-value DFY clients get isolated instances if needed. Implement audit logging. Security review and penetration testing before going multi-tenant with external clients.

### Call Recording Consent

**Risk:** Two-party consent laws (California, Illinois, EU countries) require all parties to agree to recording. If the platform makes it easy to record without consent, legal liability follows.

**Mitigation:** Build consent into the product flow. Cal.com booking confirmations include consent language. Recall.ai bot announces itself when joining. Provide per-meeting recording toggle. Document jurisdiction requirements and surface them during onboarding.

### Market Validation

**Risk:** The entire plan assumes life science SMBs want an integrated platform and will switch CRMs. This has not been validated with cold prospects (only existing DFY clients who are biased).

**Mitigation:** Before building beyond Phase 1, get 10+ conversations with life science founders/sales leaders who are NOT current clients. Test the offer: "Free CRM, free migration, life science database, AI tools. Would you switch?" If <50% say yes, rethink the positioning before investing further.

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
- **Mobile experience** — PWA or native app when Twenty's mobile support matures
- **AI-powered pipeline forecasting** — Use meeting outcomes, signal data, and campaign engagement to predict deal close probability

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-28 | Initial data model — 4 layers, 13 objects | Platform launch planning |
| 2026-03-28 | Added Integrations Architecture | Cal.com, Mautic, Papermark, Recall.ai, Activepieces, BYOT support |
| 2026-03-28 | Added Billing, Auth, Onboarding, Email, Analytics, Outstanding Questions, Risk Register | Complete platform architecture |
