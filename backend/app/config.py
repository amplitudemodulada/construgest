from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    APP_NAME: str = "ConstruGest"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Sistema de Gestão para Lojas de Materiais de Construção"
    DEBUG: bool = True

    DATABASE_URL: str = "sqlite:///./construgest.db"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-construgest-2024")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://construgest.vercel.app",
    ]

    UPLOAD_DIR: str = "uploads"
    BARCODE_DIR: str = "uploads/barcodes"

    # NF-e Configuration (fictitious for MVP)
    NFE_AMBIENTE: int = 2
    NFE_CERTIFICADO: str = ""
    NFE_SENHA: str = ""

    class Config:
        env_file = ".env"

settings = Settings()

if "sqlite" not in settings.DATABASE_URL:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.BARCODE_DIR, exist_ok=True)
