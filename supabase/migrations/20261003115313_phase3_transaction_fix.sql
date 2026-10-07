DROP FUNCTION IF EXISTS public.save_interview_turn(
    bigint, bigint, numeric, text, text, integer, numeric, text, text, boolean, text, text, text, text, text, text, integer, integer, text, text, text, text, text
);

CREATE OR REPLACE FUNCTION public.save_interview_turn(
    p_answer_id bigint,
    p_interview_id bigint,
    p_score numeric DEFAULT NULL,
    p_correctness numeric DEFAULT NULL,
    p_completeness numeric DEFAULT NULL,
    p_technical_depth integer DEFAULT NULL,
    p_confidence numeric DEFAULT NULL,
    p_missing_concepts text DEFAULT NULL,
    p_feedback text DEFAULT NULL,
    p_needs_followup boolean DEFAULT NULL,
    p_next_action text DEFAULT NULL,
    p_next_topic text DEFAULT NULL,
    p_difficulty text DEFAULT NULL,
    p_reason text DEFAULT NULL,
    p_current_topic text DEFAULT NULL,
    p_current_difficulty text DEFAULT NULL,
    p_question_count integer DEFAULT NULL,
    p_max_questions integer DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_question_text text DEFAULT NULL,
    p_question_topic text DEFAULT NULL,
    p_question_difficulty text DEFAULT NULL,
    p_expected_concepts text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_eval_id bigint;
    v_decision_id bigint;
    v_question_id bigint;
BEGIN
    IF p_score IS NOT NULL THEN
        INSERT INTO evaluations (
            answer_id, score, correctness, completeness, technical_depth, 
            confidence, missing_concepts, feedback, needs_followup
        ) VALUES (
            p_answer_id, p_score, p_correctness, p_completeness, p_technical_depth, 
            p_confidence, p_missing_concepts, p_feedback, p_needs_followup
        ) RETURNING evaluation_id INTO v_eval_id;
        
        IF p_next_action IS NOT NULL THEN
            INSERT INTO adaptive_decisions (
                evaluation_id, next_action, next_topic, difficulty, reason
            ) VALUES (
                v_eval_id, p_next_action, p_next_topic, p_difficulty, p_reason
            ) RETURNING decision_id INTO v_decision_id;
        END IF;
    END IF;

    UPDATE interviews
    SET current_topic = COALESCE(p_current_topic, current_topic),
        current_difficulty = COALESCE(p_current_difficulty, current_difficulty),
        question_count = COALESCE(p_question_count, question_count),
        max_questions = COALESCE(p_max_questions, max_questions),
        status = COALESCE(p_status, status),
        updated_at = NOW()
    WHERE interview_id = p_interview_id;

    IF p_question_text IS NOT NULL THEN
        INSERT INTO questions (
            interview_id, question_text, topic, difficulty, expected_concepts
        ) VALUES (
            p_interview_id, p_question_text, p_question_topic, p_question_difficulty, p_expected_concepts
        ) RETURNING question_id INTO v_question_id;
    END IF;

    RETURN jsonb_build_object(
        'evaluation_id', v_eval_id,
        'decision_id', v_decision_id,
        'question_id', v_question_id
    );
END;
$$ LANGUAGE plpgsql;
