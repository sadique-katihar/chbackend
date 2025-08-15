const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

let serviceAccount;
if (process.env.GOOGLE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./serviceAccountKey.json");
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory subscription store (replace with DB in production)
const subscriptions = {};

app.use(express.json());
app.use(cors());

// -------------------- Subscribe to Topic --------------------
app.post("/subscribe", async (req, res) => {
  const { token, topic } = req.body;

  if (!token || !topic) {
    return res.status(400).json({ success: false, error: "Missing token or topic" });
  }

  try {
    await admin.messaging().subscribeToTopic(token, topic);

    // Store locally
    if (!subscriptions[token]) subscriptions[token] = new Set();
    subscriptions[token].add(topic);

    res.json({ success: true, message: `Subscribed to ${topic}` });
  } catch (error) {
    console.error("FCM Subscribe Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------- Check Subscription --------------------
app.get("/isSubscribed", (req, res) => {
  const { token, topic } = req.query;
  if (!token || !topic) {
    return res.status(400).json({ success: false, error: "Missing token or topic" });
  }
  const subscribed = subscriptions[token]?.has(topic) || false;
  res.json({ subscribed });
});

// -------------------- Send Notification --------------------
app.post("/send", async (req, res) => {
  const { topic,image, title, body, msg_id } = req.body;

  if (!topic || !title || !body || !msg_id) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const message = {
      topic: topic,
      notification: {
        title: title,
        image: image,
        body: body,
      },
      data: {
        msg_id: msg_id.toString(),
      },
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error("Send Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------- Test Route --------------------
app.get("/", (req, res) => {
  res.send("Backend is running with Firebase Admin SDK!");
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
