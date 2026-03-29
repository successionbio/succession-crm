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
├── Meeting .............. Meetings with prospects/customers
└── Suggested Action ..... AI-generated action queue (the rep's "what to do next")
```

---

## Layer 1: Standard Objects

Fields marked 🔒 are **hidden by default** — they exist for reporting, forecasting, and attribution but aren't shown in standard views. Clients can unhide any field.

### Company

Represents a prospect, customer, partner, or competitor in the client's pipeline.

**Standard Twenty fields:** name, domainName, address, employees, linkedinUrl, annualRecurringRevenue, idealCustomerProfile

**Custom fields — Core (visible):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `industry` | SELECT | Life science sub-industry | Biotech, Pharma, CRO, CDMO, Med Device, Diagnostics, Lab Equipment, Reagents, Digital Health, Other |
| `therapeuticArea` | TEXT | Target therapeutic area | e.g., oncology, neuroscience, immunology, rare disease |
| `technology` | TEXT | Technology / modality | e.g., mRNA, cell therapy, CRISPR, antibodies, small molecule |
| `fundingStage` | SELECT | Funding stage | Pre-Seed, Seed, Series A, Series B, Series C+, Public, Private (Bootstrapped) |
| `companyType` | SELECT | Relationship type | Prospect (default), Customer, Partner, Competitor, Other |
| `companyStatus` | SELECT | Lifecycle status | New, Active, Engaged, Customer, Churned, Do Not Contact |
| `websiteUrl` | LINK | Company website | |
| `yearFounded` | NUMBER | Year founded | |
| `totalFunding` | CURRENCY | Total funding raised | |
| `lastFundingDate` | DATE | Date of most recent funding round | |
| `headquartersCountry` | TEXT | HQ country | |
| `headquartersCity` | TEXT | HQ city | |
| `ownerUserId` | RELATION | Account owner (rep assigned) | Links to CRM user |
| `doNotContact` | BOOLEAN | Blacklisted — exclude all contacts from outreach | Default: false. Applies to all People at this company. |
| `dncReason` | SELECT | Why this company is blacklisted | Competitor, Existing Customer, Requested Removal, Bad Fit, Other |

**Custom fields — ICP & Scoring (visible):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `icpScore` | NUMBER | AI-generated ICP fit score | 0-100, calculated by qualification skill |
| `icpScoreReason` | TEXT | Why this company scored this way | Auto-populated by AI |
| `icpTier` | SELECT | ICP tier classification | Tier 1 (best fit), Tier 2 (good fit), Tier 3 (marginal), Not a fit |

**Custom fields — Engagement & Signals (visible):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `recentSignal` | TEXT | Most recent trigger event | Auto-populated from Signal objects |
| `recentSignalDate` | DATE_TIME | When the signal occurred | |
| `totalContacts` | NUMBER | Number of People linked to this company | Auto-calculated |
| `totalOpenDeals` | NUMBER | Number of open Opportunities | Auto-calculated |
| `totalDealValue` | CURRENCY | Sum of open Opportunity amounts | Auto-calculated |

**Custom fields — Enrichment (hidden 🔒):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `enrichmentStatus` | SELECT | Enrichment state | Not Enriched (default), Enriched, Failed |
| `lastEnrichedAt` | DATE_TIME | Last enrichment timestamp | |
| `enrichmentSource` | TEXT | Which provider enriched this record | |
| `successionDbId` | TEXT | Succession database record ID | Hidden. Links to our database. |

**Custom fields — Attribution & Reporting (hidden 🔒):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `firstTouchSource` | SELECT | How this company first entered the CRM | Database, Import, Inbound, Event, Referral, Signal, Manual |
| `firstTouchDate` | DATE_TIME | When the company was first added | Auto-set on creation |
| `firstTouchCampaign` | TEXT | Campaign that first touched this company | Auto-populated |
| `lastActivityDate` | DATE_TIME | Most recent activity on this account | Auto-updated |
| `lastContactedDate` | DATE_TIME | Last outreach to any contact at this company | Auto-updated |
| `daysSinceLastActivity` | NUMBER | Days since last activity | Auto-calculated, for stale account reports |
| `totalEmailsSent` | NUMBER | Emails sent to contacts at this company | Aggregate, for reporting |
| `totalReplies` | NUMBER | Replies from contacts at this company | Aggregate |
| `totalMeetings` | NUMBER | Meetings held with this company | Aggregate |
| `conversionDate` | DATE_TIME | When company first became a Customer | Auto-set when companyType changes to Customer |

### Person

Represents a contact at a prospect/customer company.

**Standard Twenty fields:** firstName, lastName, email, phone, jobTitle, linkedinUrl, city, avatarUrl, company (relation)

**Custom fields — Core (visible):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `seniority` | SELECT | Seniority level | C-Suite, VP, Director, Manager, Individual Contributor |
| `department` | SELECT | Functional department | R&D, Clinical, Commercial, Manufacturing, Regulatory, Operations, Finance, IT, Procurement, Quality |
| `leadStage` | SELECT | Current outreach stage | New (default), Contacted, Engaged, Meeting Booked, Meeting Completed, Qualified, Unqualified, Nurture, Customer, Do Not Contact |
| `leadSource` | SELECT | How this person was found | Database, Enrichment, Import, Inbound, Referral, Event, Manual, Website |
| `sentiment` | SELECT | Latest sentiment from outreach | Positive, Neutral, Negative |
| `ownerUserId` | RELATION | Contact owner (rep assigned) | Links to CRM user |
| `researchArea` | TEXT | Research focus area | For scientists and R&D contacts |
| `personalNote` | TEXT | Rep's personal notes about this contact | |
| `doNotContact` | BOOLEAN | Blacklisted — exclude from all outreach | Default: false. Checked by campaign launch workflow. |
| `dncReason` | SELECT | Why this person is blacklisted | Unsubscribed, Competitor, Existing Customer, Requested Removal, Bounced, Other |
| `dncDate` | DATE_TIME | When DNC was set | Auto-set when `doNotContact` flips to true |

**Custom fields — Scoring (visible):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `engagementScore` | NUMBER | Score based on activity (email opens, clicks, meetings, website visits) | 0-100, auto-calculated |
| `fitScore` | NUMBER | Score based on ICP match (title, seniority, department, company fit) | 0-100, auto-calculated |
| `combinedScore` | NUMBER | Weighted combination of engagement + fit | 0-100, auto-calculated |
| `scoreLastUpdated` | DATE_TIME | When scores were last recalculated | |
| `personaMatch` | TEXT | Which persona this person best matches | Auto-populated by AI |
| `buyingRole` | SELECT | Role in purchasing decisions | Champion, Decision Maker, Influencer, End User, Gatekeeper, Unknown |

**Custom fields — Communication & Engagement (hidden 🔒):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `emailStatus` | SELECT | Email deliverability status | Valid, Invalid, Catch-All, Unknown, Bounced |
| `emailVerifiedAt` | DATE_TIME | When email was last verified | |
| `totalEmailsSent` | NUMBER | Emails sent to this person | Auto-counted |
| `totalEmailsOpened` | NUMBER | Emails opened by this person | Auto-counted |
| `totalEmailsClicked` | NUMBER | Email links clicked | Auto-counted |
| `totalEmailsReplied` | NUMBER | Email replies received | Auto-counted |
| `lastEmailSentDate` | DATE_TIME | Most recent email sent | |
| `lastEmailOpenedDate` | DATE_TIME | Most recent email opened | |
| `lastReplyDate` | DATE_TIME | Most recent reply received | |
| `linkedinConnected` | BOOLEAN | Connected on LinkedIn? | |
| `linkedinMessagesSent` | NUMBER | LinkedIn messages sent | Auto-counted |
| `linkedinMessagesReplied` | NUMBER | LinkedIn message replies | Auto-counted |
| `totalMeetings` | NUMBER | Meetings held with this person | Auto-counted |
| `lastMeetingDate` | DATE_TIME | Most recent meeting | |
| `websiteVisits` | NUMBER | Website visits tracked (marketing add-on) | Auto-counted, Phase 3+ |
| `lastWebsiteVisit` | DATE_TIME | Most recent website visit | Phase 3+ |

**Custom fields — Attribution (hidden 🔒):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `firstTouchSource` | SELECT | Original source | Database, Import, Inbound, Event, Referral, Website, Manual |
| `firstTouchCampaign` | TEXT | First campaign that touched this person | Auto-populated |
| `firstTouchDate` | DATE_TIME | When person first entered CRM | Auto-set on creation |
| `convertingCampaign` | TEXT | Campaign that converted them (led to meeting/qualified) | Auto-set on stage change |
| `convertingDate` | DATE_TIME | When they converted | |
| `lastTouchCampaign` | TEXT | Most recent campaign | Auto-updated |
| `lastTouchDate` | DATE_TIME | Most recent campaign touchpoint | |
| `totalCampaignsTouched` | NUMBER | Number of campaigns this person has been in | Auto-counted |
| `daysSinceFirstTouch` | NUMBER | Days since first entered CRM | Auto-calculated |
| `daysSinceLastTouch` | NUMBER | Days since last activity | Auto-calculated |

**Custom fields — Enrichment (hidden 🔒):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `enrichmentStatus` | SELECT | Enrichment state | Not Enriched (default), Enriched, Failed |
| `lastEnrichedAt` | DATE_TIME | Last enrichment timestamp | |
| `enrichmentSource` | TEXT | Which provider enriched this record | |
| `successionDbId` | TEXT | Succession database record ID | Hidden. Links to our database. |
| `secondaryEmail` | TEXT | Alternative email address | From enrichment |
| `mobilePhone` | TEXT | Mobile phone number | From enrichment |
| `linkedinHeadline` | TEXT | LinkedIn headline | From enrichment |

### Opportunity

Represents a deal in the sales pipeline.

**Standard Twenty fields:** name, amount, stage, closeDate, company (relation), person (relation)

**Custom pipeline stages:** Lead → Discovery → Proposal → Negotiation → Closed Won / Closed Lost

**Custom fields — Core (visible):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `dealType` | SELECT | Type of deal | New Business, Expansion, Renewal, Other |
| `monthlyValue` | CURRENCY | Monthly recurring value | For subscription/retainer deals |
| `annualValue` | CURRENCY | Annual contract value | Auto-calculated from amount or monthlyValue × 12 |
| `probability` | NUMBER | Win probability % | Auto-suggested by stage, manually adjustable |
| `weightedValue` | CURRENCY | Amount × probability | Auto-calculated, for forecasting |
| `nextStep` | TEXT | What needs to happen next | Rep fills in after each interaction |
| `competitorInDeal` | TEXT | Competing vendor(s) if known | |
| `championName` | TEXT | Internal champion at the prospect | |
| `decisionMaker` | TEXT | Who makes the final call | |
| `ownerUserId` | RELATION | Deal owner (rep assigned) | Links to CRM user |

**Custom fields — Forecasting (visible):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `forecastCategory` | SELECT | Forecast classification | Pipeline, Best Case, Commit, Closed Won, Closed Lost, Omitted |
| `forecastLastUpdated` | DATE_TIME | When forecast was last reviewed | |
| `originalCloseDate` | DATE | First close date set | Auto-set, never changes — for slippage tracking |
| `closeDatePushCount` | NUMBER | How many times close date was pushed | Auto-incremented, for reporting |

**Custom fields — Attribution (hidden 🔒):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `sourceChannel` | SELECT | Originating channel | Email Campaign, LinkedIn Campaign, Inbound, Referral, Event, Signal, Other |
| `sourceCampaign` | TEXT | Campaign that generated this deal | Auto-populated |
| `sourceSignal` | TEXT | Signal that triggered the deal | If originated from a signal |
| `createdDate` | DATE_TIME | When deal was created | Auto-set |
| `stageEnteredDate` | DATE_TIME | When deal entered current stage | Auto-updated on stage change |
| `daysInCurrentStage` | NUMBER | Days in current stage | Auto-calculated |
| `totalDaysOpen` | NUMBER | Total days deal has been open | Auto-calculated |
| `averageStageDuration` | TEXT | JSON: days spent in each stage | Auto-tracked: `{"Lead": 3, "Discovery": 7, ...}` |

**Custom fields — Close Analysis (hidden 🔒):**

| Field | Type | Description | Options/Notes |
|-------|------|-------------|---------------|
| `lostReason` | SELECT | Why the deal was lost | No Budget, No Need, Competitor Won, Timing, No Response, Other |
| `lostReasonDetail` | TEXT | Free-text detail on lost reason | |
| `lostToCompetitor` | TEXT | Which competitor won | |
| `wonDate` | DATE_TIME | Date deal closed won | Auto-set |
| `lostDate` | DATE_TIME | Date deal closed lost | Auto-set |
| `salesCycleDays` | NUMBER | Days from creation to close | Auto-calculated on close |
| `totalMeetingsInDeal` | NUMBER | Meetings held during this deal | Auto-counted |
| `totalEmailsInDeal` | NUMBER | Emails exchanged during this deal | Auto-counted |

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

**Core fields (visible):**

| Field | Type | Description |
|-------|------|-------------|
| `name` | TEXT | Campaign name (Twenty standard) |
| `channel` | SELECT | Email, LinkedIn, Multi-Channel |
| `campaignStatus` | SELECT | Draft (default), Scheduled, Active, Paused, Completed |
| `campaignType` | SELECT | Cold Outbound, Nurture, Event Follow-Up, Re-Engagement, ABM, Signal-Triggered |
| `theme` | TEXT | Campaign angle or topic |
| `targetAudience` | TEXT | Description of who this campaign targets |
| `launchedAt` | DATE_TIME | When campaign went live |
| `completedAt` | DATE_TIME | When campaign finished |
| `scheduledAt` | DATE_TIME | When campaign is scheduled to launch |
| `ownerUserId` | RELATION | Campaign owner (rep or manager) |

**Performance stats (visible):**

| Field | Type | Description |
|-------|------|-------------|
| `totalLeads` | NUMBER | Total leads in campaign |
| `totalSent` | NUMBER | Messages sent |
| `totalDelivered` | NUMBER | Messages delivered |
| `totalOpened` | NUMBER | Messages opened |
| `totalClicked` | NUMBER | Links clicked |
| `totalReplied` | NUMBER | Replies received |
| `totalPositive` | NUMBER | Positive replies |
| `totalNegative` | NUMBER | Negative replies (opt-outs, not interested) |
| `totalBounced` | NUMBER | Bounced messages |
| `meetingsBooked` | NUMBER | Meetings booked from campaign |
| `dealsCreated` | NUMBER | Opportunities created from campaign |
| `revenueGenerated` | CURRENCY | Total deal value attributed to campaign |

**Rates (auto-calculated, visible):**

| Field | Type | Description |
|-------|------|-------------|
| `deliveryRate` | NUMBER | % delivered / sent |
| `openRate` | NUMBER | % opened / delivered |
| `clickRate` | NUMBER | % clicked / delivered |
| `replyRate` | NUMBER | % replied / delivered |
| `positiveReplyRate` | NUMBER | % positive / replied |
| `bounceRate` | NUMBER | % bounced / sent |
| `meetingRate` | NUMBER | % meetings / total leads |
| `costPerMeeting` | CURRENCY | If budget is set: budget / meetings booked |

**Attribution & reporting (hidden 🔒):**

| Field | Type | Description |
|-------|------|-------------|
| `budget` | CURRENCY | Campaign budget (optional) |
| `costPerLead` | CURRENCY | Budget / total leads |
| `roi` | NUMBER | % return: (revenue - budget) / budget |
| `averageResponseTime` | NUMBER | Average hours between send and first reply |
| `stepsCompleted` | NUMBER | How many sequence steps have fully executed |
| `totalSteps` | NUMBER | Total steps in the sequence |
| `lastStatsSync` | DATE_TIME | When stats were last refreshed |

**Relations:**
- → Persona (many-to-one) — which persona this campaign targets
- → Sequence (many-to-one) — messaging used
- → Event Bookmark (many-to-one, optional) — if event-related campaign

### Campaign Membership

Junction table linking People to Campaigns. Tracks per-lead stage and engagement within a campaign.

**Core fields (visible):**

| Field | Type | Description |
|-------|------|-------------|
| `leadStage` | SELECT | Not Contacted (default), Contacted, Engaged, Meeting Booked, Meeting Completed, Qualified, Unqualified, Nurture, Opted Out |
| `sentiment` | SELECT | Positive, Neutral, Negative |
| `channel` | SELECT | Email, LinkedIn |
| `addedAt` | DATE_TIME | When lead was added to campaign |
| `currentStep` | NUMBER | Which sequence step the lead is on |

**Engagement tracking (hidden 🔒):**

| Field | Type | Description |
|-------|------|-------------|
| `emailsSent` | NUMBER | Emails sent to this lead in this campaign |
| `emailsOpened` | NUMBER | Emails opened |
| `emailsClicked` | NUMBER | Links clicked |
| `emailsReplied` | NUMBER | Replies |
| `lastSentDate` | DATE_TIME | Last email/message sent |
| `lastOpenedDate` | DATE_TIME | Last email opened |
| `lastRepliedDate` | DATE_TIME | Last reply received |
| `stageChangedDate` | DATE_TIME | When stage last changed |
| `linkedinSent` | NUMBER | LinkedIn messages sent |
| `linkedinReplied` | NUMBER | LinkedIn replies |
| `meetingBookedDate` | DATE_TIME | When meeting was booked (if applicable) |
| `optedOutDate` | DATE_TIME | When lead opted out (if applicable) |
| `optedOutReason` | TEXT | Reason for opt-out |

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

**Core fields (visible):**

| Field | Type | Description |
|-------|------|-------------|
| `signalType` | SELECT | Funding, New Hire, Product Launch, Publication, Regulatory, Partnership, Acquisition, Clinical Trial, Leadership Change |
| `headline` | TEXT | Short description of the signal |
| `details` | TEXT | Full context |
| `sourceUrl` | TEXT | Where the signal was found |
| `detectedAt` | DATE_TIME | When the signal was detected |
| `relevanceScore` | NUMBER | AI-scored relevance to client's ICP (0-100) |
| `suggestedAction` | TEXT | AI-suggested next step (e.g., "Reach out — they just raised Series B") |
| `isActioned` | BOOLEAN | Has someone acted on this signal? |
| `actionedDate` | DATE_TIME | When someone acted on it |
| `actionTaken` | TEXT | What was done (e.g., "Added to Q2 outbound campaign") |

**Relations:**
- → Company (many-to-one)
- → Person (many-to-one, optional) — if the signal relates to a specific person (e.g., new hire)

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

Meetings with prospects and customers. Linked to Cal.com calendar events and Recall.ai recordings.

**Core fields (visible):**

| Field | Type | Description |
|-------|------|-------------|
| `meetingDate` | DATE_TIME | When the meeting occurred |
| `duration` | NUMBER | Duration in minutes |
| `meetingType` | SELECT | Discovery, Demo, Proposal Review, Follow-Up, Negotiation, Onboarding, QBR, Internal, Other |
| `summary` | TEXT | AI-generated meeting summary (context-aware) |
| `actionItems` | TEXT | AI-extracted action items |
| `outcome` | SELECT | Positive, Neutral, Negative, No Show |
| `nextSteps` | TEXT | Agreed next steps |
| `competitorsMentioned` | TEXT | Competitors discussed in the meeting |
| `buyingSignals` | TEXT | Buying signals detected (e.g., "asked about pricing", "mentioned budget timeline") |
| `recordingUrl` | TEXT | Recording link (Recall.ai or external) |
| `transcriptUrl` | TEXT | Full transcript link |

**Tracking fields (hidden 🔒):**

| Field | Type | Description |
|-------|------|-------------|
| `calendarEventId` | TEXT | Cal.com event ID |
| `recallBotId` | TEXT | Recall.ai bot instance ID |
| `isRecorded` | BOOLEAN | Was this meeting recorded? |
| `isTranscribed` | BOOLEAN | Has the transcript been processed? |
| `aiProcessedAt` | DATE_TIME | When AI analysis was completed |
| `preCallBriefGenerated` | BOOLEAN | Was a pre-call brief generated? |
| `attendeeEmails` | TEXT | Comma-separated attendee emails (for matching) |
| `meetingSource` | SELECT | Cal.com, Google Calendar, Outlook, Manual |
| `noShowFollowUpSent` | BOOLEAN | Was a no-show follow-up triggered? |

**Relations:**
- → Person (many-to-one) — primary contact in the meeting
- → Company (many-to-one)
- → Opportunity (many-to-one) — deal this meeting relates to
- → Campaign (many-to-one, optional) — if meeting was booked from a campaign

### Suggested Action

AI-generated recommendations for the rep. The **action queue** — a proactive feed of what to do next, powered by the context engine and multiple workflows.

**Core fields (visible):**

| Field | Type | Description |
|-------|------|-------------|
| `title` | TEXT | Short action title (e.g., "Reach out to Xenogen Labs — Series B funding") |
| `description` | TEXT | AI-generated reasoning and context |
| `actionType` | SELECT | Outreach, Follow-Up, Research, Add to Campaign, Schedule Meeting, Send Document, Review Deal, Other |
| `priority` | SELECT | High, Medium, Low |
| `status` | SELECT | New (default), Accepted, Completed, Dismissed, Snoozed |
| `suggestedMessage` | TEXT | Draft email/LinkedIn body if applicable (subject line in first line) |
| `snoozedUntil` | DATE_TIME | If snoozed, when to resurface as New |
| `sourceType` | SELECT | Signal, Pipeline Coach, Campaign Alert, Meeting Follow-Up, Enrichment, ICP Match, No-Show Recovery, Lead Recycler |
| `completedAt` | DATE_TIME | When the action was completed |
| `completedNote` | TEXT | What was done (optional — rep can add context) |

**Relations:**
- → Person (many-to-one, optional)
- → Company (many-to-one, optional)
- → Opportunity (many-to-one, optional)
- → Signal (many-to-one, optional) — if triggered by a signal
- → Campaign (many-to-one, optional) — if triggered by campaign performance
- → Meeting (many-to-one, optional) — if triggered by a meeting

**Default view:** "Action Queue" — filtered to `status = New`, sorted by `priority` (High first), then `createdAt` (newest first). Completed, Dismissed, and Snoozed actions are hidden from the default view but available via an "All Actions" view for reporting.

**Lifecycle:**
```
New → Accepted → Completed (hidden from default view)
New → Dismissed (hidden)
New → Snoozed → resurfaces as New on snoozedUntil date (via scheduled workflow)
```

**Workflows that write to Suggested Action:**
- Signal-Triggered Outreach Suggester → `sourceType: Signal`
- Stale Deal Nudger → `sourceType: Pipeline Coach`
- Campaign Performance Alerter → `sourceType: Campaign Alert`
- Meeting Follow-Up Drafter → `sourceType: Meeting Follow-Up`
- No-Show Recovery → `sourceType: No-Show Recovery`
- Post-Campaign Lead Recycler → `sourceType: Lead Recycler`
- New Company ICP Qualifier (Tier 1 matches) → `sourceType: ICP Match`

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
│   ├── Meeting → Opportunity
│   └── Suggested Action
├── Campaign Membership
├── Signal → Suggested Action
├── Meeting → Suggested Action
├── Suggested Action
└── Opportunity → Suggested Action

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

### Architecture: Two Automation Layers

The platform has two distinct automation layers that serve different purposes:

**Layer A: Twenty Workflows (internal automation)**
- Triggers on CRM events, schedules, and webhooks
- Handles all internal logic: record creation, AI analysis, notifications
- Pre-loaded into every client instance during provisioning (via Twenty's workflow API)
- Client can view, modify, and create additional workflows in the CRM UI

**Layer B: Activepieces (external tool connections)**
- The "Connected Apps" UI where clients OAuth into their external tools
- Handles credential management (encrypted token storage, auto-refresh)
- Routes external tool events into Twenty via webhook triggers
- Client sees a simple "Connect Gong" / "Connect Google Calendar" interface

**Why both:** Twenty workflows are powerful but don't manage OAuth tokens for external services. A client shouldn't need to configure webhooks or paste API keys. Activepieces gives them a friendly "click to connect" experience for their external tools, then routes data into Twenty where workflows take over.

```
External Tools                Activepieces                Twenty CRM
──────────────                ────────────                ──────────
Gong ──── OAuth ────→ ┌─────────────────────┐  webhook  ┌──────────────────┐
Calendar ─ OAuth ────→ │  connect.succession │ ────────→ │  Workflows       │
Slack ──── OAuth ────→ │  .bio               │           │  (pre-loaded)    │
Fireflies  OAuth ────→ │                     │           │                  │
                       │  Credential store   │           │  Create Meeting  │
                       │  Flow routing       │           │  Update Person   │
                       │  Data mapping       │           │  Generate Notes  │
                       └─────────────────────┘           │  Score ICP       │
                                                         │  Send alerts     │
Cal.com ───── webhook directly ────────────────────────→ │                  │
Recall.ai ─── webhook directly ────────────────────────→ │                  │
Succession DB ─── Platform API ────────────────────────→ │                  │
                                                         └──────────────────┘
```

Note: Cal.com and Recall.ai webhook directly into Twenty (no Activepieces needed) because they're our pre-wired tools — we control the configuration. Activepieces is for tools the CLIENT brings.

### Infrastructure

```
CRM Droplet (existing, 4-8GB)
├── Twenty CRM .............. crm.succession.bio
│   ├── Workflow engine (pre-loaded automations)
│   ├── Email sync (Gmail/Outlook)
│   ├── Calendar sync
│   └── Custom apps (Succession extensions)

Services Droplet (8-16GB)
├── Cal.com ................ cal.succession.bio (scheduling)
├── Marketing engine ....... TBD (Dittofeed preferred, Mautic fallback — see Marketing section)
├── Activepieces ........... connect.succession.bio (external tool connections)
├── Papermark .............. docs.succession.bio (document tracking)
├── Caddy .................. reverse proxy + SSL
└── Shared PostgreSQL

Platform API (Cloudflare Workers)
├── Auth gateway ........... API key validation, tier checks
├── Database proxy ......... Queries to Succession DB (Supabase)
├── Enrichment proxy ....... Routes to Clay/LeadMagic/Apollo
├── AI proxy ............... Claude API calls with context injection
└── Usage metering ......... Track enrichments per client

External SaaS
├── Recall.ai .............. Meeting recording + transcription
├── Stripe ................. Billing + subscriptions
└── Supabase ............... Life science database
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

**Tech:** Cal.com webhooks → Twenty workflow (webhook trigger) → record creation. Pre-wired, no Activepieces needed.
**License:** AGPLv3 (all features available self-hosted, including round-robin and Teams features)

#### Marketing Engine → CRM — Marketing Add-On (Phase 3+)

**Status: Open decision.** The marketing add-on is a Phase 3+ feature. Two candidates are under evaluation:

| | Dittofeed (preferred) | Mautic (fallback) |
|---|---|---|
| **License** | MIT | GPL-3.0 |
| **Stack** | TypeScript/React/PostgreSQL | PHP/Symfony/MySQL |
| **Multi-tenant** | Yes (native) | No (one instance per client) |
| **Embeddable** | Yes (React components + headless API) | No (separate app) |
| **Features** | Core campaigns, journeys, segmentation | Full-featured (landing pages, forms, scoring, A/B) |
| **Maturity** | 2.7k stars, YC-backed, active | 9.4k stars, 10+ years, very mature |
| **Risk** | Smaller community, fewer features | Separate UI, no multi-tenancy, PHP stack |

**Decision deferred until Phase 3.** By then, Dittofeed may have matured further, or Twenty's workflow engine may prove sufficient for basic marketing automation (nurture drips, segment-based sends). The core platform launches as a sales tool first.

**What the marketing add-on will provide (regardless of engine):**
- Email nurture campaigns (drip sequences for non-responders)
- Marketing segmentation (dynamic segments based on engagement + demographics)
- Web visitor tracking (know when prospects visit the client's website)
- Lead scoring (engagement + fit scoring, synced to CRM)
- Landing pages and forms (for events, webinars, content offers)
- Marketing email sends (separate from outbound campaign sending)
- Bidirectional sync with CRM (marketing activity on Person timeline, CRM data informs segments) (fully self-hostable, no feature gates)

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

**Marketing (if not using our marketing add-on):**
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
- Build pre-loaded workflows, test on our own instance
- Wire Cal.com → CRM via Twenty webhook workflow
- Wire Bison/HeyReach → CRM via Twenty webhook workflow
- Wire Granola → CRM (we already have this sync)
- Test Recall.ai meeting intelligence with our own client calls
- Deploy Activepieces on services droplet

**Phase 2 — Core integrations for clients**
- Pre-loaded workflows ship with every new instance (provisioning script)
- Cal.com pre-wired (zero config)
- Succession Database → CRM import flow
- Campaign infrastructure → CRM sync
- Recall.ai meeting intelligence (included in paid plan)
- HubSpot / Pipedrive migration flows

**Phase 3 — Bring-your-own tools**
- Activepieces UI exposed to clients (connect.succession.bio)
- Gong, Fireflies, Google Calendar, Outlook connectors via Activepieces
- Gmail / Outlook email sync (Twenty native)
- Slack integration

**Phase 4 — Marketing add-on integrations**
- Marketing engine ↔ CRM bidirectional sync (Dittofeed or Mautic — decision pending)
- Papermark → CRM document tracking
- Mailchimp / ActiveCampaign connectors (for clients not using our marketing add-on)

---

## Pre-Loaded Workflows

Twenty's workflow engine supports programmatic creation via the `create_complete_workflow` tool API. Workflows are created during provisioning and are active at first login. Clients can view, modify, disable, or extend them.

### How Pre-Loading Works

During the provisioning script (`provision-client.js`):

1. Authenticate as workspace admin
2. Call Twenty's `create_complete_workflow` API for each workflow definition
3. Each definition includes: trigger config, steps, edges, and `activate: true`
4. Workflows appear in the client's Automations tab immediately

Workflow definitions are stored as JSON templates in the codebase. To update a workflow for all future clients, update the template. Existing clients keep their version (they may have customized it).

### The 10 Pre-Loaded Workflows

All workflows use Twenty's built-in AI Agent step for intelligence and the Suggested Action object for output. Clients can view, edit, disable, or extend any workflow in the Automations tab.

**Design principles:**
- AI-generated content is always a draft or suggestion — never sent/executed automatically
- All workflows read the Company Profile for context (ICP, personas, products, tone)
- All use standard schema fields only — no dependency on client-added custom fields
- Output goes to Suggested Action (the rep's action queue) unless it's a background data update

---

#### Workflow 1: New Contact Auto-Enrichment

**Trigger:** Person created (any source)
**Steps:**
1. Read Person fields (name, company, email, title)
2. HTTP Request → Platform API enrichment endpoint
3. Update Person: email, LinkedIn, seniority, department, `enrichmentStatus` → Enriched, `lastEnrichedAt` → now
4. If Company has a Company Profile → AI Agent step: score `fitScore` and `personaMatch` against ICP/personas
5. Update Person: `fitScore`, `personaMatch`
**Output:** Updated Person record (silent — no Suggested Action unless Tier 1 ICP match)
**Client value:** Every contact they add or import gets enriched automatically

---

#### Workflow 2: Meeting Follow-Up Drafter

**Trigger:** Meeting created with `outcome` = Positive or Neutral
**Steps:**
1. Wait 2 hours (Delay step — let the rep decompress)
2. Read Meeting: summary, actionItems, nextSteps, competitorsMentioned, buyingSignals
3. Read linked Person, Company, Opportunity, Company Profile
4. AI Agent step: generate follow-up email draft using meeting context + brand tone + relevant products/case studies
5. If Gmail/Outlook connected (via Activepieces OAuth) → HTTP Request → create draft in their actual mailbox
6. Create Suggested Action: type = Follow-Up, priority = High, `suggestedMessage` = the draft, linked to Person + Meeting
**Output:** Draft email in their inbox + Suggested Action in the CRM
**Client value:** Personalized follow-up waiting for them 2 hours after every productive call

---

#### Workflow 3: No-Show Recovery

**Trigger:** Meeting created with `outcome` = No Show
**Steps:**
1. Read Person, Company, Company Profile
2. AI Agent step: generate "missed you" message using brand tone (short, not pushy)
3. Create Suggested Action: type = Follow-Up, priority = High, sourceType = No-Show Recovery, `suggestedMessage` = the draft
4. Wait 3 days (Delay step)
5. Check: did the Person's `leadStage` change? (If yes, someone already handled it — stop)
6. If no change → Create Suggested Action: type = Schedule Meeting, priority = Medium, description = "Attempt reschedule with {name} — no response to no-show follow-up"
**Output:** Two Suggested Actions — immediate follow-up + 3-day reschedule reminder
**Client value:** No-shows don't fall through the cracks

---

#### Workflow 4: Deal Stage Automation

**Trigger:** Opportunity `stage` field updated
**Steps (conditional branching based on new stage):**

| New Stage | Actions |
|-----------|---------|
| Discovery | Create Task: "Schedule discovery call with {Company}" assigned to deal owner |
| Proposal | AI Agent step: draft proposal outline using Company Profile + Product data + Person context → Create Note on Opportunity with outline |
| Negotiation | Create Suggested Action: type = Review Deal, description = "Deal entering negotiation — review competitor info and pricing" |
| Closed Won | Update Company `companyType` → Customer. Update Person `leadStage` → Customer. Set Opportunity `wonDate`, calculate `salesCycleDays`. Create Suggested Action: type = Follow-Up, description = "Send onboarding welcome + schedule kickoff" |
| Closed Lost | Prompt owner for `lostReason` (Form step). Set `lostDate`, calculate `salesCycleDays`. If `lostReason` = Competitor Won → prompt for `lostToCompetitor` |

**Output:** Automated record updates + stage-appropriate Tasks/Suggestions
**Client value:** Pipeline hygiene is automatic. Data fills itself in as deals progress.

---

#### Workflow 5: Signal-Triggered Outreach Suggester

**Trigger:** Signal created with `relevanceScore` > 70
**Steps:**
1. Read Signal: type, headline, details, linked Company
2. Read Company Profile: ICP, personas, products, case studies
3. Search People linked to the Signal's Company
4. AI Agent step: generate personalized outreach referencing the signal, using brand tone and matching persona context
5. If contacts exist → Create Suggested Action: type = Outreach, priority = High, sourceType = Signal, `suggestedMessage` = draft referencing the signal, linked to top-fit Person + Company + Signal
6. If no contacts → Create Suggested Action: type = Research, priority = Medium, description = "Signal detected at {Company} but no contacts in CRM. Find people matching {persona}."
**Output:** Suggested Action with context-aware draft outreach
**Client value:** Hot signals get acted on immediately with messaging that references the trigger event

---

#### Workflow 6: Stale Deal Nudger

**Trigger:** Cron (weekly, Monday 9am)
**Steps:**
1. Search Opportunities where `daysInCurrentStage` > 14 AND stage NOT IN (Closed Won, Closed Lost)
2. For each stale deal:
   a. Read linked Person, Company, last Meeting summary, last email activity
   b. AI Agent step: analyze deal context → generate specific recommendation
3. Create Suggested Action per deal: type = Follow-Up, sourceType = Pipeline Coach, priority = Medium/High based on deal value, description = specific recommendation (e.g., "Re-engage Dr. Chen — she asked about integration. Send Xenogen case study.")
**Output:** Weekly batch of Suggested Actions for stale deals
**Client value:** Deals never go cold silently. Specific, actionable nudges every Monday.

---

#### Workflow 7: Pre-Call Intelligence Brief

**Trigger:** Calendar event created with external participant (via Cal.com webhook or calendar sync)
**Steps:**
1. Match attendee email to Person record in CRM
2. If no match → enrich via Platform API → create Person
3. Read Person, Company, open Opportunity, previous Meetings (summaries + action items), Campaign history, Company Profile
4. AI Agent step: assemble pre-call brief — company overview, ICP fit, last interactions, talking points, relevant products/case studies, open action items from previous meetings
5. Create Note on Person: title = "Pre-Call Brief: {meetingTitle}", body = the brief, pinned
**Output:** Note on the Person record with full context brief
**Client value:** Every meeting starts prepared. Zero manual prep.

---

#### Workflow 8: New Company ICP Qualifier

**Trigger:** Company created (any source — import, database, manual)
**Steps:**
1. Read Company fields (industry, size, funding, therapeutic area, technology)
2. Read Company Profile (ICP criteria)
3. AI Agent step: score company against ICP → determine `icpScore` (0-100), `icpScoreReason`, `icpTier`
4. Update Company: `icpScore`, `icpScoreReason`, `icpTier`
5. If `icpTier` = Tier 1 → Create Suggested Action: type = Outreach, sourceType = ICP Match, priority = High, description = "High-fit company added — {icpScoreReason}"
**Output:** ICP scores on every company + Suggested Action for Tier 1 matches
**Client value:** Every company in the CRM is auto-scored. Reps know what to prioritize.

---

#### Workflow 9: Campaign Performance Alerter

**Trigger:** Cron (daily, 8am)
**Steps:**
1. Search Campaigns where `campaignStatus` = Active
2. For each active campaign, evaluate:
   - Reply rate > 5% → positive alert
   - Bounce rate > 10% → warning
   - 0 replies after 50+ sends → poor performance alert
   - Meeting booked (new since last check) → celebration alert
3. AI Agent step: summarize daily campaign health across all active campaigns
4. Create Suggested Action per alert: sourceType = Campaign Alert, priority varies by alert severity
   - High priority: high bounces, zero traction
   - Medium: meeting booked, good performance (scale suggestion)
**Output:** Daily batch of campaign health Suggested Actions
**Client value:** Campaign health monitoring without checking dashboards

---

#### Workflow 10: Post-Campaign Lead Recycler

**Trigger:** Campaign `campaignStatus` changes to Completed
**Steps:**
1. Search Campaign Memberships for this campaign
2. Categorize leads:
   - **Never engaged** (stage = Not Contacted or Contacted): update `leadStage` → Nurture
   - **Engaged but didn't convert** (stage = Engaged or Meeting Booked): flag for follow-up
   - **Qualified/Customer**: skip (already handled)
   - **Opted Out**: skip
3. For never-engaged leads: Create Suggested Action: type = Add to Campaign, sourceType = Lead Recycler, description = "{count} leads from {campaign} never engaged. Consider adding to a nurture sequence."
4. For engaged leads: Create Suggested Action: type = Follow-Up, sourceType = Lead Recycler, priority = High, description = "Follow up with {count} engaged leads from {campaign} who didn't convert."
**Output:** Suggested Actions for lead recycling + auto-stage updates for non-responders
**Client value:** Campaigns don't end with dead leads. Non-responders get recycled, engaged leads get followed up.

---

### Supporting Background Workflows (no Suggested Action output)

These run silently in the background to keep data fresh:

**Signal → Company Update**
- Trigger: Signal created
- Action: Update linked Company's `recentSignal` and `recentSignalDate`

**Email Reply → Stage Progression**
- Trigger: Email received from external contact
- Action: If Person's `leadStage` = Contacted → update to Engaged

**Campaign Stats Sync**
- Trigger: Cron (every 6 hours)
- Action: HTTP Request to Platform API → fetch latest stats → update Campaign records

**Enrichment Refresh**
- Trigger: Cron (1st of month)
- Action: Search People where `lastEnrichedAt` > 90 days → re-enrich via Platform API

**Snooze Resurfacer**
- Trigger: Cron (hourly)
- Action: Search Suggested Actions where `status` = Snoozed AND `snoozedUntil` <= now → update `status` → New

### Manual Workflows (user triggers via Cmd+K or button)

**"Enrich this contact"**
- Trigger: Manual (on Person record)
- Action: HTTP Request → Platform API enrichment → update Person

**"Qualify this company"**
- Trigger: Manual (on Company record)
- Action: AI Agent step → score against ICP → update `icpScore`, `icpScoreReason`, `icpTier`

**"Build list for this persona"**
- Trigger: Manual
- Action: Form (select persona) → HTTP Request → database query + enrich → create Person records → create Campaign (draft)

**"Write messaging for this campaign"**
- Trigger: Manual (on Campaign record in Draft status)
- Action: AI Agent step → generate sequence using Company Profile + Persona → create Sequence record

**"Launch this campaign"**
- Trigger: Manual (on Campaign with Sequence attached)
- Action: Pre-flight checks → HTTP Request to campaign infrastructure → update Campaign status to Active

---

## Sequence Execution & Sending Architecture

Twenty CRM does not have native email/LinkedIn sequence sending. We build this as a layer on top of the CRM using the Sequence object, Campaign infrastructure, and external sending tools.

### How Sequences Work End-to-End

```
1. CREATE: Client builds sequence in CRM
   → MCP/AI generates draft ("write a 4-step email sequence for VP R&D")
   → Or client creates manually in the Sequence editor (Twenty custom app)
   → Sequence object stores steps in stepsJson

2. ATTACH: Client creates Campaign, links Sequence + lead list
   → Campaign object references Sequence (relation)
   → Campaign Memberships link People to Campaign

3. LAUNCH: Client triggers "Launch Campaign" workflow
   → Pre-flight checks (verify emails, check sending limits)
   → Platform API pushes sequence + leads to the sending engine
   → Campaign status → Active

4. EXECUTE: Sending engine runs the sequence
   → Sends step 1 to all leads
   → Waits {waitDays}
   → Sends step 2 to leads who haven't replied
   → Continues through all steps

5. TRACK: Activity flows back into CRM
   → Webhooks from sending engine → Twenty workflows
   → Update Campaign stats, Person timeline, Campaign Membership stage
   → Suggested Actions created for positive replies
```

### Email Sending: Hybrid Model

Clients have two options, selectable per campaign:

**Option A: Send from their own email (low volume)**
- Client connects Gmail or Outlook via Activepieces (OAuth)
- Platform API sends through their mailbox using Gmail/Outlook API
- Sends from their actual email address — most authentic
- Limits: ~50-100 emails/day per connected mailbox
- Best for: small teams, highly personalized outbound, <50 leads per campaign
- Tracking: open/click tracking via Succession tracking pixel + redirect links

**Option B: Send from managed infrastructure (high volume)**
- We provision sending domain(s) for the client (e.g., `outreach.clientdomain.com`)
- Emails sent via Bison API through Platform API
- SPF, DKIM, DMARC configured. Warm-up managed.
- Limits: scales with number of mailboxes provisioned
- Best for: larger campaigns, multiple sequences running simultaneously
- Tracking: native Bison tracking → webhooks → CRM

**DFY clients:** Always use our managed infrastructure (Bison). Campaign data syncs from Bison into the CRM via existing `sync-campaigns.js` and twenty-sync worker. No change from current setup.

### LinkedIn: HeyReach Integration

No reliable OSS LinkedIn automation tools exist (LinkedIn actively blocks them). LinkedIn outreach runs through HeyReach:

**For self-serve clients:**
- We provision a HeyReach workspace per client
- Client connects their LinkedIn account in HeyReach
- CRM creates the sequence and lead list → Platform API pushes to HeyReach API
- HeyReach executes: connection requests, follow-up messages, InMails
- HeyReach webhooks → Activepieces → Twenty workflow → update Campaign stats + Person timeline

**For DFY clients:**
- We manage HeyReach directly (current setup, unchanged)
- Data syncs into CRM via existing `sync-campaign-leads.js`

**LinkedIn campaigns in the CRM:**
- Same Campaign + Sequence objects, just with `channel = LinkedIn`
- Sequence steps have `body` (message text) but no `subject` (LinkedIn doesn't have subject lines)
- Campaign Membership tracks: `linkedinSent`, `linkedinReplied`, connection status

### Sequence Editor (Twenty Custom App)

The `stepsJson` field on the Sequence object stores the raw data. Clients need a proper editing UI:

**Phase 1 (MCP-first):**
- Client uses Claude: "Write a 4-step email sequence targeting VP R&D at Series B biotechs. Use our consultative tone. Reference the Xenogen case study."
- AI generates sequence using Company Profile context → writes to Sequence object
- Client reviews in a simple read-only rendered view in the CRM

**Phase 2 (Custom App):**
- Build a React component in Twenty's app framework: step-by-step editor
- Add step, edit subject/body with rich text, set wait days, reorder/delete steps
- Preview with merge field rendering
- Reads/writes `stepsJson` under the hood
- AI assist button: "Rewrite this step" / "Make this shorter" / "Add a P.S."

**Phase 3 (Full editor):**
- Spintax support in the editor (preview variants)
- A/B testing (variant steps, winner selection)
- Conditional steps (if opened step 1, send version A of step 2)
- Template library (save/load sequences)

---

## Unified Platform: CRM Replaces the Client Portal

### Background

The existing Succession client portal is a client-facing dashboard for DFY lead gen clients — it shows campaigns, leads, stats, a master inbox, and more. Rather than maintaining two separate client-facing products (portal + CRM), the CRM becomes the single platform for all client types.

**The portal's frontend gets sunset.** The portal's backend/API continues to serve as the data layer and internal operations backbone — our plugin, skills, agents, and crons still talk to it. But clients log into the CRM, not the portal.

### What DFY Clients Currently See in the Portal

| Portal feature | CRM equivalent |
|---------------|----------------|
| Campaign stats dashboard | Campaign objects + pre-built performance dashboard |
| Master inbox (read/respond) | Twenty's native email sync + Person timeline |
| Lead list with stages/sentiment | People view with leadStage, sentiment filters |
| Overall performance stats | Pre-built analytics dashboard |
| Client profile / ICP | Company Profile object (editable) |

All of these exist or will exist in the CRM. The portal was a separate UI for the same data.

### Migration Path for Existing DFY Clients

1. CRM instance provisioned with same data (via `sync-portal.js`, already built)
2. Client gets CRM login alongside portal access (transition period)
3. Once CRM has feature parity for what they use, portal access retired
4. No rush — portal stays live until all clients are comfortable in the CRM

### Dashboard Management

**System dashboards** (maintained by Succession):
- Query standard schema fields that exist in every instance (totalSent, replyRate, meetingsBooked, etc.)
- Can be updated across all instances because we control the schema
- Tagged as "system" so they're not overwritten by client customizations
- Clients can view but not edit system dashboards

**Client dashboards** (created by the client):
- Their custom views, custom fields, whatever they've added
- We never touch these
- Client has full control

**Open question:** Verify in Twenty's dashboard API whether we can programmatically push dashboard updates to existing instances without overwriting client-created dashboards. Test during dogfooding phase.

### Cross-Instance Admin Access (Internal Team)

In a multi-tenant CRM world, each client workspace is isolated — which is correct for data security. But our team needs to see everything across all clients for operations, reporting, and management.

**Solution: separate admin layer, not inside any client's CRM.**

| Need | Solution |
|------|----------|
| Cross-client stats overview | Platform API admin endpoint: `GET /admin/clients/stats` — aggregates from all workspaces |
| Manage campaigns across clients | Portal backend API stays. Internal plugin still talks to it via MCP tools. |
| Monitor client health | Platform API: `GET /admin/clients/health` — active users, enrichment usage, campaign activity |
| Jump into a client's CRM | Admin SSO — our team members have admin access to any workspace, can switch between them |
| Cross-client reporting | Internal admin dashboard (lightweight tool or "Succession Admin" workspace) pulling from Platform API |

**The portal's backend API continues to serve cross-client operations.** Our internal plugin and MCP tools still talk to it for anything that spans multiple clients. Only the portal's frontend gets replaced.

### Source of Truth

| Data type | Source of truth | Notes |
|-----------|----------------|-------|
| Life science database (master) | Portal backend (Supabase) | Shared across all clients, accessed via Platform API |
| Client profiles/personas | CRM | Each client manages their own in their workspace |
| Campaign data (DFY) | Portal backend → synced to CRM | `sync-portal.js` pushes Bison/HeyReach data to CRM |
| Campaign data (self-serve) | CRM | Client's campaigns live in their workspace |
| Enrichment data | Portal backend (written back) | Data flywheel — all enrichments feed the master DB |
| Billing/subscription | Stripe (via Platform API) | Stripe is the billing source of truth |
| Cross-client analytics | Platform API (aggregates from portal + workspaces) | Internal team only |

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
| Marketing engine | OAuth via CRM identity (marketing add-on only, Phase 3+) |
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
| Marketing add-on | 5,000 marketing emails/mo | Separate from outbound (Phase 3+) |
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

## Contact Deduplication

Duplicates are inevitable — imports, database lookups, inbound leads, and enrichment all create overlapping records. Without dedup, CRM data quality degrades fast.

### Dedup Strategy

**On creation (preventive):**
- Pre-loaded workflow triggers on Person created
- Checks for existing Person with matching email (exact match)
- If match found → merge instead of creating duplicate (update existing with new data)
- Secondary check: name + company fuzzy match if no email match
- Same pattern for Company: check `domainName` exact match on creation

**On import (batch):**
- Import flow runs dedup before creating records
- Match by email (Person) or domain (Company)
- Present duplicates to user: "3 contacts already exist — update or skip?"
- Option to auto-merge (update existing records with imported data) or skip duplicates

**On demand (cleanup):**
- Manual workflow: "Find duplicates" — searches for People with same email, same name+company, or similar LinkedIn URL
- Presents merge candidates in a list
- Rep confirms which record to keep as primary

### Merge Behavior

When merging two Person records:
- Keep the record with more data (more fields filled)
- Merge all relations (Campaign Memberships, Meetings, Notes from both records)
- Keep the most recent value for each field
- Preserve all timeline history from both records
- Log the merge as a Note: "Merged with {duplicate ID}"

---

## Unsubscribe & DNC Handling

Legal requirement (CAN-SPAM, GDPR). Handled via `doNotContact` boolean on Person and Company objects + workflows.

### How Unsubscribes Flow

```
Person replies "unsubscribe" or clicks unsubscribe link
  → Sending engine (Bison or Gmail) detects unsubscribe
  → Webhook fires to CRM
  → Workflow triggers:
    1. Set Person.doNotContact = true
    2. Set Person.dncReason = "Unsubscribed"
    3. Set Person.dncDate = now
    4. Remove from all active Campaigns (update Campaign Memberships → Opted Out)
    5. Create Suggested Action (Low priority): "Person unsubscribed — review if outreach was relevant"
```

### Campaign Launch DNC Check

The "Launch Campaign" workflow includes a pre-flight step:
1. Check all leads in the Campaign for `doNotContact = true`
2. Check all leads' Companies for `doNotContact = true`
3. Remove any DNC contacts from the Campaign before sending
4. Alert: "{count} leads removed due to DNC status"

### DNC at Company Level

When `Company.doNotContact = true`, ALL People at that company are excluded from outreach. Useful for: competitors, existing customers who don't want cold outreach, companies that have explicitly asked not to be contacted.

---

## Deliverability Monitoring (Client-Owned Sending)

When clients send from their own Gmail/Outlook, we don't control deliverability — but we can monitor and alert.

### What We Track

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Bounce rate | Email status callbacks | > 5% → warning, > 10% → pause campaign |
| Reply rate | Email thread tracking | < 1% after 100 sends → review messaging |
| Spam complaints | Gmail/Outlook postmaster feedback (if available) | Any → immediate alert |
| Daily send volume | Our sending layer counts | Approaching Gmail limit (500/day) → warn |

### Workflow: Email Health Monitor

- Trigger: Cron (daily)
- Check all active campaigns using client-owned sending
- Calculate bounce rate, reply rate per campaign
- If bounce rate > 5%: Create Suggested Action (High): "Campaign {name} has {x}% bounce rate — review list quality or pause sending"
- If approaching daily limit: Create Suggested Action: "You've sent {x}/{limit} emails today — {count} scheduled sends may be delayed"

### What We Can't Monitor (client-owned sending)

- Domain reputation score (Google Postmaster Tools requires DNS verification — client would need to set this up themselves)
- Inbox placement rate (requires a tool like GlockApps or similar — future add-on)
- Spam folder placement

For managed sending (Bison), we have full visibility via Bison's reporting API.

---

## Import Flow

Clients import data regularly — from events, partner lists, spreadsheets, other tools. The import experience needs to be smooth and safe.

### Import Flow Design

```
Client uploads CSV (or connects via Activepieces from external tool)
  │
  ▼
Step 1: Field Mapping
  → Auto-detect columns (email, first name, company, etc.)
  → Show mapping preview: "Column 'Company Name' → Company.name"
  → Client confirms or adjusts mappings
  │
  ▼
Step 2: Deduplication Check
  → Match imported records against existing CRM data
  → By email (Person) or domain (Company)
  → Present results: "247 new, 53 duplicates, 12 invalid emails"
  → Client chooses: create new only / update existing / skip duplicates
  │
  ▼
Step 3: Auto-Enrichment
  → If paid tier: auto-enrich new contacts from Succession database
  → Fill in missing fields (company data, seniority, department)
  → Calculate ICP scores for new Companies
  │
  ▼
Step 4: Assignment
  → Apply lead routing rules (if configured)
  → Or assign to the importing user
  → Set leadSource = "Import"
  → Set firstTouchDate = now
  │
  ▼
Step 5: Confirmation
  → Summary: "{count} people created, {count} companies created, {count} enriched"
  → Link to the imported records view
```

### Import Sources

| Source | Method | Notes |
|--------|--------|-------|
| CSV file | Upload in CRM | Twenty has basic CSV import — we extend with dedup + enrichment |
| HubSpot | Activepieces OAuth | Pull contacts/companies/deals in one flow |
| Pipedrive | Activepieces OAuth | Pull contacts/organizations/deals |
| Salesforce | Activepieces OAuth | Pull contacts/accounts/opportunities |
| Succession Database | MCP / Platform API | "Import these 50 companies to my CRM" |
| Event attendee list | CSV upload | Post-conference import with auto-enrichment |

---

## Notification System

Reps need to know when things happen without living in the CRM all day.

### Notification Types

| Event | Notification | Channel |
|-------|-------------|---------|
| Suggested Action created (High priority) | Immediate alert | Email + in-CRM |
| New meeting booked | Immediate | Email + in-CRM + calendar |
| Deal stage changed | Immediate | In-CRM |
| Reply received on campaign | Immediate | Email + in-CRM |
| Daily digest (all Suggested Actions, campaign stats) | Scheduled (8am) | Email |
| Weekly pipeline summary | Scheduled (Monday 9am) | Email |
| Enrichment completed (batch) | When done | In-CRM |

### Implementation

**In-CRM notifications:** Twenty has a native notification system. Workflows create notifications via the Notification API. These appear in the bell icon in the CRM header.

**Email notifications:** Workflows send emails via the Platform API or Twenty's native "Send Email" action. For digests, a scheduled workflow compiles the summary and sends.

**Design principle:** Default to email for high-priority + digest. In-CRM for everything. Clients can configure which events trigger email notifications in their settings.

---

## API Key Management

The MCP API key is the gateway to the platform for self-serve clients. It needs proper lifecycle management.

### Key Lifecycle

```
Client signs up
  → API key generated (UUID v4 + prefix: "sk_live_")
  → Stored encrypted in Platform API database
  → Emailed to client + shown in CRM settings page (once)
  → Key is tied to: workspace_id, tier, created_at

Client installs MCP
  → Adds API key to environment variable
  → MCP calls Platform API on startup: GET /auth/verify
  → Returns: { tier, workspace_id, features[], rate_limits }
  → MCP enables tools based on tier

Key rotation
  → Client can generate a new key in CRM settings
  → Old key remains valid for 24 hours (grace period)
  → After grace period, old key is revoked

Key compromise
  → Client revokes key in CRM settings (immediate)
  → Generate new key
  → All active MCP sessions with old key get rejected on next call
```

### Rate Limiting

| Tier | Requests/minute | Enrichments/day | AI calls/day |
|------|----------------|-----------------|-------------|
| Free | 30 | 0 | 10 |
| Paid (£500/mo) | 100 | 100 | 50 |
| DFY | 200 | Unlimited | 100 |

Rate limits enforced at the Platform API level per API key. Exceeding → HTTP 429 with `Retry-After` header.

### Usage Tracking

Every API call logged with: key_id, endpoint, timestamp, response_status. Aggregated for:
- Monthly usage dashboard in CRM settings
- Billing (if we ever add overage charges)
- Abuse detection (anomalous spikes)

---

## Lead Routing & Territory Management

For multi-rep teams, leads need to land with the right rep automatically.

### Lead Routing Rules

Pre-loaded workflow: "Route New Lead" — triggers on Person created.

**Routing options (configured in CRM settings or Company Profile):**

| Rule Type | How it works | Example |
|-----------|-------------|---------|
| **Round-robin** | Rotate evenly across reps | Lead 1 → Rep A, Lead 2 → Rep B, Lead 3 → Rep C, repeat |
| **Territory (geography)** | Route by Company country/city | UK leads → Rep A, Germany leads → Rep B, US leads → Rep C |
| **Territory (industry)** | Route by Company industry | Biotech → Rep A, CRO/CDMO → Rep B, Med Device → Rep C |
| **Territory (account)** | Route by Company owner | If Company has an owner, new contacts go to the same rep |
| **Named accounts** | Specific companies assigned to specific reps | "Xenogen Labs" → always Rep A |
| **ICP tier** | Route by ICP score | Tier 1 → senior rep, Tier 2-3 → junior reps |
| **Capacity-based** | Route to rep with fewest active leads | Balances workload automatically |

### Implementation

Routing rules stored as a configuration object (JSON) on the Company Profile or a separate RoutingConfig object. The "Route New Lead" workflow reads the config and applies rules in priority order:

```
1. Check if Company has an owner → assign to company owner
2. Check named account rules → assign if matched
3. Check territory rules (geography, then industry)
4. Fall back to round-robin or capacity-based
```

The workflow sets `Person.ownerUserId` and creates a Suggested Action for the assigned rep: "New lead assigned to you: {name} at {company}."

### Territory Management Object (future)

For larger teams, a dedicated Territory object:

| Field | Type | Description |
|-------|------|-------------|
| `name` | TEXT | Territory name (e.g., "EMEA Biotech") |
| `ownerUserId` | RELATION | Rep who owns this territory |
| `rules` | TEXT | JSON rules: geography, industry, company size filters |
| `priority` | NUMBER | Evaluation order (lower = checked first) |
| `leadCount` | NUMBER | Current leads in territory (auto-calculated) |
| `dealValue` | CURRENCY | Open pipeline in territory (auto-calculated) |

This is a Phase 2+ feature — round-robin and basic territory rules via workflow config are sufficient for V1.

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

**Risk:** We're building many systems (CRM, Cal.com, Activepieces, Recall.ai, MCP, database API, auth, billing, migration tooling, enrichment proxy, marketing site, and eventually a marketing engine). A small team cannot ship and maintain all of this simultaneously.

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

## Dashboard Builder Skill (MCP)

A key adoption driver: clients can describe what they want to see, and the AI builds the dashboard for them.

**How it works:**
- Client says: "Build me a dashboard showing pipeline by stage, reply rates by campaign this quarter, and meetings booked per week"
- MCP skill reads their data model (available objects, fields, current data)
- Generates a Twenty dashboard definition via the API
- Dashboard appears in their CRM immediately

**Why this matters:**
- Dashboard building is a common gap in CRM adoption — reps don't know how to set up reports
- An AI skill that builds dashboards from natural language removes that friction entirely
- Also useful for our team: "Build a dashboard showing all stale deals over 14 days with last activity date"

**Pre-built dashboard templates + custom builds:**
- System dashboards ship with every instance (pipeline, campaigns, enrichment, meetings)
- The skill lets clients build additional dashboards on demand
- "Show me which campaigns drove the most meetings last month" → dashboard
- "I want a forecast view with weighted pipeline by close date" → dashboard

**Implementation:** MCP tool that calls Twenty's dashboard API. Reads the data model, generates chart/table/KPI configs, creates the dashboard.

---

## Marketing Add-On: Composable Architecture (Phase 3+)

Rather than adopting one monolithic marketing platform, the marketing add-on will be built from **best-of-breed OSS tools** integrated natively into the CRM's marketing tab.

### Composable Approach

Each marketing function uses the best available OSS tool, with all UI surfaced through Twenty custom apps:

| Function | OSS Tool (candidate) | Integration method |
|----------|---------------------|-------------------|
| **Campaign engine** (drip sequences, journey builder) | Dittofeed (MIT, embeddable React components, multi-tenant) | Embedded React components in Twenty |
| **Email rendering** (drag-and-drop builder) | MJML + GrapesJS or React Email (MIT) | Custom Twenty app component |
| **Landing pages** | Build natively in Twenty or use a headless page builder | Twenty custom app |
| **Forms** | Build natively in Twenty (form builder component) | Twenty custom app |
| **Lead scoring** | Native — Twenty workflow calculates scores from engagement + fit data | Twenty workflows + custom fields |
| **Web tracking** | Lightweight JS snippet → Platform API → CRM | Custom build (small) |
| **Email sending** | Existing campaign infrastructure (Bison) or client's own SMTP | Already built |
| **Segmentation** | Twenty's native filtering + saved views | Already exists |

### Why Composable Beats Monolithic

- **No multi-tenancy problem** — each tool either supports it (Dittofeed) or runs inside Twenty (which does)
- **One UI** — everything surfaces through Twenty custom apps. Client sees "Marketing" tab, not 5 separate tools.
- **Mix and match** — if a better OSS email builder emerges, swap it in without replacing the whole marketing stack
- **Incremental build** — ship one function at a time (scoring first → drips → landing pages → forms → web tracking)
- **Same tech stack** — all TypeScript/React, all inside Twenty's app framework

### Marketing Feature Rollout

| Phase | Feature | How |
|-------|---------|-----|
| 3a | Lead scoring | Twenty workflows calculate `engagementScore` + `fitScore` + `combinedScore` fields. Threshold triggers stage changes. |
| 3b | Nurture sequences | Dittofeed embedded journey builder OR extend Twenty workflow UI for marketing-style drip campaigns |
| 3c | Web tracking | Lightweight JS snippet on client's site → events → Platform API → Person record updates |
| 3d | Email builder | React Email or GrapesJS component in Twenty for designing marketing emails |
| 3e | Landing pages + forms | Custom Twenty app for building pages/forms, hosted at client subdomain |

---

## App Architecture (Phase 2+)

### Concept

Instead of one monolithic data model installed on every CRM instance, package features into **installable Twenty apps** by function. Each app ships with its own objects, fields, workflows, dashboards, and UI components. Clients install what they need.

Twenty's custom apps framework (alpha) supports: custom objects/fields, logic functions (HTTP routes, crons, DB event triggers), React UI components, navigation items, and roles. Since we own the fork, **we can extend the app framework itself** if it has gaps — add support for bundling workflows, creating dashboards on install, or anything else we need. Contributions can be offered upstream.

### Proposed App Packages

**Succession Sales** (base — ships with every instance)
- Objects: Company, Person, Opportunity custom fields, Campaign, Campaign Membership, Sequence
- Workflows: Auto-enrichment, ICP qualifier, deal stage automation, campaign launcher
- Dashboards: Pipeline view, campaign performance
- Views: Active pipeline, my leads, enrichment queue
- Manual workflows: Enrich contact, qualify company, build list, write messaging, launch campaign

**Succession Intelligence** (base — ships with every instance)
- Objects: Signal, Event Bookmark, Suggested Action
- Workflows: Signal outreach suggester, stale deal nudger, campaign alerter, lead recycler, snooze resurfacer
- Dashboards: Signal feed, ICP match report, action queue
- Views: Action Queue (Suggested Actions, status = New)

**Succession Meetings** (base or add-on)
- Objects: Meeting (expanded fields for AI notes, recording, transcripts)
- Workflows: Pre-call brief, meeting follow-up drafter, no-show recovery
- Integrations: Cal.com webhook handler, Recall.ai webhook handler
- Dashboards: Meeting activity, action items, outcome trends

**Succession Context Engine** (base — core to all AI features)
- Objects: Company Profile, Persona, Product, Case Study
- Onboarding flow: guided profile setup wizard
- Used by every other app for AI personalization

**Succession BD & Licensing** (vertical app — optional)
- Objects: custom fields for licensing deals (territory rights, exclusivity, milestone payments, royalty rates)
- Workflows: licensing deal stage automation, milestone tracker, territory conflict checker
- Dashboards: licensing pipeline, territory map, royalty projections
- Personas: pre-built BD-specific personas (VP BD, Head of Licensing, CBO)

**Succession Clinical** (vertical app — future)
- Objects: Clinical trial tracking, investigator site management, regulatory milestone tracking
- Workflows: trial status change alerts, site activation checklist, regulatory filing reminders
- Dashboards: trial pipeline, site map, regulatory timeline

**Succession Marketing** (Phase 3+ add-on)
- Objects: lead scoring fields, web tracking fields, marketing email stats
- Workflows: scoring calculations, nurture triggers, segment-based sends
- Integrations: Dittofeed/marketing engine connector
- Dashboards: marketing funnel, lead scoring distribution, email performance

### Why Apps > Monolithic

| Benefit | How |
|---------|-----|
| **Modular pricing** | Free tier = Sales + Intelligence. Paid = + Meetings + Marketing. Vertical apps = premium. |
| **Clean CRM** | Client only sees objects/fields relevant to installed apps. No 150-field sprawl. |
| **Independent development** | Each app built, tested, shipped separately. Doesn't block other apps. |
| **Vertical expansion** | BD & Licensing, Clinical, Regulatory — each vertical is a new app, not a CRM overhaul. |
| **Client choice** | "Install what you need." Feels like a platform, not a one-size-fits-all tool. |
| **Marketplace potential** | Long-term: third parties could build Succession apps. |

### App Framework Gaps to Investigate / Extend

Twenty's app framework is alpha. During dogfooding, verify and extend as needed:

| Capability | Status in Twenty | If gap, our fix |
|-----------|-----------------|-----------------|
| Create custom objects/fields on install | Likely supported (entity definitions in TypeScript) | Verify during dogfooding |
| Bundle pre-configured workflows | Unclear — may need API calls on install, not declarative bundling | Extend app framework: add `workflows/` directory to app spec, auto-create via `create_complete_workflow` on install |
| Create dashboards on install | Unclear — "front components" exist but dashboard integration TBD | Extend: add `dashboards/` directory to app spec, auto-create via dashboard API on install |
| Add navigation menu items | Supported in SDK | — |
| React UI components | Supported in SDK | — |
| App install/uninstall lifecycle hooks | Supported (`pre-install`, `post-install` hooks) | Use hooks to create workflows/dashboards if declarative isn't available |
| App versioning + updates | Exists but maturity unclear | Verify. May need to build migration logic per app version. |
| Data cleanup on uninstall | Unclear — what happens to objects/data when app is removed? | Probably: deactivate objects (hide), don't delete data. Let client re-install without data loss. |

**Key principle:** Since we own the fork, any gap in the app framework is fixable. We extend Twenty's app system to support our needs, keep changes clean and upstream-compatible, and contribute back where it makes sense.

### Rollout

| Phase | What |
|-------|------|
| Phase 1 (dogfooding) | Monolithic data model — all objects/fields installed together via migration script |
| Phase 2 (first clients) | Refactor into app packages. Sales + Intelligence + Context Engine are the base. Meetings is a toggle. |
| Phase 3 (scale) | Marketing app, vertical apps (BD & Licensing), app marketplace concept |

---

## Future Considerations

- **Sequence Editor UI** — Replace `stepsJson` TEXT field with a visual step editor component in the CRM
- **Event ↔ Campaign linking** — When events become a first-class campaign type, add a relation from Campaign → Event Bookmark
- **Document tracking (Papermark sync)** — Add: Shared Document object with view analytics
- **Database access tiers** — Free tier: browse-only (no `successionDbId` populated). Paid tier: import to CRM populates the link field
- **Multi-workspace** — If we move to true multi-tenant with workspace isolation, the Company Profile singleton pattern needs to be enforced at the app level
- **Real-time meeting coaching** — Recall.ai supports media streaming. Future: live prompts during calls based on what's being discussed + CRM context
- **Activepieces marketplace** — Build a library of Succession-specific flow templates that clients can one-click enable
- **Mobile experience** — PWA or native app when Twenty's mobile support matures
- **AI-powered pipeline forecasting** — Use meeting outcomes, signal data, and campaign engagement to predict deal close probability
- **Dashboard marketplace** — Library of pre-built dashboard templates users can one-click install
- **Vertical app library** — BD & Licensing, Clinical, Regulatory, Manufacturing — each as an installable app
- **Third-party app marketplace** — Allow other companies to build and distribute Succession apps

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-28 | Initial data model — 4 layers, 13 objects | Platform launch planning |
| 2026-03-28 | Added Integrations Architecture | Cal.com, Papermark, Recall.ai, Activepieces, BYOT support |
| 2026-03-28 | Added Billing, Auth, Onboarding, Email, Analytics, Outstanding Questions, Risk Register | Complete platform architecture |
| 2026-03-28 | Comprehensive field expansion | Added forecasting, attribution, scoring, engagement tracking, hidden fields for reporting |
| 2026-03-28 | Marketing: Mautic → composable architecture | Dittofeed preferred for campaigns, best-of-breed OSS tools for each function, all embedded in Twenty |
| 2026-03-28 | Added Dashboard Builder Skill | AI-powered dashboard creation from natural language |
| 2026-03-29 | Added App Architecture | Modular app packages (Sales, Intelligence, Meetings, Marketing, vertical apps), framework gaps to extend |
