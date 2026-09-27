import os

from dotenv import load_dotenv
from supabase import create_client, Client

from pathlib import Path
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv(override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL is missing in .env")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY is missing in .env")

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)