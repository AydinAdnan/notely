from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str = "changeme-replace-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days
    NVIDIA_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
