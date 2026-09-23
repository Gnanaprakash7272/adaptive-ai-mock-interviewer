import json

from text_extract import extract_text
from text_clean import clean_resume_text
from resume_analyzer import analyze_resume


# ============================================================
# RESUME PDF PATH
# ============================================================

PDF_PATH = r"C:\Users\HAI\Downloads\Sriram Resume Aug 30 (1).pdf"


# ============================================================
# MAIN PROGRAM
# ============================================================

if __name__ == "__main__":

    print("Reading resume...")

    # --------------------------------------------------------
    # 1. Read PDF
    # --------------------------------------------------------

    with open(PDF_PATH, "rb") as file:
        pdf_bytes = file.read()

    # --------------------------------------------------------
    # 2. PDF → Raw Text
    # --------------------------------------------------------

    raw_text = extract_text(pdf_bytes)

    # --------------------------------------------------------
    # 3. Raw Text → Cleaned Text
    # --------------------------------------------------------

    cleaned_text = clean_resume_text(raw_text)

    print("\nResume extracted successfully.")

    # --------------------------------------------------------
    # 4. Send cleaned resume to Gemini
    # --------------------------------------------------------

    print("Sending resume to Gemini...\n")

    profile = analyze_resume(cleaned_text)

    # --------------------------------------------------------
    # 5. Display Candidate Profile
    # --------------------------------------------------------

    print("========== CANDIDATE PROFILE ==========\n")

    print(
        json.dumps(
            profile,
            indent=2,
            ensure_ascii=False
        )
    )