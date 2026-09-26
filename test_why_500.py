from api.test_interview_router import TestStartInterview
test = TestStartInterview("test_02_start_returns_200")
test.setUp()
resp = test._start()
print("STATUS CODE:", resp.status_code)
print("BODY:", resp.json())
test.tearDown()
