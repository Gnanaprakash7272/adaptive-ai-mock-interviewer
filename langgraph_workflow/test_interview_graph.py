"""
test_interview_graph.py

Tests for the LangGraph interview workflow.

All Gemini API calls are mocked — NO network access required.
No Supabase required.
No environment variables required (GEMINI_API_KEY set to mock before import).

Test inventory (46 tests across 12 classes):

    CLASS 1  — TestGraphConstruction
        01  Graph can be constructed (nodes, edges present).
        02  Node list matches expected specification.

    CLASS 2  — TestCreateInterviewPlan
        03   Initial state → create_interview_plan sets role_topics.
        03a  available_topics includes profile topics not in role_topics.
        03b  current_topic is set to first role topic.
        03c  question_count and interview_history are reset.
        03d  is_finished is reset to False.
        03e  Pre-set current_topic is kept if valid.
        03f  Invalid pre-set current_topic is reset.
        19   Raises ValueError on missing role.
        20   Raises ValueError on missing candidate_profile.
        20b  Raises ValueError on missing user_id.
        20c  Raises ValueError on invalid max_questions.

    CLASS 3  — TestInterrupt
        04   Graph pauses (interrupts) at wait_for_answer.
        05   Pending node is wait_for_answer.
        05b  question_count is 1 after first pause.
        05c  current_question is set after first pause.
        05d  topics_covered has first topic after Q1.

    CLASS 4  — TestResumeAndEvaluate
        06   Resume continues graph past wait_for_answer.
        07   Evaluation is persisted in interview_history.

    CLASS 5  — TestAdaptiveDecision
        08   Adaptive action is 'new_topic' or 'harder' for score=8.
        09   interview_history has 1 entry after 1 completed turn.
        09b  Each history record has required keys.
        09c  history answer matches what was submitted.
        10   question_count is 2 after Q2 is generated.

    CLASS 6  — TestTerminationAndFinalReport
        11   max_questions=1 causes graph to finish after 1 answer.
        11b  is_finished is True after completion.
        12   final_report has all expected keys.
        12b  final_report overall_score matches evaluation mean.
        12c  final_report turn_details has exactly 1 entry for max_questions=1.

    CLASS 7  — TestSessionIsolation
        13   Two separate sessions do not share state.

    CLASS 8  — TestShouldContinueRouter
        14   Returns 'finish' when is_finished=True.
        15   Returns 'finish' when is_finished=True (set by adaptive engine).
        15b  Returns 'continue' when is_finished=False, even at limit.
        16   Returns 'continue' when below limit.
        16b  Returns 'continue' at question_count=0.

    CLASS 9  — TestGraphDependencies
        17   Graph does not import supabase.
        18   Graph does not use input().

    CLASS 10 — TestEvaluateAnswerNode
             Raises RuntimeError without question.
             Raises RuntimeError without answer.
             Stores evaluation dict in state.

    CLASS 11 — TestAdaptiveEngineNode
             Raises RuntimeError without evaluation.
             Appends 1 entry to interview_history per call.
             Sets is_finished=True when question_count >= max_questions.
             Score for early-exit includes current turn (bug-regression guard).

    CLASS 12 — TestLazyGraphAccessor
             get_interview_graph() returns graph; second call does not rebuild.
"""

import os
import sys
import unittest
import inspect
from unittest.mock import patch, MagicMock

# ---------------------------------------------------------------------------
# Set fake env-var BEFORE any AI module is imported.
# (question_generator / answer_evaluator read GEMINI_API_KEY at import time)
# ---------------------------------------------------------------------------
os.environ.setdefault("GEMINI_API_KEY", "MOCK_KEY_FOR_TESTS")

# ---------------------------------------------------------------------------
# Path setup — ensure project root is importable.
# ---------------------------------------------------------------------------
_PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


# ===========================================================================
# Shared test fixtures
# ===========================================================================

FAKE_PROFILE = {
    "candidate":                    {"name": "Test User", "email": "test@example.com"},
    "skills":                       {"programming_languages": ["Python"]},
    "projects":                     [],
    "experience":                   [],
    "education":                    [],
    "certifications":               [],
    "achievements":                 [],
    "publications":                 [],
    "competitive_programming":      {},
    "languages":                    [],
    "interests":                    [],
    "expertise_areas":              ["Python Backend Development"],
    "potential_interview_topics":   ["FastAPI", "Python", "REST APIs"],
}

FAKE_QUESTION = {
    "question":         "Explain dependency injection in FastAPI.",
    "topic":            "FastAPI",
    "difficulty":       "medium",
    "question_type":    "technical",
    "expected_concepts": ["Depends", "IoC", "testability"],
}

FAKE_EVALUATION = {
    "score":            8,
    "correctness":      8,
    "completeness":     7,
    "technical_depth":  8,
    "missing_concepts": [],
    "confidence":       0.9,
    "needs_followup":   False,
    "feedback":         "Good explanation of Depends.",
}

FAKE_EVALUATION_LOW = {
    "score":            3,
    "correctness":      3,
    "completeness":     3,
    "technical_depth":  2,
    "missing_concepts": ["IoC", "testability"],
    "confidence":       0.4,
    "needs_followup":   True,
    "feedback":         "Needs improvement.",
}

# Base initial state — contains ALL keys InterviewState expects.
# interview_id is omitted intentionally (it is an optional field, absent at start).
INITIAL_STATE = {
    "user_id":            1,
    "candidate_profile":  FAKE_PROFILE,
    "role":               "Python Backend Developer",
    "role_topics":        [],
    "candidate_topics":   [],
    "available_topics":   [],
    "current_topic":      "",
    "current_difficulty": "medium",
    "topics_covered":     [],
    "current_question":   None,
    "current_answer":     None,
    "current_evaluation": None,
    "adaptive_decision":  None,
    "question_count":     0,
    "max_questions":      3,
    "is_finished":        False,
    "interview_history":  [],
    "final_report":       None,   # required: present as None at start
}


def make_initial_state(**overrides) -> dict:
    """Return a fresh copy of INITIAL_STATE with optional field overrides."""
    state = dict(INITIAL_STATE)
    state.update(overrides)
    return state


# ===========================================================================
# CLASS 1 — Graph Construction
# ===========================================================================

class TestGraphConstruction(unittest.TestCase):
    """Tests 01-02: Graph can be constructed, nodes are correct."""

    def _build(self):
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        return build_interview_graph(checkpointer=MemorySaver())

    def test_01_graph_can_be_constructed(self):
        """build_interview_graph() must not raise any exception."""
        graph = self._build()
        self.assertIsNotNone(graph)

    def test_02_expected_nodes_present(self):
        """Graph must contain all expected nodes plus __start__ and __end__."""
        graph = self._build()
        node_names = set(graph.get_graph().nodes.keys())
        required = {
            "__start__",
            "create_interview_plan",
            "generate_question",
            "wait_for_answer",
            "evaluate_answer",
            "adaptive_decision",
            "generate_final_report",
            "__end__",
        }
        missing = required - node_names
        self.assertEqual(missing, set(), f"Missing nodes in graph: {missing}")


# ===========================================================================
# CLASS 2 — create_interview_plan node
# ===========================================================================

class TestCreateInterviewPlan(unittest.TestCase):
    """Tests 03, 03a-f, 19, 20, 20b, 20c: plan node behaviour."""

    def _run_plan_node(self, state: dict) -> dict:
        from langgraph_workflow.interview_graph import create_interview_plan
        return create_interview_plan(state)

    def test_03_plan_sets_role_topics(self):
        """create_interview_plan must derive role_topics from the role string."""
        result = self._run_plan_node(make_initial_state())
        # "Python Backend Developer" contains "backend" → "API Design" in role_topics
        self.assertIn("API Design", result["role_topics"])

    def test_03a_plan_sets_available_topics_includes_profile(self):
        """available_topics must include profile topics not in role_topics."""
        result = self._run_plan_node(make_initial_state())
        # "FastAPI" and "REST APIs" come from potential_interview_topics in FAKE_PROFILE
        for topic in ("FastAPI", "REST APIs"):
            self.assertIn(topic, result["available_topics"],
                          f"'{topic}' missing from available_topics: {result['available_topics']}")

    def test_03b_plan_sets_first_topic_from_role(self):
        """create_interview_plan must set current_topic to the first role topic."""
        result = self._run_plan_node(make_initial_state())
        # First role topic for "backend" is "API Design"
        self.assertEqual(result["current_topic"], "API Design")

    def test_03c_plan_resets_counters(self):
        """create_interview_plan must reset question_count and interview_history."""
        result = self._run_plan_node(make_initial_state())
        self.assertEqual(result["question_count"], 0)
        self.assertEqual(result["interview_history"], [])

    def test_03d_plan_sets_is_finished_false(self):
        """create_interview_plan must reset is_finished to False."""
        result = self._run_plan_node(make_initial_state())
        self.assertFalse(result["is_finished"])

    def test_03e_plan_respects_pre_set_topic(self):
        """A valid pre-set current_topic must be kept unchanged."""
        # "Python" is in FAKE_PROFILE potential_interview_topics → will be in available_topics
        state = make_initial_state(current_topic="Python")
        result = self._run_plan_node(state)
        self.assertEqual(result["current_topic"], "Python")

    def test_03f_plan_resets_invalid_pre_set_topic(self):
        """An invalid current_topic (not in available_topics) must be reset."""
        state = make_initial_state(current_topic="NonExistentTopic9999")
        result = self._run_plan_node(state)
        self.assertNotEqual(result["current_topic"], "NonExistentTopic9999",
                            "Invalid pre-set topic must be replaced.")
        # The replacement must be in the valid available_topics pool.
        self.assertIn(result["current_topic"], result["available_topics"])

    def test_03g_plan_returns_final_report_none(self):
        """create_interview_plan must include final_report: None in return dict."""
        result = self._run_plan_node(make_initial_state())
        self.assertIn("final_report", result)
        self.assertIsNone(result["final_report"])

    def test_19_plan_raises_on_missing_role(self):
        """create_interview_plan must raise ValueError when role is empty string."""
        with self.assertRaises(ValueError):
            self._run_plan_node(make_initial_state(role=""))

    def test_20_plan_raises_on_missing_profile(self):
        """create_interview_plan must raise ValueError when candidate_profile is empty."""
        with self.assertRaises(ValueError):
            self._run_plan_node(make_initial_state(candidate_profile={}))

    def test_20b_plan_raises_on_missing_user_id(self):
        """create_interview_plan must raise ValueError when user_id is None."""
        with self.assertRaises(ValueError):
            self._run_plan_node(make_initial_state(user_id=None))

    def test_20c_plan_raises_on_invalid_max_questions(self):
        """create_interview_plan must raise ValueError when max_questions <= 0."""
        with self.assertRaises(ValueError):
            self._run_plan_node(make_initial_state(max_questions=0))

    def test_20d_plan_raises_on_non_dict_profile(self):
        """create_interview_plan must raise ValueError when candidate_profile is not a dict."""
        with self.assertRaises(ValueError):
            self._run_plan_node(make_initial_state(candidate_profile="not a dict"))

    def test_20e_plan_raises_on_none_profile(self):
        """create_interview_plan must raise ValueError when candidate_profile is None."""
        with self.assertRaises(ValueError):
            self._run_plan_node(make_initial_state(candidate_profile=None))


# ===========================================================================
# CLASS 3 — Interrupt / Pause
# ===========================================================================

@patch(
    "langgraph_workflow.interview_graph._generate_question",
    return_value=FAKE_QUESTION,
)
class TestInterrupt(unittest.TestCase):
    """Tests 04-05d: Graph pauses at wait_for_answer, state is correct."""

    def _build_and_invoke(self, mock_q):
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        graph = build_interview_graph(checkpointer=MemorySaver())
        config = {"configurable": {"thread_id": "interrupt-test"}}
        graph.invoke(make_initial_state(), config)
        return graph, config

    def test_04_graph_pauses_at_wait_for_answer(self, mock_q):
        """Graph must pause (next must be non-empty) after first invoke."""
        graph, config = self._build_and_invoke(mock_q)
        state_snapshot = graph.get_state(config)
        self.assertGreater(
            len(state_snapshot.next), 0,
            "Graph must be paused (next should not be empty).",
        )

    def test_05_interrupted_next_node_is_wait_for_answer(self, mock_q):
        """The pending node must be 'wait_for_answer' when interrupted."""
        graph, config = self._build_and_invoke(mock_q)
        state_snapshot = graph.get_state(config)
        self.assertIn(
            "wait_for_answer",
            state_snapshot.next,
            "Next node after interrupt must be wait_for_answer.",
        )

    def test_05b_question_count_is_one_after_pause(self, mock_q):
        """question_count must be 1 after the first question is generated."""
        graph, config = self._build_and_invoke(mock_q)
        self.assertEqual(graph.get_state(config).values["question_count"], 1)

    def test_05c_current_question_is_set(self, mock_q):
        """current_question must be set to the fake question after pause."""
        graph, config = self._build_and_invoke(mock_q)
        cq = graph.get_state(config).values.get("current_question")
        self.assertIsNotNone(cq)
        self.assertEqual(cq["question"], FAKE_QUESTION["question"])

    def test_05d_topics_covered_has_first_topic(self, mock_q):
        """topics_covered must include the current_topic after Q1 is generated."""
        graph, config = self._build_and_invoke(mock_q)
        topics = graph.get_state(config).values.get("topics_covered", [])
        self.assertTrue(len(topics) > 0, "topics_covered must not be empty after Q1.")


# ===========================================================================
# CLASS 4 — Resume with answer → evaluation
# ===========================================================================

@patch(
    "langgraph_workflow.interview_graph._evaluate_answer",
    return_value=FAKE_EVALUATION,
)
@patch(
    "langgraph_workflow.interview_graph._generate_question",
    return_value=FAKE_QUESTION,
)
class TestResumeAndEvaluate(unittest.TestCase):
    """Tests 06-07: Resume continues to evaluation, stores current_evaluation."""

    def _build_pause_and_resume(self, mock_q, mock_e):
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        from langgraph.types import Command
        graph = build_interview_graph(checkpointer=MemorySaver())
        config = {"configurable": {"thread_id": "resume-test"}}
        graph.invoke(make_initial_state(max_questions=3), config)
        graph.invoke(Command(resume="I use Depends() to inject services."), config)
        return graph, config

    def test_06_resume_continues_graph(self, mock_q, mock_e):
        """After resume, interview_history must have at least 1 entry."""
        graph, config = self._build_pause_and_resume(mock_q, mock_e)
        values = graph.get_state(config).values
        history = values.get("interview_history", [])
        self.assertGreaterEqual(len(history), 1,
                                "interview_history must have at least 1 entry after resume.")

    def test_07_evaluation_stored_in_history(self, mock_q, mock_e):
        """The evaluation score must be persisted in interview_history[0]."""
        graph, config = self._build_pause_and_resume(mock_q, mock_e)
        history = graph.get_state(config).values.get("interview_history", [])
        self.assertGreater(len(history), 0)
        self.assertEqual(history[0]["evaluation"]["score"], FAKE_EVALUATION["score"])


# ===========================================================================
# CLASS 5 — Adaptive Decision
# ===========================================================================

@patch(
    "langgraph_workflow.interview_graph._evaluate_answer",
    return_value=FAKE_EVALUATION,
)
@patch(
    "langgraph_workflow.interview_graph._generate_question",
    return_value=FAKE_QUESTION,
)
class TestAdaptiveDecision(unittest.TestCase):
    """Tests 08-10: Adaptive state updates, history alignment, count increment."""

    def _run_one_turn(self, mock_q, mock_e, *, max_questions=3):
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        from langgraph.types import Command
        graph = build_interview_graph(checkpointer=MemorySaver())
        config = {"configurable": {"thread_id": "adaptive-test"}}
        graph.invoke(make_initial_state(max_questions=max_questions), config)
        graph.invoke(Command(resume="My answer."), config)
        return graph, config

    def test_08_adaptive_updates_topic_or_difficulty(self, mock_q, mock_e):
        """With score=8 (high), adaptive action must be 'new_topic' or 'harder'."""
        graph, config = self._run_one_turn(mock_q, mock_e, max_questions=3)
        history = graph.get_state(config).values.get("interview_history", [])
        self.assertGreater(len(history), 0)
        action = history[0].get("adaptive_decision", {}).get("next_action")
        self.assertIn(action, ("new_topic", "harder"),
                      f"Unexpected adaptive action for score=8: {action!r}")

    def test_09_interview_history_grows_per_turn(self, mock_q, mock_e):
        """interview_history must have exactly 1 entry after 1 completed turn."""
        graph, config = self._run_one_turn(mock_q, mock_e, max_questions=3)
        history = graph.get_state(config).values.get("interview_history", [])
        self.assertEqual(len(history), 1,
                         f"Expected 1 history entry, got {len(history)}.")

    def test_09b_history_record_has_correct_keys(self, mock_q, mock_e):
        """Each history entry must contain: turn, question, answer, evaluation, adaptive_decision."""
        graph, config = self._run_one_turn(mock_q, mock_e, max_questions=3)
        history = graph.get_state(config).values.get("interview_history", [])
        self.assertGreater(len(history), 0)
        turn = history[0]
        for key in ("turn", "question", "answer", "evaluation", "adaptive_decision"):
            self.assertIn(key, turn, f"History record is missing key: '{key}'.")

    def test_09c_history_answer_matches_submitted(self, mock_q, mock_e):
        """The answer in interview_history must match what was submitted."""
        graph, config = self._run_one_turn(mock_q, mock_e, max_questions=3)
        history = graph.get_state(config).values.get("interview_history", [])
        self.assertGreater(len(history), 0)
        self.assertEqual(history[0]["answer"], "My answer.")

    def test_10_question_count_increments(self, mock_q, mock_e):
        """question_count must be 2 after Q2 is generated (graph paused at Q2)."""
        graph, config = self._run_one_turn(mock_q, mock_e, max_questions=3)
        self.assertEqual(graph.get_state(config).values["question_count"], 2)


# ===========================================================================
# CLASS 6 — Termination / Final Report
# ===========================================================================

# Decorator order: bottom-up → (self, mock_q, mock_e, mock_n)
@patch(
    "langgraph_workflow.interview_graph._generate_narrative",
    return_value={
        "strengths":       ["test strength"],
        "weaknesses":      ["test weakness"],
        "recommendations": ["test rec"],
        "summary":         "test summary",
    },
)
@patch(
    "langgraph_workflow.interview_graph._evaluate_answer",
    return_value=FAKE_EVALUATION,
)
@patch(
    "langgraph_workflow.interview_graph._generate_question",
    return_value=FAKE_QUESTION,
)
class TestTerminationAndFinalReport(unittest.TestCase):
    """Tests 11-12: max_questions causes routing to final report."""

    def _run_full_interview(self, mock_q, mock_e, mock_n, max_questions=1):
        """
        Build graph, invoke with initial state, then submit an answer for each
        expected question.  The inner loop correctly handles max_questions > 1.

        Args:
            mock_q, mock_e, mock_n: injected mocks (from class decorators).
            max_questions: number of questions to ask before finishing.
        """
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        from langgraph.types import Command
        graph = build_interview_graph(checkpointer=MemorySaver())
        config = {"configurable": {"thread_id": "termination-test"}}
        graph.invoke(make_initial_state(max_questions=max_questions), config)
        # Submit one answer per question until the graph finishes.
        for _ in range(max_questions):
            state = graph.get_state(config)
            if not state.next:   # graph already finished — stop early
                break
            graph.invoke(Command(resume="My answer."), config)
        return graph, config

    def test_11_max_questions_routes_to_final_report(self, mock_q, mock_e, mock_n):
        """With max_questions=1, graph must be fully finished after 1 answer."""
        graph, config = self._run_full_interview(mock_q, mock_e, mock_n, max_questions=1)
        state = graph.get_state(config)
        self.assertEqual(state.next, (),
                         f"Graph must be finished after max_questions=1. Got next={state.next}.")

    def test_11b_is_finished_is_true_after_completion(self, mock_q, mock_e, mock_n):
        """is_finished must be True after the interview completes."""
        graph, config = self._run_full_interview(mock_q, mock_e, mock_n, max_questions=1)
        self.assertTrue(graph.get_state(config).values.get("is_finished"))

    def test_12_final_report_has_expected_keys(self, mock_q, mock_e, mock_n):
        """final_report must contain all expected summary keys."""
        graph, config = self._run_full_interview(mock_q, mock_e, mock_n, max_questions=1)
        report = graph.get_state(config).values.get("final_report")
        self.assertIsNotNone(report, "final_report must exist in state after completion.")
        for key in (
            "user_id", "role", "total_questions", "overall_score",
            "topics_covered", "adaptive_actions", "missing_concepts",
            "feedback_notes", "turn_details",
            "strengths", "weaknesses", "recommendations", "summary",
        ):
            self.assertIn(key, report, f"final_report is missing key: '{key}'.")

    def test_12b_final_report_overall_score_matches_evaluation(self, mock_q, mock_e, mock_n):
        """final_report overall_score must equal float(evaluation score) for 1 turn."""
        graph, config = self._run_full_interview(mock_q, mock_e, mock_n, max_questions=1)
        report = graph.get_state(config).values.get("final_report", {})
        self.assertEqual(report.get("overall_score"), float(FAKE_EVALUATION["score"]))

    def test_12c_final_report_has_one_turn_detail(self, mock_q, mock_e, mock_n):
        """final_report turn_details must have exactly 1 entry for max_questions=1."""
        graph, config = self._run_full_interview(mock_q, mock_e, mock_n, max_questions=1)
        report = graph.get_state(config).values.get("final_report", {})
        self.assertEqual(len(report.get("turn_details", [])), 1)

    def test_12d_final_report_topics_covered_from_state(self, mock_q, mock_e, mock_n):
        """
        final_report topics_covered must come from the state's topics_covered
        (the canonical tracked list), not re-derived from history question dicts.
        """
        graph, config = self._run_full_interview(mock_q, mock_e, mock_n, max_questions=1)
        report       = graph.get_state(config).values.get("final_report", {})
        state_topics = graph.get_state(config).values.get("topics_covered", [])
        self.assertEqual(report.get("topics_covered"), state_topics)


# ===========================================================================
# CLASS 7 — Session Isolation
# ===========================================================================

@patch(
    "langgraph_workflow.interview_graph._generate_question",
    return_value=FAKE_QUESTION,
)
class TestSessionIsolation(unittest.TestCase):
    """Test 13: Two sessions must not share state."""

    def test_13_two_sessions_do_not_share_state(self, mock_q):
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        memory = MemorySaver()
        graph  = build_interview_graph(checkpointer=memory)

        config_a = {"configurable": {"thread_id": "session-a"}}
        config_b = {"configurable": {"thread_id": "session-b"}}

        graph.invoke(make_initial_state(max_questions=5, user_id=1), config_a)
        graph.invoke(make_initial_state(max_questions=2, user_id=2), config_b)

        state_a = graph.get_state(config_a).values
        state_b = graph.get_state(config_b).values

        self.assertEqual(state_a["question_count"], 1)
        self.assertEqual(state_b["question_count"], 1)
        self.assertEqual(state_a["max_questions"], 5)
        self.assertEqual(state_b["max_questions"], 2)
        self.assertEqual(state_a["user_id"], 1)
        self.assertEqual(state_b["user_id"], 2)


# ===========================================================================
# CLASS 8 — should_continue router
# ===========================================================================

class TestShouldContinueRouter(unittest.TestCase):
    """Tests 14-16b: Conditional router returns correct route strings."""

    def _router(self, state: dict) -> str:
        from langgraph_workflow.interview_graph import should_continue
        return should_continue(state)

    def test_14_finish_when_is_finished_true(self):
        """Returns 'finish' when is_finished=True."""
        self.assertEqual(
            self._router({"is_finished": True, "question_count": 1, "max_questions": 3}),
            "finish",
        )

    def test_15_finish_when_is_finished_set_by_adaptive(self):
        """Returns 'finish' when is_finished=True regardless of count/max."""
        self.assertEqual(
            self._router({"is_finished": True, "question_count": 3, "max_questions": 3}),
            "finish",
        )

    def test_15b_continue_when_is_finished_false_even_at_limit(self):
        """
        Returns 'continue' when is_finished=False, even if count==max.

        Note: in the real graph, run_adaptive_engine sets is_finished=True
        before the router runs.  This test validates that the router is pure
        (reads only is_finished) and defers all business logic to the node.
        """
        self.assertEqual(
            self._router({"is_finished": False, "question_count": 3, "max_questions": 3}),
            "continue",
        )

    def test_16_continue_when_below_limit(self):
        """Returns 'continue' when is_finished=False and count < max."""
        self.assertEqual(
            self._router({"is_finished": False, "question_count": 2, "max_questions": 5}),
            "continue",
        )

    def test_16b_continue_at_zero(self):
        """Returns 'continue' at question_count=0 (before any question)."""
        self.assertEqual(
            self._router({"is_finished": False, "question_count": 0, "max_questions": 5}),
            "continue",
        )

    def test_16c_finish_missing_is_finished_key(self):
        """
        Returns 'continue' when is_finished key is absent (default False).
        Ensures the router does not crash on minimal state dicts.
        """
        self.assertEqual(
            self._router({"question_count": 5, "max_questions": 5}),
            "continue",
        )


# ===========================================================================
# CLASS 9 — Dependency checks
# ===========================================================================

class TestGraphDependencies(unittest.TestCase):
    """Tests 17-18: Graph must not import Supabase or use input()."""

    def _src(self) -> str:
        import langgraph_workflow.interview_graph as module
        return inspect.getsource(module)

    def test_17_graph_does_not_import_supabase(self):
        """interview_graph.py must not import or reference Supabase."""
        src = self._src()
        self.assertNotIn("import supabase", src)
        self.assertNotIn("supabase.table", src)
        self.assertNotIn("SUPABASE_URL", src)

    def test_18_graph_does_not_use_input(self):
        """interview_graph.py must not call input() — no CLI blocking allowed."""
        import ast
        src = self._src()

        class InputFinder(ast.NodeVisitor):
            def __init__(self):
                self.calls = 0
            def visit_Call(self, node):
                if isinstance(node.func, ast.Name) and node.func.id == "input":
                    self.calls += 1
                self.generic_visit(node)

        finder = InputFinder()
        finder.visit(ast.parse(src))
        self.assertEqual(
            finder.calls, 0,
            "interview_graph.py must not use input() — no CLI blocking allowed.",
        )


# ===========================================================================
# CLASS 10 — evaluate_answer node validation
# ===========================================================================

class TestEvaluateAnswerNode(unittest.TestCase):
    """Node-level validation for evaluate_answer."""

    def _run_node(self, state: dict) -> dict:
        from langgraph_workflow.interview_graph import evaluate_answer
        return evaluate_answer(state)

    def test_evaluate_raises_without_question(self):
        """Must raise RuntimeError when current_question is None."""
        with self.assertRaises(RuntimeError):
            self._run_node({"current_question": None, "current_answer": "some answer"})

    def test_evaluate_raises_without_answer(self):
        """Must raise RuntimeError when current_answer is empty string."""
        with self.assertRaises(RuntimeError):
            self._run_node({"current_question": FAKE_QUESTION, "current_answer": ""})

    def test_evaluate_raises_when_answer_is_whitespace_only(self):
        """Must raise RuntimeError when current_answer is whitespace only."""
        with self.assertRaises(RuntimeError):
            self._run_node({"current_question": FAKE_QUESTION, "current_answer": "   "})

    @patch(
        "langgraph_workflow.interview_graph._evaluate_answer",
        return_value=FAKE_EVALUATION,
    )
    def test_evaluate_stores_evaluation(self, mock_e):
        """Stores the evaluation dict in current_evaluation."""
        result = self._run_node({
            "current_question": FAKE_QUESTION,
            "current_answer":   "My detailed answer.",
        })
        self.assertIn("current_evaluation", result)
        self.assertEqual(result["current_evaluation"]["score"], 8)

    @patch(
        "langgraph_workflow.interview_graph._evaluate_answer",
        return_value=FAKE_EVALUATION,
    )
    def test_evaluate_passes_expected_concepts_to_ai(self, mock_e):
        """_evaluate_answer must receive expected_concepts from the question."""
        self._run_node({
            "current_question": FAKE_QUESTION,
            "current_answer":   "My answer.",
        })
        call_args = mock_e.call_args
        # Third positional arg is expected_concepts, or it may be kwargs
        args = call_args[0]
        self.assertEqual(args[1], FAKE_QUESTION["expected_concepts"])


# ===========================================================================
# CLASS 11 — run_adaptive_engine node validation
# ===========================================================================

class TestAdaptiveEngineNode(unittest.TestCase):
    """Node-level validation for run_adaptive_engine ('adaptive_decision' node)."""

    def _run_node(self, state: dict) -> dict:
        from langgraph_workflow.interview_graph import run_adaptive_engine
        return run_adaptive_engine(state)

    def _base_state(self, **overrides) -> dict:
        """Build a minimal valid state dict for run_adaptive_engine."""
        base = {
            "current_evaluation": FAKE_EVALUATION,
            "current_topic":      "FastAPI",
            "current_difficulty": "medium",
            "topics_covered":     ["FastAPI"],
            "role_topics":        ["API Design", "Databases", "Security"],
            "candidate_topics":   ["FastAPI", "REST APIs"],
            "available_topics":   ["API Design", "Databases", "Security", "FastAPI", "REST APIs"],
            "question_count":     1,
            "max_questions":      3,
            "current_question":   FAKE_QUESTION,
            "current_answer":     "My answer.",
            "interview_history":  [],
        }
        base.update(overrides)
        return base

    def test_adaptive_raises_without_evaluation(self):
        """Must raise RuntimeError when current_evaluation is None."""
        with self.assertRaises(RuntimeError):
            self._run_node(self._base_state(current_evaluation=None))

    def test_adaptive_raises_when_evaluation_is_not_dict(self):
        """Must raise RuntimeError when current_evaluation is not a dict."""
        with self.assertRaises(RuntimeError):
            self._run_node(self._base_state(current_evaluation="bad"))

    def test_adaptive_appends_history(self):
        """Must append exactly 1 entry to interview_history per call."""
        result = self._run_node(self._base_state())
        self.assertEqual(len(result["interview_history"]), 1)

    def test_adaptive_history_entry_has_required_keys(self):
        """History entry must have: turn, question, answer, evaluation, adaptive_decision."""
        result = self._run_node(self._base_state())
        entry  = result["interview_history"][0]
        for key in ("turn", "question", "answer", "evaluation", "adaptive_decision"):
            self.assertIn(key, entry, f"History entry missing key: '{key}'.")

    def test_adaptive_marks_finished_at_limit(self):
        """Must set is_finished=True when question_count >= max_questions."""
        result = self._run_node(self._base_state(question_count=3, max_questions=3))
        self.assertTrue(result["is_finished"],
                        "is_finished must be True when question_count == max_questions.")

    def test_adaptive_not_finished_below_limit(self):
        """Must NOT set is_finished=True when question_count < max_questions (no early-exit)."""
        # 1 turn, max=10, score=8 → does not trigger early exit (need >=5 turns)
        result = self._run_node(self._base_state(question_count=1, max_questions=10))
        self.assertFalse(result["is_finished"])

    def test_adaptive_score_includes_current_turn(self):
        """
        Regression: current turn's score must be included in early-exit calculation.
        (History is appended BEFORE avg_score is computed.)

        Setup: 4 prior turns all score=8 + current turn score=8 = 5 total.
        All topics covered (topics_covered == available_topics).
        question_count=5, max_questions=10 → not at hard limit.
        Expected: is_finished=True via early-exit (covered_all=True, avg=8 >= 7.5).
        """
        prior_history = [
            {
                "turn": i, "question": FAKE_QUESTION, "answer": "ans",
                "evaluation": {"score": 8}, "adaptive_decision": {},
            }
            for i in range(1, 5)
        ]
        state = self._base_state(
            current_evaluation={**FAKE_EVALUATION, "score": 8},
            topics_covered=["FastAPI"],
            role_topics=[],
            candidate_topics=[],
            available_topics=["FastAPI"],  # only 1 topic → covered_all=True
            question_count=5,
            max_questions=10,
            interview_history=prior_history,
        )
        result = self._run_node(state)
        self.assertTrue(result["is_finished"],
                        "Expected early finish when all topics covered and avg_score=8.0.")

    def test_adaptive_no_early_exit_below_5_turns(self):
        """
        Must NOT early-exit even if all topics are covered and scores are high,
        when question_count < 5.  The minimum is 5 turns for early-exit.
        """
        prior_history = [
            {
                "turn": i, "question": FAKE_QUESTION, "answer": "ans",
                "evaluation": {"score": 10}, "adaptive_decision": {},
            }
            for i in range(1, 3)
        ]
        state = self._base_state(
            current_evaluation={**FAKE_EVALUATION, "score": 10},
            topics_covered=["FastAPI"],
            available_topics=["FastAPI"],  # covered_all=True
            question_count=3,              # < 5, no early exit
            max_questions=10,
            interview_history=prior_history,
        )
        result = self._run_node(state)
        self.assertFalse(result["is_finished"],
                         "Must NOT early-exit when question_count < 5, "
                         "even if all topics covered.")


# ===========================================================================
# CLASS 12 — lazy graph accessor
# ===========================================================================

class TestLazyGraphAccessor(unittest.TestCase):
    """get_interview_graph() must not crash on import and must return a graph."""

    def test_get_interview_graph_returns_graph(self):
        """First call builds the graph; second call returns the cached instance."""
        from langgraph_workflow import interview_graph as ig_module
        original = ig_module._interview_graph
        try:
            ig_module._interview_graph = None  # reset so lazy init fires
            with patch.object(
                ig_module,
                "build_interview_graph",
                return_value="fake_graph",
            ) as mock_build:
                result = ig_module.get_interview_graph()
                mock_build.assert_called_once()
                self.assertEqual(result, "fake_graph")
                # Second call must return the cached value — NOT rebuild.
                result2 = ig_module.get_interview_graph()
                mock_build.assert_called_once()     # still exactly once
                self.assertEqual(result2, "fake_graph")
        finally:
            ig_module._interview_graph = original   # always restore


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == "__main__":
    unittest.main(verbosity=2)
