const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
require("dotenv").config(); // Load .env variables

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Serve static files
app.use(express.static(path.join(__dirname, "/")));

// Discord OAuth2
app.get("/auth", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send("No code provided by Discord.");

    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    const tokenText = await tokenResponse.text();

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      console.error("Discord token response:", tokenText);
      return res.send("❌ Failed to get Discord token. Check server logs.");
    }

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userText = await userResponse.text();
    let user;
    try {
      user = JSON.parse(userText);
    } catch (e) {
      console.error("Discord user response:", userText);
      return res.send("❌ Failed to get Discord user info. Check server logs.");
    }

    const username = user.global_name || user.username;

    res.send(`
      <script>
        localStorage.setItem("discordUser", "${username}");
        window.location.href = "/store.html";
      </script>
    `);

  } catch (err) {
    console.error("OAuth error:", err);
    res.status(500).send("Internal server error during Discord OAuth.");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
