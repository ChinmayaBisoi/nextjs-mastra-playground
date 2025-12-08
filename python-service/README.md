# PPTX Parser Python Service

FastAPI service for parsing PPTX files using python-pptx.

## Local Development

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
uvicorn main:app --reload --port 8000
```

The service will be available at `http://localhost:8000`

## Deployment

### Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Deploy: `railway up`

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Fly.io

1. Install flyctl
2. Run: `flyctl launch`
3. Follow prompts and deploy

## Environment Variables

- `PORT`: Server port (automatically set by hosting platform)

## API Endpoints

- `GET /` - Service status
- `GET /health` - Health check
- `POST /parse-pptx` - Parse PPTX file (expects multipart/form-data with `file` field)

