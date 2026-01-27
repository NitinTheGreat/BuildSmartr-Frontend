# BuildSmartr Frontend

A Next.js application for the IIVY construction research platform.

## Architecture

```
┌──────────────────┐         ┌─────────────────────┐         ┌──────────────┐
│    Frontend      │ ──────► │  Database Backend   │ ──────► │  AI Backend  │
│  (This Project)  │         │  (BuildSmartr-BE)   │         │  (IIVY-AI)   │
│   Port: 3000     │         │    Port: 7072       │         │  Port: 7071  │
└──────────────────┘         └─────────────────────┘         └──────────────┘
                                      │
                                      ▼
                             ┌─────────────────────┐
                             │      Supabase       │
                             │  (Database/Auth)   │
                             └─────────────────────┘
```

**Key Principle:** Frontend NEVER calls AI Backend directly. All AI operations go through the Database Backend.

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Database Backend running on port 7072
- AI Backend running on port 7071

### Environment Variables

Create a `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Database Backend URL (BuildSmartr-Backend)
NEXT_PUBLIC_BACKEND_URL=http://localhost:7072
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running All Services (Local Development)

Terminal 1 - AI Backend:
```bash
cd ../IIVY-AI-Backend
func start --port 7071
```

Terminal 2 - Database Backend:
```bash
cd ../BuildSmartr-Backend
func start --port 7072
```

Terminal 3 - Frontend:
```bash
npm run dev
```

## API Routes

All frontend API routes proxy to the Database Backend:

| Frontend Route | Database Backend Endpoint |
|----------------|--------------------------|
| `/api/projects` | `/api/projects` |
| `/api/projects/[id]` | `/api/projects/{id}` |
| `/api/projects/[id]/index` | `/api/projects/{id}/index` |
| `/api/projects/[id]/index/status` | `/api/projects/{id}/index/status` |
| `/api/projects/[id]/index/cancel` | `/api/projects/{id}/index/cancel` |
| `/api/projects/[id]/search/stream` | `/api/projects/{id}/search/stream` |
| `/api/projects/[id]/files` | `/api/projects/{id}/files` |
| `/api/projects/[id]/chats` | `/api/projects/{id}/chats` |
| `/api/user/info` | `/api/user/info` |

## Features

- **Projects** - Create, manage, and search construction projects
- **Email Indexing** - Index Gmail/Outlook emails for AI-powered search
- **Streaming Search** - Real-time streaming responses from AI
- **File Management** - Upload and manage project files
- **Chats** - Persist conversation history

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Auth:** Supabase Auth
- **State:** React Context + SWR for data fetching
