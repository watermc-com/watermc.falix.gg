require('dotenv').config(); // load variables from .env
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();

// Environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Serve static files
app.use(express.static(path.join(__dirname, "/")));

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "watermc_store.html"));
});

// Discord OAuth callback
app.get("/auth", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send("❌ No code from Discord.");

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
    } catch {
      console.error("Token parse error:", tokenText);
      return res.send("❌ Failed to get token. Check server logs.");
    }

    if (tokenData.error) {
      console.error("Discord token error:", tokenData);
      return res.send(`❌ ${tokenData.error_description || tokenData.error}`);
    }

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userText = await userResponse.text();
    let user;
    try {
      user = JSON.parse(userText);
    } catch {
      console.error("User parse error:", userText);
      return res.send("❌ Failed to get user info.");
    }

    const username = user.global_name || user.username || "Unknown User";

    res.send(`
      <script>
        localStorage.setItem("discordUser", "${username}");
        window.location.href = "/store.html";
      </script>
    `);

  } catch (err) {
    console.error("OAuth error:", err);
    res.status(500).send("❌ Internal server error during Discord OAuth.");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));
