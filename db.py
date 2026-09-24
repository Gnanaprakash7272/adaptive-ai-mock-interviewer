from api.db import supabase


TABLES = [
    "users",
    "resumes",
    "education",
    "certifications",
    "skills",
    "projects",
    "project_technologies",
    "experiences",
    "interviews",
    "questions",
    "answers",
    "evaluations",
    "adaptive_decisions",
    "interview_reports",
]


def main():
    print("\n=== SUPABASE DATABASE VERIFICATION ===\n")

    for table in TABLES:
        try:
            response = (
                supabase
                .table(table)
                .select("*")
                .limit(1)
                .execute()
            )

            print(f"✅ {table:<25} accessible")

        except Exception as error:
            print(f"❌ {table:<25} ERROR")
            print(f"   {error}")

    print("\n=== VERIFICATION COMPLETE ===")


if __name__ == "__main__":
    main()