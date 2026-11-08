"""Local-only entry point: python -m app.backend."""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.backend.route:app", host="127.0.0.1", port=8000,
                proxy_headers=False, workers=1)
