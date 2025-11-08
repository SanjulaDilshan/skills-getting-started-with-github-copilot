document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const template = document.getElementById("activity-card-template");

  // Set up WebSocket connection
  let ws = null;
  
  function connectWebSocket() {
    ws = new WebSocket(`ws://${window.location.host}/ws`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'activities_update') {
        renderActivities(data.data);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed. Retrying in 5 seconds...');
      setTimeout(connectWebSocket, 5000);
    };
  }

  // Function to render activities
  function renderActivities(activities) {
    // Clear loading message / existing cards
    activitiesList.innerHTML = "";
    // Clear existing select options except the empty placeholder
    activitySelect.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

    // Populate activities list
    Object.entries(activities).forEach(([name, details]) => {
      const spotsLeft = details.max_participants - (details.participants?.length || 0);

      // Clone template
      const node = template.content.cloneNode(true);
      const card = node.querySelector(".activity-card");
      // mark card so we can find it later if needed
      card.dataset.activity = name;

      // Fill basic fields
      const titleEl = node.querySelector(".activity-title");
      const descEl = node.querySelector(".activity-description");
      const slotsCountEl = node.querySelector(".slots-count");
      const participantsCountEl = node.querySelector(".participants-count");
      const participantsListEl = node.querySelector(".participants-list");
      const joinBtn = node.querySelector(".join-btn");

      if (titleEl) titleEl.textContent = name;
      if (descEl) descEl.textContent = details.description || "";
      if (slotsCountEl) slotsCountEl.textContent = String(details.max_participants || 0);
      if (participantsCountEl) participantsCountEl.textContent = String(details.participants?.length || 0);

      // Populate participants list
      // Clear any placeholder items
      participantsListEl.innerHTML = "";
      const participants = details.participants || [];
      if (participants.length === 0) {
        const li = document.createElement("li");
        li.className = "no-participants";
        li.textContent = "No participants yet";
        participantsListEl.appendChild(li);
      } else {
        participants.forEach(p => {
          const li = document.createElement("li");
          li.textContent = p;
          participantsListEl.appendChild(li);
        });
      }

      // Hook up join button to pre-select the activity and focus email
      joinBtn.addEventListener("click", () => {
        activitySelect.value = name;
        document.getElementById("email").focus();
      });

      activitiesList.appendChild(node);

      // Add option to select dropdown
      const option = document.createElement("option");
      option.value = name;
      option.textContent = `${name} (${spotsLeft} spots left)`;
      activitySelect.appendChild(option);
    });

    if (Object.keys(activities).length === 0) {
      activitiesList.innerHTML = "<p>No activities available.</p>";
    }
  }

  // Initial fetch of activities
  async function initializeActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      renderActivities(activities);
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // No need to manually refresh - WebSocket will handle updates
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  initializeActivities();
  connectWebSocket();
});