# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Speed to Lead Workflow Manager - A Next.js application for managing automated "Speed to Lead" call connection workflows. The system creates and manages n8n workflows that automatically connect incoming leads with business owners via phone calls, with agency-based multi-tenancy support.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase, n8n integration

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture Overview

### Multi-Agency Structure

The application uses a three-tier hierarchy:
- **Agencies** - Top-level organizations (marketing agencies)
- **Clients** - Business clients owned by agencies
- **Workflows** - n8n automation workflows for each client

Each agency has its own n8n instance URL and API credentials (n8n, OpenAI, Twilio keys).

### Data Flow: Workflow Creation

1. User creates client in dashboard → Client stored in Supabase with `agency_id`
2. POST `/api/workflows` → Checks for existing n8n workflow by name
3. If not exists: Fetches template workflow from n8n (`TEMPLATE_WORKFLOW_ID`)
4. Customizes template with client data using `lib/n8n-helpers.ts`
5. Creates new workflow in n8n API → Returns workflow with `webhookId`
6. Extracts webhook URLs and stores in Supabase workflows table
7. Links workflow to client via `client_id` foreign key

### Key Database Schema

```
agencies
  - id (uuid)
  - name (text)
  - n8n_instance_url (text)
  - n8n_api_key (text, encrypted)
  - openai_api_key (text, encrypted)
  - twilio_api_key (text, encrypted)

clients
  - id (text, PK = business_name for compatibility)
  - name (text)
  - business_name (text)
  - owner_name (text)
  - business_phone (text)
  - twilio_number (text)
  - website (text, nullable)
  - agency_id (uuid, FK to agencies)

workflows
  - id (uuid)
  - client_id (text, FK to clients.id)
  - n8n_workflow_id (text)
  - workflow_name (text)
  - status ('active' | 'paused' | 'error')
  - lead_form_webhook (text)
  - ivr_webhook (text, nullable)
  - n8n_url (text)
  - last_activity (timestamp, nullable)
```

### n8n Workflow Template Customization

The `customizeWorkflow()` function in `lib/n8n-helpers.ts` modifies a template workflow by:
1. Updating workflow name to `{businessName} - STL`
2. Injecting client phone numbers into webhook/set nodes
3. Replacing `client_id` query parameters in HTTP nodes with `eq.{clientId}` format (Supabase PostgREST filtering)
4. Setting business owner name for call scripts
5. Configuring Twilio "From" number in call initiation nodes

**Critical:** All HTTP Request nodes with `client_id` parameters must use `eq.{value}` format for Supabase RLS filtering.

### Webhook URL Extraction

After workflow creation, `extractLeadFormWebhook()` and `extractIVRWebhook()` parse n8n's workflow JSON to find webhook nodes by name and extract `webhookId` properties. These become the public webhook URLs users integrate with lead forms.

## API Routes Structure

### Client/Agency Management
- `GET/POST/PUT /api/agencies` - CRUD for agencies
- `GET/POST/PUT/DELETE /api/clients` - CRUD for clients
- `PUT /api/clients/[id]` - Update individual client (including website field)

### Workflow Management
- `GET /api/workflows` - List all workflows (with `?client_id` filter)
- `POST /api/workflows` - Create workflow (checks for duplicates, supports linking existing)
- `GET /api/workflows/[id]` - Get workflow details with joined client data
- `DELETE /api/workflows/[id]` - Delete workflow (removes from both Supabase and n8n)

### n8n Integration
- `GET /api/n8n/workflows` - Fetch workflows from n8n API
- `GET /api/n8n/workflow/[id]` - Fetch single workflow from n8n
- `POST /api/n8n/import-workflow` - Import existing n8n workflow to Supabase

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon key (for client-side)
SUPABASE_SERVICE_ROLE_KEY=         # Service role key (for API routes, bypasses RLS)
N8N_API_URL=                       # Default n8n instance URL
N8N_API_KEY=                       # Default n8n API key
TEMPLATE_WORKFLOW_ID=              # n8n template workflow ID to clone
```

## UI/UX Design System

### Dark Theme Palette
- **Primary (cyan):** `#06b6d4` (600) - Main actions, links, highlights
- **Accent (gold):** `#fbbf24` (400) - Secondary emphasis
- **Dark backgrounds:** `dark-900` (#0f1419), `dark-800` (#1a1f2e), `dark-700` (#252b3b)
- **Text:** Light grays (`gray-100` to `gray-500`)

### Typography
- **Headings:** DM Serif Display (serif font family)
- **Body:** Manrope (sans-serif)

### Component Patterns
- **Cards:** `.card` class - dark glass-morphism with gradient borders
- **Buttons:** `.btn-primary` (cyan gradient), `.btn-secondary` (dark gray)
- **Inputs:** Dark backgrounds with cyan focus rings
- **Modals:** Full-screen backdrop blur with slide-up animation
- **Status badges:** Colored backgrounds with icons (success/warning/error)

### Custom Utilities
- `.card-hover` - Adds glow effect on hover
- `.gradient-border` - Animated gradient border pseudo-element
- Animations: `fade-in`, `slide-up`, `slide-in`
- Box shadows: `shadow-glow`, `shadow-glow-sm`

## Page Structure

- **`app/page.tsx`** - Landing/redirect to dashboard
- **`app/layout.tsx`** - Root layout with navigation (emoji logo: 🏃‍♂️💨📞)
- **`app/dashboard/page.tsx`** - Main view: Agency sidebar + client cards grid
- **`app/create/page.tsx`** - Client creation form with agency selection
- **`app/workflow/[id]/page.tsx`** - Workflow detail view with webhook URLs
- **`app/components/AgencyModal.tsx`** - Agency creation modal
- **`app/components/ClientSettingsModal.tsx`** - Agency settings editor (updates API keys)

## Important Patterns

### Supabase Queries with Joins
Use `.select()` with nested syntax for joined data:
```typescript
.select(`
  *,
  clients (
    id,
    name,
    business_name,
    agency_id
  )
`)
```

### n8n API Authentication
All n8n requests require `X-N8N-API-KEY` header. Workflow activation uses `PUT /workflows/{id}` with `{active: true}` body.

### Client ID Pattern
Client IDs in Supabase use `business_name` as the primary key (not UUID) for compatibility with existing n8n workflows. When filtering in n8n workflows via HTTP nodes, use PostgREST format: `?client_id=eq.{business_name}`

### Agency-Aware Workflow Creation
When creating workflows, the system uses the selected agency's n8n credentials and instance URL, not the global defaults. This enables true multi-tenancy.

## Common Gotchas

1. **Workflow name uniqueness:** Check for existing workflows with same name before creation
2. **Webhook ID extraction:** Must fetch workflow after creation to get `webhookId` (not in creation response)
3. **n8n API readonly fields:** Don't include `id`, `createdAt`, `updatedAt`, `active`, `tags` when POSTing workflows
4. **Client ID format:** Always strip whitespace and use exact match for `client_id=eq.{value}` in HTTP parameters
5. **Modal z-index:** Agency/settings modals use `z-50` to appear above navigation (`z-10`)
6. **Service role key:** API routes should use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS, client-side uses anon key

## Testing Workflow Creation

1. Create agency with valid n8n credentials
2. Create client assigned to that agency
3. Verify workflow appears in n8n with correct name
4. Check webhook URLs are extractable and valid
5. Test lead form submission to webhook
6. Verify Supabase logs workflow execution
