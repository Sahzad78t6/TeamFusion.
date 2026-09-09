import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    # Disable reload in production when PORT is present or set explicitly
    is_prod = os.getenv("PORT") is not None
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=not is_prod)
