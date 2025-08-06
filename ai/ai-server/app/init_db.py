# app/init_db.py

from app.database import engine, Base
from app import models  # 🔥 꼭 import 해야 테이블 생성됨!

print("📦 Creating tables...")
Base.metadata.create_all(bind=engine)
print("✅ Done")
