import json

from answer_intellegence.answer_evaluator import evaluate_answer


question = (
    "In your SENTRIX real-time fraud detection project, "
    "you integrated FastAPI with Apache Kafka and machine "
    "learning models like XGBoost and Isolation Forest. "
    "Can you explain how you design the asynchronous message "
    "consumption loop in FastAPI using Kafka to ensure "
    "low-latency risk scoring and prevent request blocking "
    "under high throughput?"
)


expected_concepts = [
    "Asynchronous programming in FastAPI",
    "Kafka consumer integration and event streaming",
    "Non-blocking I/O operations",
    "Handling high-throughput data streams for real-time model inference"
]


candidate_answer = """
I would use an asynchronous Kafka consumer so that message
consumption does not block the FastAPI request handling.
The consumer can receive events from Kafka and pass the data
to the fraud detection model for scoring. Async processing
would help the application handle multiple requests and
messages without waiting for each operation to finish.
"""


if __name__ == "__main__":

    print("Evaluating candidate answer...\n")

    evaluation = evaluate_answer(
        question=question,
        expected_concepts=expected_concepts,
        candidate_answer=candidate_answer
    )

    print("========== ANSWER EVALUATION ==========")

    print(
        json.dumps(
            evaluation,
            indent=2,
            ensure_ascii=False
        )
    )