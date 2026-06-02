from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "LocalPaste"
    debug: bool = False
    secret_key: str = "changeme"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost/localpaste"
    redis_url: str = "redis://localhost:6379"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "pastes"
    clickhouse_url: str = "http://localhost:8123"
    jwt_algorithm: str = "HS256"
    bcrypt_rounds: int = 12
    kgs_pool_size: int = 100
    rate_limit_anon: int = 60
    rate_limit_auth: int = 300
    cors_origins: list[str] = ["http://localhost:4200"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
