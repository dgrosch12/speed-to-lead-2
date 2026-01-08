# Speed to Lead Frontend

A Next.js application for managing Speed to Lead automation workflows. Create, monitor, and manage automated call connection workflows for your clients.

## Features

- 🚀 **Quick Setup**: Create Speed to Lead workflows in seconds
- 📊 **Dashboard**: View all workflows and their status at a glance
- 🔗 **n8n Integration**: Direct links to edit workflows in n8n
- 📋 **Webhook Management**: Copy webhook URLs for easy integration
- 📈 **Performance Tracking**: Monitor lead conversion metrics

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Icons**: Heroicons
- **Automation**: n8n integration

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account with database setup
- n8n instance with workflow factory deployed

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd speed-to-lead-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your actual values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   N8N_WORKFLOW_FACTORY_URL=your-n8n-form-url
   ```

4. **Setup Supabase Database**
   
   Run these SQL commands in your Supabase SQL editor:
   
   ```sql
   -- Clients table
   CREATE TABLE clients (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     business_name VARCHAR(255) NOT NULL,
     owner_name VARCHAR(255) NOT NULL,
     business_phone VARCHAR(20) NOT NULL,
     twilio_number VARCHAR(20) NOT NULL,
     client_id VARCHAR(100) UNIQUE NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Workflows table  
   CREATE TABLE workflows (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     client_id UUID REFERENCES clients(id),
     n8n_workflow_id VARCHAR(100) NOT NULL,
     workflow_name VARCHAR(255) NOT NULL,
     status VARCHAR(50) DEFAULT 'active',
     lead_form_webhook VARCHAR(500),
     ivr_webhook VARCHAR(500),
     n8n_url VARCHAR(500),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     last_activity TIMESTAMP WITH TIME ZONE
   );

   -- Workflow stats
   CREATE TABLE workflow_stats (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     workflow_id UUID REFERENCES workflows(id),
     leads_count INTEGER DEFAULT 0,
     calls_count INTEGER DEFAULT 0,
     last_lead TIMESTAMP WITH TIME ZONE,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   
   Visit [http://localhost:3000](http://localhost:3000)

## Usage

### Creating a Workflow

1. Navigate to **Create New Workflow**
2. Fill in client information:
   - Business Name
   - Owner Name  
   - Business Phone
   - Twilio Number
   - Client ID (unique identifier)
3. Click **Create Workflow**
4. The system will generate the workflow in n8n and return webhook URLs

### Managing Workflows

- **Dashboard**: View all workflows with status indicators
- **Workflow Detail**: See complete workflow information and copy webhook URLs
- **Edit in n8n**: Direct link to modify the workflow in your n8n instance
- **Status Management**: Pause, activate, or monitor workflow status

### Webhook Integration

Once a workflow is created, you'll receive webhook URLs:

- **Lead Form Webhook**: Use this URL to receive lead form submissions
- **IVR Endpoint**: Internal endpoint for call handling

Copy these URLs and integrate them with your lead generation forms.

## API Endpoints

- `GET /api/workflows` - List all workflows
- `POST /api/workflows` - Create new workflow  
- `GET /api/workflows/[id]` - Get specific workflow
- `PUT /api/workflows/[id]` - Update workflow status
- `DELETE /api/workflows/[id]` - Delete workflow

## Project Structure

```
speed-to-lead-frontend/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── create/            # Workflow creation page
│   ├── dashboard/         # Workflow dashboard
│   ├── workflow/[id]/     # Workflow detail pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── lib/                   # Utilities and configurations
│   └── supabase.ts       # Supabase client and types
├── components/            # Reusable React components
└── public/               # Static assets
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform

## Environment Variables

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# n8n Integration  
N8N_WORKFLOW_FACTORY_URL=your-n8n-workflow-factory-form-url
```

## Monetization Features

The application is designed to be sellable with built-in monetization features:

- Multi-client workflow management
- Professional dashboard interface
- White-label ready design
- Webhook URL management
- Performance tracking
- Direct n8n integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For support and questions:
- Check the documentation above
- Review the code comments
- Open an issue on GitHub

## License

This project is intended for commercial use. See LICENSE file for details.