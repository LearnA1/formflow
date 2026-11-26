# FormFlow

A prototype paperwork assistant. Describe a life event (for example, "I'm moving"), get matching government or rental forms, answer one question per form field, and download the result.

**Status:** early prototype (API version 0.1.0). The core flow works end to end, but the form catalog is small and the AI integration is not built yet (see [Current limitations](#current-limitations)).

## What it does

1. **Recommend forms.** You type a plain-English message and the backend matches it against keywords in a form catalog.
2. **Start a session.** Pick a form and the backend turns its fields into a list of questions.
3. **Answer questions.** Each answer is stored in the session.
4. **Fill and download.** The backend writes the answers into the PDF template and returns the file.
5. **Upload your own PDF.** `POST /upload` extracts the fillable fields from a PDF using `pypdf`.

The catalog currently has three forms: IRS Form 8822 (change of address), a generic rental application, and a DMV change of address.

## Tech stack

- **Backend:** Python, FastAPI, pypdf, reportlab
- **Frontend:** React 19, Vite
- **Declared but not yet used:** the `anthropic` SDK is in `requirements.txt`; the AI agent and crawler service files are empty placeholders

## Project layout

```
formflow-backend/
  main.py                  FastAPI app and CORS setup
  routers/                 agent (recommend), upload, session/fill/download
  services/                catalog matching, PDF field extraction, PDF fill, sessions
  data/form_catalog.json   the form catalog
formflow-frontend/         React + Vite UI
formflow-backend-architecture.md   design notes for where the project could go
run.sh                     starts both servers
```

## Running it locally

Requirements: Python 3, Node.js and npm.

```bash
./run.sh
```

This creates a virtual environment, installs dependencies for both halves, and starts:

- API: http://127.0.0.1:8000 (interactive docs at `/docs`)
- Frontend: http://localhost:5173

To run the pieces separately:

```bash
# backend
cd formflow-backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# frontend (new terminal)
cd formflow-frontend
npm install
npm run dev
```

The frontend reads the API address from `VITE_API_BASE_URL` and defaults to `http://127.0.0.1:8000`.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/agent/recommend-forms` | Match a message to forms in the catalog |
| POST | `/upload` | Extract fillable fields from an uploaded PDF |
| POST | `/session/start` | Start a question session for a form |
| POST | `/session/answer` | Submit an answer |
| GET | `/session/{session_id}` | Get session state |
| POST | `/fill/{session_id}` | Fill the form with the collected answers |
| GET | `/download/{session_id}` | Download the result |

## Current limitations

- Form recommendation is keyword matching, not an LLM.
- The blank PDF templates are not in the repository. When a template is missing, filling falls back to a plain text report instead of a filled PDF.
- Sessions are held by the backend process, with no database.
- `formflow-backend-architecture.md` describes a larger planned design (cloud storage, database, email delivery). None of that is implemented.

## What I would build next

- Add the PDF templates, or a script that downloads them
- Use the Anthropic API for intent detection and for phrasing questions
- Persist sessions
- Add tests
