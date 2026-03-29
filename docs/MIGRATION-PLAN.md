# CRM Migration Plan: Internal → Client Data Model

> **Goal:** Migrate the live internal CRM at `crm.succession.bio` to the client-facing data model defined in `CLIENT-DATA-MODEL.md`. After migration, our CRM runs the same schema clients will get — we dogfood our own product. Bison/HeyReach campaign data stays and flows in as if we were a client.

## Constraints

- **Live data:** 880+ companies, 1,700+ people, campaigns, activities. All changes must be additive.
- **Sync scripts continue working** during and after migration. They get updated to dual-write (old + new field names).
- **Proposals section untouched.** The `proposal` object and all proposal-related fields on Opportunity (`proposalId`, `proposalStatus`, `proposalSentDate`, `proposalViewCount`) stay exactly as-is. These are internal-only.
- **Bison/HeyReach data stays.** Campaign objects with `bisonCampaignId` and HeyReach stats remain. We keep syncing this data — it's our campaign data as if we were a client using the platform.
- **Twenty doesn't support field renames or type changes.** Renamed fields get a new field + data copy. Type changes (TEXT → SELECT) get a companion field.

## Key Files

| File | Repo | Purpose |
|------|------|---------|
| `scripts/twenty/setup-metadata.js` | Plugin | Current schema setup (what's deployed today) |
| `scripts/twenty/migrate-to-client-model.js` | Plugin | **NEW — migration script** |
| `scripts/twenty/migrate-field-data.js` | Plugin | **NEW — data copy for renamed fields** |
| `packages/succession-mcp/src/setup-client-schema.js` | CRM | Target schema for fresh client instances |
| `docs/CLIENT-DATA-MODEL.md` | CRM | Source of truth for all fields |
| `scripts/twenty/lib/sync-clients.js` | Plugin | Sync: Portal → Company |
| `scripts/twenty/lib/sync-leads.js` | Plugin | Sync: Portal → Person |
| `scripts/twenty/lib/sync-campaigns.js` | Plugin | Sync: Portal + Bison/HeyReach → Campaign |
| `scripts/twenty/lib/sync-campaign-leads.js` | Plugin | Sync: Campaign memberships |
| `scripts/twenty/lib/sync-activity.js` | Plugin | Sync: Activity events |
| `infrastructure/twenty-sync/src/index.js` | Plugin | Webhook worker |
| `infrastructure/twenty-sync/src/enrichment.js` | Plugin | Enrichment worker |

---

## Phase 0: Preparation

### 0.1 Snapshot current data

Export key records for rollback via Twenty REST API:

```bash
# Companies with current custom field values
curl -s "$TWENTY_BASE_URL/rest/companies?limit=1000" -H "Authorization: Bearer $TWENTY_API_KEY" > /tmp/backup-companies.json

# People with current custom field values
curl -s "$TWENTY_BASE_URL/rest/people?limit=2000" -H "Authorization: Bearer $TWENTY_API_KEY" > /tmp/backup-people.json

# Campaigns
curl -s "$TWENTY_BASE_URL/rest/campaigns?limit=500" -H "Authorization: Bearer $TWENTY_API_KEY" > /tmp/backup-campaigns.json

# Opportunities
curl -s "$TWENTY_BASE_URL/rest/opportunities?limit=500" -H "Authorization: Bearer $TWENTY_API_KEY" > /tmp/backup-opportunities.json
```

### 0.2 Document current field inventory

Run `setup-metadata.js --dry-run` and capture the output — this gives us the exact current state of all objects and fields.

---

## Phase 1: Additive Schema Changes

**Script:** `scripts/twenty/migrate-to-client-model.js`

Uses the same idempotent GraphQL Metadata API pattern as `setup-metadata.js` — loads state, checks before creating, skips existing fields.

### 1.1 Company — Add New Fields

**Fields to ADD (not in current schema):**

Core visible:
- `therapeuticArea` (TEXT)
- `technology` (TEXT)
- `fundingStage` (SELECT: Pre-Seed, Seed, Series A, Series B, Series C+, Public, Private)
- `companyType` (SELECT: Prospect, Customer, Partner, Competitor, Other) — default: Prospect
- `companyStatus` (SELECT: New, Active, Engaged, Customer, Churned, Do Not Contact)
- `yearFounded` (NUMBER)
- `totalFunding` (CURRENCY)
- `lastFundingDate` (DATE)
- `headquartersCountry` (TEXT)
- `headquartersCity` (TEXT)
- `doNotContact` (BOOLEAN, default: false)
- `dncReason` (SELECT: Competitor, Existing Customer, Requested Removal, Bad Fit, Other)

ICP & Scoring:
- `icpScore` (NUMBER)
- `icpScoreReason` (TEXT)
- `icpTier` (SELECT: Tier 1, Tier 2, Tier 3, Not a fit)

Engagement:
- `recentSignal` (TEXT)
- `recentSignalDate` (DATE_TIME)
- `totalContacts` (NUMBER)
- `totalOpenDeals` (NUMBER)
- `totalDealValue` (CURRENCY)

Enrichment (hidden):
- `enrichmentStatus` (SELECT: Not Enriched, Enriched, Failed)
- `lastEnrichedAt` (DATE_TIME)
- `enrichmentSource` (TEXT)
- `successionDbId` (TEXT)

Attribution (hidden):
- `firstTouchSource` (SELECT: Database, Import, Inbound, Event, Referral, Signal, Manual)
- `firstTouchDate` (DATE_TIME)
- `firstTouchCampaign` (TEXT)
- `lastActivityDate` (DATE_TIME)
- `lastContactedDate` (DATE_TIME)
- `daysSinceLastActivity` (NUMBER)
- `totalEmailsSent` (NUMBER)
- `totalReplies` (NUMBER)
- `totalMeetings` (NUMBER)
- `conversionDate` (DATE_TIME)

**Fields that exist but need type change → create companion:**
- `industry` is TEXT today → create `industryCategory` (SELECT: Biotech, Pharma, CRO, CDMO, Med Device, Diagnostics, Lab Equipment, Reagents, Digital Health, Other)
  - Fresh client instances will get `industry` as SELECT from day one
  - Our instance keeps TEXT `industry` + new SELECT `industryCategory`

**Fields that exist and stay as-is:**
- `websiteUrl` (TEXT — keep, client instances will get LINK type)
- `portalClientId` (TEXT — keep for sync, will be hidden in Phase 4)
- `clientStatus` (SELECT — keep for sync, superseded by `companyStatus`)

**Fields that exist and are INTERNAL ONLY (keep, hide later):**
- `monthlyFee`, `performanceFee`, `contractStartDate`, `contractEndDate`, `billingEmail`, `lastSyncedAt`
- `totalSentCount`, `totalReplyCount`, `totalPositiveReplies` — these overlap with new `totalEmailsSent`, `totalReplies` but have different semantics (portal aggregate vs CRM aggregate). Keep both.

### 1.2 Person — Add New Fields

**Fields to ADD:**

Core visible:
- `department` (SELECT: R&D, Clinical, Commercial, Manufacturing, Regulatory, Operations, Finance, IT, Procurement, Quality)
- `researchArea` (TEXT)
- `personalNote` (TEXT)
- `doNotContact` (BOOLEAN, default: false)
- `dncReason` (SELECT: Unsubscribed, Competitor, Existing Customer, Requested Removal, Bounced, Other)
- `dncDate` (DATE_TIME)

Scoring:
- `engagementScore` (NUMBER)
- `fitScore` (NUMBER)
- `combinedScore` (NUMBER)
- `scoreLastUpdated` (DATE_TIME)
- `personaMatch` (TEXT)
- `buyingRole` (SELECT: Champion, Decision Maker, Influencer, End User, Gatekeeper, Unknown)

Communication tracking (hidden):
- `emailStatus` (SELECT: Valid, Invalid, Catch-All, Unknown, Bounced)
- `emailVerifiedAt` (DATE_TIME)
- `totalEmailsSent` (NUMBER)
- `totalEmailsOpened` (NUMBER)
- `totalEmailsClicked` (NUMBER)
- `totalEmailsReplied` (NUMBER)
- `lastEmailSentDate` (DATE_TIME)
- `lastEmailOpenedDate` (DATE_TIME)
- `lastReplyDate` (DATE_TIME)
- `linkedinConnected` (BOOLEAN)
- `linkedinMessagesSent` (NUMBER)
- `linkedinMessagesReplied` (NUMBER)
- `totalMeetings` (NUMBER)
- `lastMeetingDate` (DATE_TIME)

Attribution (hidden):
- `firstTouchSource` (SELECT: Database, Import, Inbound, Event, Referral, Website, Manual)
- `firstTouchCampaign` (TEXT)
- `firstTouchDate` (DATE_TIME)
- `convertingCampaign` (TEXT)
- `convertingDate` (DATE_TIME)
- `lastTouchCampaign` (TEXT)
- `lastTouchDate` (DATE_TIME)
- `totalCampaignsTouched` (NUMBER)
- `daysSinceFirstTouch` (NUMBER)
- `daysSinceLastTouch` (NUMBER)

Enrichment (hidden):
- `enrichmentSource` (TEXT)
- `successionDbId` (TEXT)
- `secondaryEmail` (TEXT)
- `mobilePhone` (TEXT)
- `linkedinHeadline` (TEXT)

**Renamed fields → create new + copy data in Phase 2:**
- `seniorityLevel` → new field `seniority` (same SELECT options)
- `leadSentiment` → new field `sentiment` (same SELECT options)

**SELECT options to expand (add new values, never remove):**
- `leadStage`: add Engaged, Customer, Do Not Contact (keep existing values)
- `leadSource`: add Database, Enrichment, Import, Event, Website (keep existing values)
- `enrichmentStatus`: add NOT_ENRICHED (keep PENDING, ENRICHED, FAILED)

**Fields that exist and are INTERNAL ONLY (keep, hide later):**
- `portalLeadId`, `portalCampaignName`, `companyDomain`, `leadCategory`

### 1.3 Opportunity — Add New Fields

**Fields to ADD:**

Core visible:
- `dealType` (SELECT: New Business, Expansion, Renewal, Other)
- `annualValue` (CURRENCY)
- `probability` (NUMBER)
- `weightedValue` (CURRENCY)
- `nextStep` (TEXT)
- `competitorInDeal` (TEXT)
- `championName` (TEXT)
- `decisionMaker` (TEXT)

Forecasting:
- `forecastCategory` (SELECT: Pipeline, Best Case, Commit, Closed Won, Closed Lost, Omitted)
- `forecastLastUpdated` (DATE_TIME)
- `originalCloseDate` (DATE)
- `closeDatePushCount` (NUMBER)

Attribution (hidden):
- `sourceChannel` (SELECT: Email Campaign, LinkedIn Campaign, Inbound, Referral, Event, Signal, Other)
- `sourceCampaign` (TEXT)
- `sourceSignal` (TEXT)
- `createdDate` (DATE_TIME)
- `stageEnteredDate` (DATE_TIME)
- `daysInCurrentStage` (NUMBER)
- `totalDaysOpen` (NUMBER)
- `averageStageDuration` (TEXT)

Close analysis (hidden):
- `lostReasonDetail` (TEXT)
- `lostToCompetitor` (TEXT)
- `wonDate` (DATE_TIME)
- `lostDate` (DATE_TIME)
- `salesCycleDays` (NUMBER)
- `totalMeetingsInDeal` (NUMBER)
- `totalEmailsInDeal` (NUMBER)

**Type change → companion field:**
- `lostReason` is TEXT today → create `lostReasonCategory` (SELECT: No Budget, No Need, Competitor Won, Timing, No Response, Other)
  - Keep TEXT `lostReason` for free-form detail (maps to `lostReasonDetail` in client schema)

**DO NOT TOUCH — Proposal fields stay exactly as-is:**
- `proposalId` (TEXT)
- `proposalStatus` (SELECT)
- `proposalSentDate` (DATE)
- `proposalViewCount` (NUMBER)
- `performanceValue` (CURRENCY)

### 1.4 Campaign — Add New Fields

- `campaignType` (SELECT: Cold Outbound, Nurture, Event Follow-Up, Re-Engagement, ABM, Signal-Triggered)
- `theme` (TEXT)
- `targetAudience` (TEXT)
- `scheduledAt` (DATE_TIME)
- `totalClicked` (NUMBER)
- `totalNegative` (NUMBER)
- `dealsCreated` (NUMBER)
- `revenueGenerated` (CURRENCY)
- `deliveryRate` (NUMBER)
- `clickRate` (NUMBER)
- `positiveReplyRate` (NUMBER)
- `bounceRate` (NUMBER)
- `costPerMeeting` (CURRENCY)
- `budget` (CURRENCY)
- `costPerLead` (CURRENCY)
- `roi` (NUMBER)
- `averageResponseTime` (NUMBER)
- `stepsCompleted` (NUMBER)
- `totalSteps` (NUMBER)

Add relations:
- Campaign → Persona (many-to-one)
- Campaign → Sequence (many-to-one, after Sequence object created)
- Campaign → Event Bookmark (many-to-one, after EventBookmark created)

**Keep existing Bison/HeyReach fields — this is our campaign data:**
- `bisonCampaignId`, `portalCampaignId`, `portalCreatedAt`, `startedAt`
- `connectionsSent`, `connectionsAccepted`, `connectionRate`, `messagesSent`, `messagesReplied`
- These will be hidden from client instances but stay visible on ours

### 1.5 Campaign Membership — Add New Fields

- `currentStep` (NUMBER)
- `emailsSent` (NUMBER)
- `emailsOpened` (NUMBER)
- `emailsClicked` (NUMBER)
- `emailsReplied` (NUMBER)
- `lastSentDate` (DATE_TIME)
- `lastOpenedDate` (DATE_TIME)
- `lastRepliedDate` (DATE_TIME)
- `stageChangedDate` (DATE_TIME)
- `linkedinSent` (NUMBER)
- `linkedinReplied` (NUMBER)
- `meetingBookedDate` (DATE_TIME)
- `optedOutDate` (DATE_TIME)
- `optedOutReason` (TEXT)

### 1.6 Meeting — Add New Fields

- `outcome` (SELECT: Positive, Neutral, Negative, No Show)
- `nextSteps` (TEXT)
- `competitorsMentioned` (TEXT)
- `buyingSignals` (TEXT)
- `transcriptUrl` (TEXT)
- `calendarEventId` (TEXT)
- `recallBotId` (TEXT)
- `isRecorded` (BOOLEAN)
- `isTranscribed` (BOOLEAN)
- `aiProcessedAt` (DATE_TIME)
- `preCallBriefGenerated` (BOOLEAN)
- `attendeeEmails` (TEXT)
- `meetingSource` (SELECT: Cal.com, Google Calendar, Outlook, Manual)
- `noShowFollowUpSent` (BOOLEAN)

Add relations:
- Meeting → Person (many-to-one)
- Meeting → Opportunity (many-to-one)
- Meeting → Campaign (many-to-one, optional)

**Keep existing:** `granolaId` (our internal Granola sync ID — hide from client views later)

### 1.7 Context Engine Objects — Add Fields

**Company Profile — add:**
- `companyName` (TEXT)
- `companyOverview` (TEXT)
- `website` (TEXT)
- `proofPoints` (TEXT)
- `icpDisqualifiers` (TEXT)

**Persona — add:**
- `department` (TEXT)
- `seniorityLevel` (TEXT — note: this is a TEXT field on Persona, not the same as the SELECT on Person)
- `valueProps` (TEXT)
- `responsibilities` (TEXT)
- `messagingNotes` (TEXT)

**Case Study — add:**
- `customerName` (TEXT)
- `isPublic` (BOOLEAN, default: true)

### 1.8 Create New Objects

**Sequence:**
- `name` (TEXT — standard)
- `channel` (SELECT: Email, LinkedIn)
- `sequenceStatus` (SELECT: Draft, Ready, Archived)
- `stepCount` (NUMBER)
- `stepsJson` (TEXT)
- `isTemplate` (BOOLEAN)
- `timesUsed` (NUMBER)
- Relation → Persona (many-to-one)

**Signal:**
- `signalType` (SELECT: Funding, New Hire, Product Launch, Publication, Regulatory, Partnership, Acquisition, Clinical Trial, Leadership Change)
- `headline` (TEXT)
- `details` (TEXT)
- `sourceUrl` (TEXT)
- `detectedAt` (DATE_TIME)
- `relevanceScore` (NUMBER)
- `suggestedAction` (TEXT)
- `isActioned` (BOOLEAN)
- `actionedDate` (DATE_TIME)
- `actionTaken` (TEXT)
- Relation → Company (many-to-one)
- Relation → Person (many-to-one, optional)

**Event Bookmark:**
- `eventName` (TEXT)
- `eventDate` (DATE)
- `endDate` (DATE)
- `location` (TEXT)
- `eventType` (SELECT: Conference, Trade Show, Symposium, Webinar, Workshop)
- `website` (TEXT)
- `successionEventId` (TEXT)
- `notes` (TEXT)
- `eventStatus` (SELECT: Interested, Planning, Registered, Attended)

**Suggested Action:**
- `title` (TEXT)
- `description` (TEXT)
- `actionType` (SELECT: Outreach, Follow-Up, Research, Add to Campaign, Schedule Meeting, Send Document, Review Deal, Other)
- `priority` (SELECT: High, Medium, Low)
- `status` (SELECT: New, Accepted, Completed, Dismissed, Snoozed)
- `suggestedMessage` (TEXT)
- `snoozedUntil` (DATE_TIME)
- `sourceType` (SELECT: Signal, Pipeline Coach, Campaign Alert, Meeting Follow-Up, Enrichment, ICP Match, No-Show Recovery, Lead Recycler)
- `completedAt` (DATE_TIME)
- `completedNote` (TEXT)
- Relations → Person, Company, Opportunity, Signal, Campaign, Meeting (all many-to-one, optional)

### 1.9 Run Migration Script

```bash
# Dry run first
TWENTY_API_KEY=xxx TWENTY_BASE_URL=https://crm.succession.bio \
  node scripts/twenty/migrate-to-client-model.js --dry-run

# Then for real
TWENTY_API_KEY=xxx TWENTY_BASE_URL=https://crm.succession.bio \
  node scripts/twenty/migrate-to-client-model.js
```

---

## Phase 2: Data Migration

**Script:** `scripts/twenty/migrate-field-data.js`

Batch PATCH operations to copy data from old field names to new ones.

### 2.1 Person: `seniorityLevel` → `seniority`

Query all People where `seniorityLevel` is set. PATCH each with `seniority` = same value.
Same enum: C_SUITE, VP, DIRECTOR, MANAGER, IC. No mapping needed.

### 2.2 Person: `leadSentiment` → `sentiment`

Query all People where `leadSentiment` is set. PATCH each with `sentiment` = same value.
Same enum: POSITIVE, NEUTRAL, NEGATIVE.

### 2.3 Company: `clientStatus` → `companyStatus`

Map values:
- PROSPECT → NEW
- ACTIVE → ACTIVE
- CHURNED → CHURNED
- PAUSED → ACTIVE

### 2.4 Company: `industry` (TEXT) → `industryCategory` (SELECT)

Map common text values to SELECT options:
- "Biotechnology" / "Biotech" → BIOTECH
- "Pharmaceutical" / "Pharma" → PHARMA
- "Contract Research" / "CRO" → CRO
- "Contract Manufacturing" / "CDMO" → CDMO
- "Medical Device" → MED_DEVICE
- "Diagnostics" → DIAGNOSTICS
- "Lab Equipment" → LAB_EQUIPMENT
- Others → OTHER

Log any unmapped values for manual review.

### 2.5 Populate `successionDbId`

- Company: copy `portalClientId` → `successionDbId`
- Person: copy `portalLeadId` → `successionDbId`

Same values, different field name. This bridges the old and new naming.

### 2.6 Backfill `firstTouchDate`

For all existing People and Companies, set `firstTouchDate` = record's `createdAt` timestamp (from Twenty's standard field).

### 2.7 Run Data Migration

```bash
TWENTY_API_KEY=xxx TWENTY_BASE_URL=https://crm.succession.bio \
  node scripts/twenty/migrate-field-data.js --dry-run

TWENTY_API_KEY=xxx TWENTY_BASE_URL=https://crm.succession.bio \
  node scripts/twenty/migrate-field-data.js
```

Processes in batches of 50 with progress logging.

---

## Phase 3: Update Sync Scripts

All sync scripts updated to dual-write — old field names (for backward compatibility) AND new field names.

### 3.1 `sync-clients.js`

| Current write | Add new write |
|--------------|---------------|
| `portalClientId` | `successionDbId` (same value) |
| `clientStatus` | `companyStatus` (mapped value) |
| — | `companyType` = CUSTOMER (these are our clients) |
| — | `firstTouchSource` = MANUAL (if not already set) |

### 3.2 `sync-leads.js`

| Current write | Add new write |
|--------------|---------------|
| `portalLeadId` | `successionDbId` (same value) |
| `seniorityLevel` | `seniority` (same value) |
| `leadSentiment` | `sentiment` (same value) |
| — | `firstTouchSource` based on `leadSource` |
| — | `firstTouchDate` = `createdAt` (if not already set) |

### 3.3 `sync-campaigns.js`

| Current write | Add new write |
|--------------|---------------|
| All existing stats fields | `campaignType` = COLD_OUTBOUND (default) |
| — | `totalClicked` (from Bison if available) |
| — | `deliveryRate`, `clickRate`, `positiveReplyRate`, `bounceRate` (calculate from existing stats) |

### 3.4 `sync-campaign-leads.js`

| Current write | Add new write |
|--------------|---------------|
| `leadStage`, `sentiment` | `stageChangedDate` = now (on stage change) |
| — | `emailsSent`, `emailsOpened`, `emailsReplied` (from Bison per-lead stats if available) |

### 3.5 Webhook worker (`infrastructure/twenty-sync/src/index.js`)

| Handler | Add new writes |
|---------|---------------|
| `handlePortalLeadStage` | Write `sentiment` alongside `leadSentiment` |
| `handlePortalLeadReplied` | Write `lastReplyDate` = now, increment `totalEmailsReplied` |
| All handlers using `portalLeadId` | Also write `successionDbId` |

### 3.6 Enrichment worker (`infrastructure/twenty-sync/src/enrichment.js`)

| Current write | Add new write |
|--------------|---------------|
| `enrichmentStatus` | Use NOT_ENRICHED as default (alongside PENDING) |
| — | `enrichmentSource` = provider name |
| — | `emailStatus` = validation result |
| — | `emailVerifiedAt` = now |
| — | `linkedinHeadline` (from LinkedIn enrichment) |

---

## Phase 4: Hide Internal Fields

After Phases 1-3 are tested and working, hide deprecated/internal fields from the CRM UI using the Metadata API.

**Deactivate (set `isActive: false` or hide from views):**

Company:
- `portalClientId` (replaced by `successionDbId`)
- `clientStatus` (replaced by `companyStatus`)
- `monthlyFee`, `performanceFee`, `contractStartDate`, `contractEndDate`, `billingEmail`, `lastSyncedAt`

Person:
- `portalLeadId` (replaced by `successionDbId`)
- `seniorityLevel` (replaced by `seniority`)
- `leadSentiment` (replaced by `sentiment`)
- `leadCategory`, `portalCampaignName`, `companyDomain`

Campaign:
- `portalCampaignId`, `portalCreatedAt`, `startedAt`
- NOTE: Keep `bisonCampaignId` visible on our instance (useful for debugging). Hide on client instances.

Campaign Membership:
- `portalLeadId`, `portalCampaignId`, `leadCategory`

Meeting:
- `granolaId` (keep visible on our instance, hide on client instances)

**DO NOT hide or deactivate:**
- Proposal-related fields on Opportunity (our internal use)
- Bison/HeyReach campaign stats (our campaign data)
- Any field that sync scripts still write to (they write to hidden fields silently — that's fine)

---

## Phase 5: Reconcile Setup Scripts

### 5.1 Create shared schema definitions

New file: `scripts/twenty/lib/schema-definitions.js`

Exports:
- `CLIENT_COMPANY_FIELDS` — all fields from CLIENT-DATA-MODEL.md for Company
- `CLIENT_PERSON_FIELDS` — all fields for Person
- `CLIENT_OPPORTUNITY_FIELDS` — all fields for Opportunity
- `CLIENT_CUSTOM_OBJECTS` — all custom object definitions (Campaign, CampaignMembership, Sequence, Signal, EventBookmark, SuggestedAction, CompanyProfile, Persona, Product, CaseStudy, Meeting)
- `INTERNAL_EXTRA_FIELDS` — portal IDs, billing fields, Bison/HeyReach IDs, Granola IDs, proposal fields

### 5.2 Update `setup-metadata.js`

Import from shared module + add internal extras:
```javascript
const { CLIENT_COMPANY_FIELDS, INTERNAL_EXTRA_FIELDS } = require('./lib/schema-definitions');
const COMPANY_FIELDS = [...CLIENT_COMPANY_FIELDS, ...INTERNAL_EXTRA_FIELDS.company];
```

### 5.3 Update `setup-client-schema.js`

Import from shared module (client fields only, no internal extras).
This ensures both scripts define the same base schema.

---

## Phase 6: Seed Our Data as a Client

After migration, our CRM should look like a client instance with real data.

### 6.1 Create our Company Profile

Create a `companyProfile` record for Succession Bio:
- `companyName`: Succession Bio
- `companyOverview`: Done-for-you and self-serve lead generation for life science companies
- `icpIndustries`: Biotech, Pharma, CRO, CDMO, Med Device, Diagnostics
- `icpTherapeuticAreas`: All
- `icpCompanyTypes`: Biotech, Pharma, CRO, CDMO
- `icpCompanySize`: 10-1000
- `icpFundingStages`: Series A, Series B, Series C+
- `icpGeographies`: UK, US, Germany, Switzerland, Netherlands
- `brandTone`: Consultative
- etc. (pull from existing portal profile)

### 6.2 Create our Personas

Create `persona` records from our existing portal personas — these already exist as clientProfile sub-objects but need to be verified against the new schema.

### 6.3 Verify Bison/HeyReach sync

Run a full sync cycle and confirm:
- Campaign objects have our real campaign data
- Campaign stats (sent, replied, opened, meetings) are populated
- Campaign Memberships link People → Campaigns
- Person timelines show email/LinkedIn activity
- All new fields are being written by the dual-write sync scripts

### 6.4 Run ICP scoring on existing Companies

Trigger the "Qualify this company" workflow on all Company records to populate `icpScore`, `icpScoreReason`, `icpTier`. This validates the ICP scoring workflow works at scale.

---

## Phase 7: Validation

### 7.1 Schema validation

```bash
# Run migration script in dry-run — should report all fields as "already exists"
node scripts/twenty/migrate-to-client-model.js --dry-run
```

### 7.2 Sync validation

```bash
# Run full sync cycle
node scripts/twenty/sync-portal.js --phase all
```

Verify: no errors, new fields populated, old fields still have data.

### 7.3 Spot checks

In the CRM UI, verify:
- [ ] Company has both `clientStatus` (old, hidden) and `companyStatus` (new, visible)
- [ ] Person has both `seniorityLevel` (old, hidden) and `seniority` (new, visible)
- [ ] Person has `sentiment` field with correct values
- [ ] Campaign objects have Bison/HeyReach stats
- [ ] New objects exist: Sequence, Signal, EventBookmark, SuggestedAction
- [ ] Proposal fields on Opportunity are untouched
- [ ] Company Profile record exists for Succession Bio
- [ ] Hidden fields are not visible in default views
- [ ] Hidden fields still have data (query via API)

### 7.4 Webhook test

Send test payloads to the twenty-sync worker endpoints and verify new fields are written.

### 7.5 Enrichment test

Trigger enrichment on a test Person and verify new fields (`enrichmentSource`, `emailStatus`, `linkedinHeadline`) are populated.

---

## Phase 8: Build Meetings App (extending call-recording)

### Why Extend, Not Build From Scratch

Twenty's internal `call-recording` app already has:
- `callRecording` object with recording file, transcript file, summary, status
- React components: MediaPlayer (audio/video), TranscriptViewer (with time sync), SummaryViewer
- Relations to Person and WorkspaceMember
- AI summarization skill
- Skeleton loaders, navigation items, views

Instead of building a Meetings app from zero, we **fork `call-recording` into `succession-meetings`** and extend it with our context engine, Recall.ai integration, and Suggested Action workflows.

### 8.1 Fork and rename

```bash
cp -r packages/twenty-apps/internal/call-recording packages/twenty-apps/community/succession-meetings
# Update package.json name, twenty-app.json metadata
```

### 8.2 What we keep from call-recording

- `callRecording` object (rename to `meeting` or extend with additional fields)
- MediaPlayer component (audio/video playback)
- TranscriptViewer component (time-synced transcript display)
- SummaryViewer component (rendered summary)
- Person and WorkspaceMember relations
- AI summarization skill (we'll enhance it)
- Navigation menu item and views

### 8.3 What we add

**Additional fields on the meeting/callRecording object:**
- `meetingType` (SELECT: Discovery, Demo, Proposal Review, Follow-Up, Negotiation, Onboarding, QBR, Other)
- `outcome` (SELECT: Positive, Neutral, Negative, No Show)
- `nextSteps` (TEXT)
- `competitorsMentioned` (TEXT)
- `buyingSignals` (TEXT)
- `calendarEventId` (TEXT) — hidden
- `recallBotId` (TEXT) — hidden
- `meetingSource` (SELECT: Cal.com, Google Calendar, Outlook, Recall.ai, Manual) — hidden
- `preCallBriefGenerated` (BOOLEAN) — hidden
- `noShowFollowUpSent` (BOOLEAN) — hidden

**Additional relations:**
- Meeting → Opportunity (many-to-one)
- Meeting → Campaign (many-to-one, optional)

**New logic functions:**

| Function | Trigger | What it does |
|----------|---------|-------------|
| `pre-call-brief` | Database event: Calendar Event created with external participant | Gathers Person + Company + Opportunity + Company Profile context → AI generates brief → creates Note on Person |
| `meeting-followup` | Database event: Meeting created with outcome = Positive/Neutral | Waits 2hrs → gathers CRM context → AI generates follow-up draft → creates Suggested Action + Gmail/Outlook draft (if connected via Activepieces) |
| `no-show-recovery` | Database event: Meeting created with outcome = No Show | Generates recovery message → creates Suggested Action. After 3 days, creates reschedule Suggested Action if no stage change. |
| `recall-webhook` | HTTP route: `POST /app/succession-meetings/recall` | Receives Recall.ai callback → matches attendees to Person records → gathers full CRM context (Person, Company, Opportunity, Company Profile, previous meetings, campaign history) → AI processes transcript with context → creates Meeting record with context-aware notes + action items → creates Tasks → updates Opportunity if recommended → creates Suggested Actions for follow-ups |

**Enhanced AI summarization:**
The existing `call-transcript-summarization` skill gets upgraded. Instead of generic summarization, it receives a context packet:
- Company Profile (ICP, products, value props, personas)
- Person record (title, department, seniority, previous interactions)
- Company record (industry, funding, ICP score)
- Opportunity (deal stage, value)
- Previous meetings (last summary, open action items)

This produces context-aware output: references relevant products/case studies, flags competitor mentions against known competitors, detects buying signals against the ICP, and suggests specific next steps.

**New React component:**
- `MeetingBrief.tsx` — renders the pre-call brief inline on the Person record detail page. Shows: company context, ICP fit, previous interactions, talking points, relevant products/case studies, open action items from previous meetings.

### 8.4 App structure

```
packages/twenty-apps/community/succession-meetings/
├── src/
│   ├── objects/
│   │   └── meeting.ts              # Extended from call-recording with new fields
│   ├── fields/
│   │   ├── meeting-on-person.ts    # Existing (from call-recording)
│   │   ├── meeting-on-opportunity.ts  # NEW — relation to Opportunity
│   │   └── meeting-on-campaign.ts  # NEW — relation to Campaign
│   ├── logic/
│   │   ├── pre-call-brief.ts       # NEW — calendar event → context brief
│   │   ├── meeting-followup.ts     # NEW — post-meeting draft + Suggested Action
│   │   ├── no-show-recovery.ts     # NEW — no-show detection + recovery
│   │   ├── recall-webhook.ts       # NEW — Recall.ai webhook handler
│   │   └── end-recording.ts        # Existing (from call-recording)
│   ├── skills/
│   │   └── context-aware-summarization.ts  # Enhanced from call-recording
│   ├── components/
│   │   ├── call-recording-viewer.tsx    # Existing (from call-recording)
│   │   ├── call-recording-summary.tsx   # Existing
│   │   └── meeting-brief.tsx            # NEW — pre-call brief component
│   ├── views/
│   │   └── meeting-view.ts         # Existing (from call-recording)
│   └── navigation/
│       └── meetings-nav.ts         # Renamed from call-recording nav
├── package.json
└── application.config.ts
```

### 8.3 What the app creates on install

**Meeting object with fields:**
- `meetingDate` (DATE_TIME)
- `duration` (NUMBER)
- `meetingType` (SELECT: Discovery, Demo, Proposal Review, Follow-Up, Negotiation, Onboarding, QBR, Other)
- `summary` (TEXT) — AI-generated, context-aware
- `actionItems` (TEXT) — AI-extracted
- `outcome` (SELECT: Positive, Neutral, Negative, No Show)
- `nextSteps` (TEXT)
- `competitorsMentioned` (TEXT)
- `buyingSignals` (TEXT)
- `recordingUrl` (TEXT)
- `transcriptUrl` (TEXT)
- `calendarEventId` (TEXT) — hidden
- `recallBotId` (TEXT) — hidden
- `isRecorded` (BOOLEAN) — hidden
- `isTranscribed` (BOOLEAN) — hidden
- `aiProcessedAt` (DATE_TIME) — hidden
- `preCallBriefGenerated` (BOOLEAN) — hidden
- `attendeeEmails` (TEXT) — hidden
- `meetingSource` (SELECT: Cal.com, Google Calendar, Outlook, Manual) — hidden
- `noShowFollowUpSent` (BOOLEAN) — hidden

**Relations:**
- Meeting → Person (many-to-one)
- Meeting → Company (many-to-one)
- Meeting → Opportunity (many-to-one)
- Meeting → Campaign (many-to-one, optional)

**Logic functions (workflows):**

| Function | Trigger | What it does |
|----------|---------|-------------|
| `pre-call-brief` | Database event: Calendar Event created with external participant | Gathers Person + Company + Opportunity + Company Profile context → AI Agent generates brief → creates Note on Person |
| `meeting-followup` | Database event: Meeting created with outcome = Positive or Neutral | Waits 2hrs → gathers context → AI generates follow-up draft → creates Suggested Action + Gmail/Outlook draft (if connected) |
| `no-show-recovery` | Database event: Meeting created with outcome = No Show | Generates recovery message → creates Suggested Action. After 3 days, creates reschedule Suggested Action if no stage change. |
| `recall-webhook` | HTTP route: `POST /app/succession-meetings/recall` | Receives Recall.ai callback → matches attendees to Person records → gathers CRM context → AI processes transcript → creates Meeting record with AI notes + action items → creates Tasks → updates Opportunity if recommended |

**React component:**
- `MeetingBrief` — renders the pre-call brief inline on the Person record detail page. Shows: company context, ICP fit, last interactions, talking points, relevant products/case studies, open action items.

### 8.4 Install existing community apps

Before building our custom Meetings app, install these existing apps on our CRM instance to test the app framework and get immediate value:

**Prerequisites:** Node 24+, Yarn 4.13+, monorepo dependencies installed, CRM added as remote.

**Dev environment status (as of 2026-03-29):**
- ✅ Node 24.14.1 installed via fnm
- ✅ Yarn 4.13.0 via corepack
- ✅ Monorepo deps installed (`yarn install`)
- ✅ Twenty SDK built (`vite build --config vite.config.node.ts`)
- ✅ CRM added as remote (`twenty remote add` → succession-crm authenticated)
- ❌ App installation blocked — `twenty-sdk/clients` subpath not resolvable for new-format apps (call-recording, apollo-enrich). Old-format apps (9 of 13) need the legacy serverless deployment path.

**Current blocker:** The `twenty-sdk/clients` import is auto-generated per workspace during the full build pipeline. Local builds from the monorepo fail because this module doesn't exist at build time. Resolution options:
1. Run a local Twenty dev server that generates the typed client on the fly
2. Publish apps as npm packages and install via marketplace registration
3. Manually generate the typed client from our CRM's GraphQL schema
4. Use the `twenty dev` command which handles the client generation (requires local server)

**App format inventory:**
- New format (`defineApplication()`): call-recording, apollo-enrich — **blocked on build**
- Old format (`application.config.ts` + `serverlessFunctions/`): 9 apps — **need legacy deploy path**

**Marketplace status:** The Twenty marketplace catalog is hardcoded with only 2 apps (Data Enrichment mock + Hello World). Community apps are source code only — not published or discoverable from the CRM admin UI.

**Next steps (dedicated session):**
1. Set up full Twenty local dev server to enable `twenty dev` for app development
2. Resolve `twenty-sdk/clients` generation for remote deployment
3. Install apps one by one, starting with call-recording and rollup-engine
4. Register our custom apps in the marketplace catalog for the fork

```bash
# What's already done:
eval "$(fnm env)" && fnm use 24
cd ~/Documents/Claude\ Code/succession-crm
# yarn install already complete
# SDK built at packages/twenty-sdk/dist/

# CRM remote configured:
node packages/twenty-sdk/dist/cli.cjs remote list
# * succession-crm  https://crm.succession.bio  [api-key]
```

**What we get immediately from installed apps:**
- `call-recording`: the base for our Meetings app (object, components, AI summarization)
- `rollup-engine`: auto-calculated Company aggregates (totalPipeline, wonDeals, etc.)
- `last-email-interaction`: interaction recency tracking on Person/Company
- `activity-summary`: daily Slack digest of CRM activity
- Others: reference patterns for building our own integrations

### 8.5 What this tests

| App framework capability | What we learn |
|--------------------------|--------------|
| Object creation on install | Does the Meeting object get created with all fields and relations when the app is installed? |
| Logic function triggers | Do database event triggers fire correctly? Do HTTP routes work? |
| React components | Does MeetingBrief render inline on the Person record page? |
| AI Agent integration | Can logic functions call the AI Agent (Claude) for brief/note generation? |
| Cross-object relations | Does Meeting properly link to Person, Company, Opportunity, Campaign? |
| Install/uninstall lifecycle | What happens to Meeting data if the app is uninstalled? Can it be reinstalled cleanly? |
| Workflow equivalence | Are logic functions as capable as native Twenty workflows for our use cases? |

### 8.5 What to do if the app framework has gaps

Since we own the fork, we can extend Twenty's app framework:

| Gap | Our fix |
|-----|---------|
| Can't create workflows from app | Add `workflows/` directory to app spec — auto-create via `create_complete_workflow` API in the post-install hook |
| Can't create dashboards from app | Add `dashboards/` directory to app spec — auto-create via dashboard API in post-install hook |
| Logic functions can't call AI Agent | Route through Platform API HTTP request from the logic function (same as workflow HTTP Request action) |
| Can't hide fields by default | Add field visibility config to the object definition (`hidden: true` flag) |
| No app settings/config UI | Build a settings page as a React component, store config in a custom object or app metadata |

Document every gap found and the workaround used. This becomes the blueprint for packaging all other apps.

### 8.6 Migration plan adjustment

The Meeting object in Phase 1.6 of this migration plan (adding fields to the existing `meeting` object) is **replaced** by the app install in Phase 8. On our dogfood CRM:

1. Run Phases 1.1-1.5 (Company, Person, Opportunity, Campaign, Campaign Membership) via the migration script as planned
2. Run Phases 1.7-1.8 (Context Engine updates + new objects: Sequence, Signal, EventBookmark, SuggestedAction) via the migration script
3. **Skip Phase 1.6** (Meeting fields) — the Meetings app handles this
4. Install the Succession Meetings app → Meeting object gets created/updated with all new fields
5. Verify the existing `meeting` records (Granola sync data) are preserved and the new fields are added alongside

If the app install can't handle updating an existing object (only creating new ones), fall back to Phase 1.6 migration script for the fields and use the app only for the logic functions and React components.

---

## Execution Timeline

| Phase | Effort | Dependencies |
|-------|--------|-------------|
| Phase 0: Preparation | 30 min | None |
| Phase 1: Schema migration script (excl. Meeting) | 2-3 hrs | None |
| Phase 2: Data migration script | 1 hr | Phase 1 complete |
| Phase 3: Sync script updates | 2 hrs | Phase 1 complete (can parallel with Phase 2) |
| Phase 4: Hide internal fields | 30 min | Phases 2 + 3 tested |
| Phase 5: Reconcile setup scripts | 1 hr | Phase 1 complete |
| Phase 6: Seed our data | 1 hr | Phases 1-3 complete |
| Phase 7: Validation | 1 hr | All phases complete |
| Phase 8: Build + install Meetings app | 3-4 hrs | Phase 1 complete (can parallel with 2-5) |

**Total: ~1.5 days of execution.** Phase 8 can run in parallel with most other phases.

---

## Rollback Plan

If anything goes wrong:
1. **Schema changes are additive** — new fields don't break anything. Just ignore them.
2. **Data migration is copyable** — old fields still have original values. New fields can be cleared.
3. **Sync scripts dual-write** — revert to old sync scripts if new field writes cause issues.
4. **Hidden fields can be unhidden** — just set `isActive: true` again.
5. **Backup data** from Phase 0 can be re-imported via REST API.
6. **Meetings app can be uninstalled** — if the app causes issues, uninstall it and fall back to the Phase 1.6 migration script for Meeting fields.

No destructive operations in this migration. Everything is reversible.
