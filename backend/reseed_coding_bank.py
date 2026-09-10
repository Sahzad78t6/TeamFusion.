import asyncio
from app.db import init_db, close_db

async def main():
    print("Reseeding DB with updated SEED_CODING_BANK...")
    await init_db()
    await close_db()
    print("Reseed complete.")

if __name__ == "__main__":
    asyncio.run(main())
