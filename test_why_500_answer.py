from api.test_interview_router import TestAnswerEndpoint
test = TestAnswerEndpoint("test_05_answer_resumes_correct_thread")
test.setUp()
try:
    iid = test._start_interview(max_q=2)
    resp = test._answer(iid, "I use Depends() for DI.")
    print("STATUS CODE:", resp.status_code)
    print("TEXT:", resp.text)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    test.tearDown()
