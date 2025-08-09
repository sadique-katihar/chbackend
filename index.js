const express = require("express");
const { google } = require('googleapis');
const axios = require('axios');
let serviceAccount;

if (process.env.GOOGLE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require('./serviceAccountKey.json');
}



const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

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

app.post('/subscribe', async (req, res) => {
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

    res.json({ success: true, message: `Subscribed to ${topic}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/", (req, res) => {
    res.send("Backend is running!");
});

app.listen(3000, () => console.log('Server running on port 3000'));
