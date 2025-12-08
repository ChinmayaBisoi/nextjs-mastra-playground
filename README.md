This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Python PPTX Parser Service

This project uses a separate Python service (powered by `python-pptx`) to parse PPTX files. The Python service runs independently and is called from Next.js API routes.

### Setup

1. **Local Development:**
   - Navigate to `python-service/` directory
   - Create virtual environment: `python -m venv venv`
   - Activate: `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
   - Install dependencies: `pip install -r requirements.txt`
   - Run: `uvicorn main:app --reload --port 8000`

2. **Environment Variables:**
   Add to your `.env.local`:
   ```
   PYTHON_PPTX_SERVICE_URL=http://localhost:8000
   ```

3. **Deploy Python Service:**
   - **Railway:** See `python-service/README.md`
   - **Render:** Create Web Service, connect repo, set build: `pip install -r requirements.txt`, start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Fly.io:** Use `flyctl launch` in `python-service/` directory
   
   After deployment, update `PYTHON_PPTX_SERVICE_URL` in Vercel environment variables.

### API Endpoints

- `POST /api/pptx/parse-python` - Parse PPTX using Python service (python-pptx)
- `POST /api/v3/pptx-2-json` - Parse PPTX using Node.js (pptx2json)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

**Important:** Make sure to set the `PYTHON_PPTX_SERVICE_URL` environment variable in Vercel to point to your deployed Python service.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
