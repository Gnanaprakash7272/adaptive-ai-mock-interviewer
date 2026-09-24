import json
from resume_intellegence.text_extract import extract_text
from resume_intellegence.text_clean import clean_resume_text
from resume_intellegence.resume_analyzer import analyze_resume

from question_intellegence.question_generator import generate_question


PDF_PATH = r"C:\Users\HAI\Downloads\Sriram Resume Aug 30 (1).pdf"


if __name__ == "__main__":

    print("Reading resume...")

    with open(PDF_PATH, "rb") as file:
        pdf_bytes = file.read()

    raw_text = extract_text(pdf_bytes)
    cleaned_text = clean_resume_text(raw_text)

    print("Resume extracted and cleaned.")

    print("Analyzing resume...")

    candidate_profile = analyze_resume(
        cleaned_text
    )

    print("Candidate profile created.")

    # Represents the role selected by the user.
    role = "Python Backend Developer"

    # These values now come from the interview/adaptive engine.
    topic = "FastAPI & Kafka Integration"
    difficulty = "hard"

    print(f"\nSelected Role: {role}")
    print(f"Interview Topic: {topic}")
    print(f"Difficulty: {difficulty}")

    print("\nGenerating personalized question...\n")

    question = generate_question(
        candidate_profile,
        role,
        topic,
        difficulty
    )

    print("========== GENERATED QUESTION ==========")

    print(
        json.dumps(
            question,
            indent=2,
            ensure_ascii=False
        )
    )