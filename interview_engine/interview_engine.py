from adaptive_intellegence.adaptive_engine import decide_next_step
from answer_intellegence.answer_evaluator import evaluate_answer
from question_intellegence.question_generator import generate_question


class InterviewEngine:
    """
    Orchestrates one complete adaptive interview session.

    Responsibilities:
    - Maintain interview state
    - Generate questions
    - Evaluate answers
    - Ask Adaptive Engine for the next step
    - Continue or finish the interview

    This class does NOT contain:
    - Gemini API logic
    - Question-generation logic
    - Answer-scoring logic
    - Adaptive decision rules
    """

    def __init__(
        self,
        candidate_profile: dict,
        role: str,
        initial_topic: str,
        initial_difficulty: str,
        max_questions: int,
        question_fn=generate_question,
        eval_fn=evaluate_answer,
        decision_fn=decide_next_step,
    ):
        if not isinstance(candidate_profile, dict) or not candidate_profile:
            raise ValueError("candidate_profile must be a non-empty dictionary.")

        if not role or not role.strip():
            raise ValueError("role is required.")

        if not initial_topic or not initial_topic.strip():
            raise ValueError("initial_topic is required.")

        if initial_difficulty not in ["easy", "medium", "hard"]:
            raise ValueError(
                "initial_difficulty must be easy, medium, or hard."
            )

        if not isinstance(max_questions, int) or max_questions <= 0:
            raise ValueError("max_questions must be a positive integer.")

        self.role = role
        self.candidate_profile = candidate_profile

        self.available_topics = candidate_profile.get(
            "potential_interview_topics",
            []
        )

        if not isinstance(self.available_topics, list):
            self.available_topics = []

        self.current_topic = initial_topic
        self.current_difficulty = initial_difficulty
        self.current_question = None

        self.topics_covered = []

        # Contains only questions that have already been answered.
        self.questions = []
        self.answers = []
        self.evaluations = []
        self.adaptive_decisions = []

        # Counts generated questions.
        self.turn_count = 0

        self.max_questions = max_questions
        self.is_finished = False

        # Dependency injection.
        self.question_fn = question_fn
        self.eval_fn = eval_fn
        self.decision_fn = decision_fn

    def _ask_question(self):
        """
        Generate the next interview question.

        This is the ONLY place where a new question is generated.
        """

        if self.is_finished:
            raise RuntimeError(
                "Cannot generate a new question after the interview has finished."
            )

        if self.turn_count >= self.max_questions:
            self.is_finished = True
            return None

        question_data = self.question_fn(
            self.candidate_profile,
            self.role,
            self.current_topic,
            self.current_difficulty,
        )

        if not isinstance(question_data, dict):
            raise RuntimeError(
                "Question generator must return a dictionary."
            )

        question_text = question_data.get("question")

        if not question_text or not str(question_text).strip():
            raise RuntimeError(
                "Question generator returned an invalid question."
            )

        requested_topic = self.current_topic

        self.current_question = question_data

        if requested_topic not in self.topics_covered:
            self.topics_covered.append(requested_topic)

        self.turn_count += 1

        return question_data

    def submit_answer(self, candidate_answer: str) -> dict:
        """
        Submit the candidate's answer to the current question.

        Flow:
            answer
              ↓
            evaluation
              ↓
            adaptive decision
              ↓
            store state
              ↓
            finish OR generate next question
        """

        if self.is_finished:
            raise RuntimeError(
                "The interview has already finished."
            )

        if not candidate_answer or not candidate_answer.strip():
            raise ValueError(
                "Candidate answer cannot be empty."
            )

        if self.current_question is None:
            raise RuntimeError(
                "There is no current question to answer."
            )

        question = self.current_question

        question_text = question.get("question", "")

        expected_concepts = question.get(
            "expected_concepts",
            []
        )

        if not isinstance(expected_concepts, list):
            expected_concepts = []

        # ---------------------------------
        # 1. Evaluate candidate answer
        # ---------------------------------

        evaluation = self.eval_fn(
            question_text,
            expected_concepts,
            candidate_answer,
        )

        if not isinstance(evaluation, dict):
            raise RuntimeError(
                "Answer evaluator must return a dictionary."
            )

        # ---------------------------------
        # 2. Decide next step
        # ---------------------------------

        adaptive_decision = self.decision_fn(
            evaluation=evaluation,
            current_topic=self.current_topic,
            current_difficulty=self.current_difficulty,
            topics_covered=self.topics_covered,
            available_topics=self.available_topics,
        )

        if not isinstance(adaptive_decision, dict):
            raise RuntimeError(
                "Adaptive decision function must return a dictionary."
            )

        next_action = adaptive_decision.get("next_action")
        next_topic = adaptive_decision.get("next_topic")
        next_difficulty = adaptive_decision.get("difficulty")

        if not next_action:
            raise RuntimeError(
                "Adaptive decision is missing next_action."
            )

        if not next_topic:
            raise RuntimeError(
                "Adaptive decision is missing next_topic."
            )

        if next_difficulty not in ["easy", "medium", "hard"]:
            raise RuntimeError(
                "Adaptive decision returned an invalid difficulty."
            )

        # ---------------------------------
        # 3. Store completed turn
        # ---------------------------------

        self.questions.append(question)
        self.answers.append(candidate_answer)
        self.evaluations.append(evaluation)
        self.adaptive_decisions.append(adaptive_decision)

        # ---------------------------------
        # 4. Check termination
        # ---------------------------------

        if self.turn_count >= self.max_questions:
            self.is_finished = True

            return {
                "evaluation": evaluation,
                "adaptive_decision": adaptive_decision,
                "next_question": None,
                "is_finished": True,
                "turn_count": self.turn_count,
            }

        # ---------------------------------
        # 5. Apply adaptive decision
        # ---------------------------------

        self.current_topic = next_topic
        self.current_difficulty = next_difficulty

        # ---------------------------------
        # 6. Generate next question
        # ---------------------------------

        next_question = self._ask_question()

        return {
            "evaluation": evaluation,
            "adaptive_decision": adaptive_decision,
            "next_question": next_question,
            "is_finished": self.is_finished,
            "turn_count": self.turn_count,
        }


def start_interview(
    candidate_profile: dict,
    role: str,
    initial_topic: str,
    initial_difficulty: str,
    max_questions: int,
    question_fn=generate_question,
    eval_fn=evaluate_answer,
    decision_fn=decide_next_step,
) -> InterviewEngine:
    """
    Create an InterviewEngine and immediately generate
    the first interview question.
    """

    engine = InterviewEngine(
        candidate_profile=candidate_profile,
        role=role,
        initial_topic=initial_topic,
        initial_difficulty=initial_difficulty,
        max_questions=max_questions,
        question_fn=question_fn,
        eval_fn=eval_fn,
        decision_fn=decision_fn,
    )

    engine._ask_question()

    return engine