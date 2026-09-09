from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "growthos_v2"
    JWT_SECRET: str = "growthos_default_jwt_secret_key_change_in_production_2026"
    JWT_EXPIRY_HOURS: int = 24
    VAPID_PUBLIC_KEY: str = "BBIgGLeN-l8pOPbiWlHPBR2k6D7gFDny6jKI7LI2x3rgd7Zj6BtRj8Lp-piCncCY9pu-upmRS07erb3SDdM01I0"
    VAPID_PRIVATE_KEY: str = "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg7goEN5PtbvHJ9DTq\nDApyJ0ecU/pZ1VcRVrr94ojZSFShRANCAAQSIBi3jfpfKTj24lpRzwUdpOg+4BQ5\n8uoyiOyyNsd64He2Y+gbUY/C6fqYgp3AmPabvrqZkUtO3q290g3TNNSN\n-----END PRIVATE KEY-----"
    VAPID_CLAIMS_EMAIL: str = "mailto:admin@growthos.com"

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
