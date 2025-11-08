import pytest
from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.app import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_activity_data():
    return {
        "description": "Test activity description",
        "schedule": "Test schedule",
        "max_participants": 10,
        "participants": []
    }

def test_root_redirect(client):
    """Test that the root path redirects to the static index.html"""
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"

def test_get_activities(client):
    """Test retrieving all activities"""
    response = client.get("/activities")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
    # Check that the response contains some of our known activities
    assert "Chess Club" in response.json()
    assert "Programming Class" in response.json()

def test_signup_for_activity_success(client):
    """Test successful signup for an activity"""
    activity_name = "Chess Club"
    email = "newstudent@mergington.edu"
    response = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert response.status_code == 200
    assert "Signed up" in response.json()["message"]

    # Verify the student was added
    activities = client.get("/activities").json()
    assert email in activities[activity_name]["participants"]

def test_signup_for_nonexistent_activity(client):
    """Test signup for a non-existent activity"""
    activity_name = "NonexistentClub"
    email = "student@mergington.edu"
    response = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert response.status_code == 404
    assert "Activity not found" in response.json()["detail"]

def test_duplicate_signup(client):
    """Test signing up the same student twice"""
    activity_name = "Programming Class"
    email = "emma@mergington.edu"  # This email is already in the participants list
    response = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert response.status_code == 400
    assert "already signed up" in response.json()["detail"]

def test_websocket_connection(client):
    """Test that the WebSocket endpoint is available"""
    with client.websocket_connect("/ws") as websocket:
        # The connection itself is enough to test the endpoint exists
        pass  # WebSocket will be closed automatically after the with block