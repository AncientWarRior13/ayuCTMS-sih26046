from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://ayuctms_app:change_me@localhost:5432/ayuctms"
    admin_database_url: str | None = None  # owner connection, used by seed/tests only
    jwt_secret: str = "change_me_long_random"
    pii_key: str = "change_me_32_chars_min"
    access_ttl_min: int = 15
    refresh_ttl_days: int = 7
    alert_tick_seconds: int = 30
    cors_origins: str = "http://localhost:5173"
    enable_scheduler: bool = True
    login_rate_per_min: int = 20

    @property
    def clean_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://"):]
        if url.startswith("postgresql://") and not url.startswith("postgresql+"):
            return "postgresql+psycopg://" + url[len("postgresql://"):]
        return url

    @property
    def clean_admin_database_url(self) -> str | None:
        url = self.admin_database_url
        if not url:
            return None
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://"):]
        if url.startswith("postgresql://") and not url.startswith("postgresql+"):
            return "postgresql+psycopg://" + url[len("postgresql://"):]
        return url

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
