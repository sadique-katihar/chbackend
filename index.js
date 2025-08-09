const express = require("express");
const { google } = require("googleapis");
const axios = require("axios");
let serviceAccount;

if (process.env.GOOGLE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./serviceAccountKey.json");
}

const app = express();
const PORT = process.env.PORT || 3000;
const subscriptions = {};

app.use(express.json());

const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];

async function getAccessToken() {
  const jwtClient = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    SCOPES,
    null
  );
  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}



// -------------------- Subscribe to Topic --------------------
app.post("/subscribe", async (req, res) => {
  const { token, topic } = req.body;

  try {
    const accessToken = await getAccessToken();
    await axios.post(
      `https://iid.googleapis.com/v1/projects/${serviceAccount.project_id}/rel/topics/${topic}`,
      {},
      {
        params: { token },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    // store in memory (replace with DB in production)
    if (!subscriptions[token]) subscriptions[token] = new Set();
    subscriptions[token].add(topic);

    res.json({ success: true, message: `Subscribed to ${topic}` });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/isSubscribed", (req, res) => {
  const { token, topic } = req.query;
  const subscribed = subscriptions[token]?.has(topic) || false;
  res.json({ subscribed });
});

// -------------------- Send Notification --------------------
app.post("/send", async (req, res) => {
  const { topic, title, body, msg_id } = req.body;

  if (!topic || !title || !body || !msg_id) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const accessToken = await getAccessToken();

    const message = {
      message: {
        topic: topic, // send to the topic
        notification: {
          title: title,
          body: body
        },
        data: {
          msg_id: msg_id.toString()
        }
      }
    };

    const response = await axios.post(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      message,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    res.json({ success: true, response: response.data });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});



// -------------------- Test Route --------------------
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
