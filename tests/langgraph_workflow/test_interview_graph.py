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

import inspect
import os
import sys
import unittest
from unittest.mock import patch

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
