const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();

// Load environment variables (set in Render or local .env)
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Serve static files (your HTML, CSS, images)
app.use(express.static(path.join(__dirname, "/")));

// Root route (optional)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "watermc_store.html"));
});

// Discord OAuth callback
app.get("/auth", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send("❌ No code provided by Discord.");

    // Prepare URL-encoded parameters
    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);

    // Request token from Discord
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString() // MUST be URL-encoded string
    });

    const tokenText = await tokenResponse.text(); // raw response for debugging
    console.log("Discord token raw response:", tokenText);

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (err) {
      console.error("❌ Failed to parse token JSON:", err.message);
      return res.send("❌ Failed to parse token. Check server logs.");
    }

    // If Discord returned an error
    if (tokenData.error) {
      console.error("❌ Discord token error:", tokenData);
      return res.send(`❌ Discord token error: ${tokenData.error_description || tokenData.error}`);
    }

    // Fetch user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userText = await userResponse.text(); // raw user response
    console.log("Discord user raw response:", userText);

    let user;
    try {
      user = JSON.parse(userText);
    } catch (err) {
      console.error("❌ Failed to parse user JSON:", err.message);
      return res.send("❌ Failed to get Discord user info. Check server logs.");
    }

    const username = user.global_name || user.username || "Unknown User";

    // Send HTML script to store username and redirect
    res.send(`
      <script>
        localStorage.setItem("discordUser", "${username}");
        window.location.href = "/store.html";
      </script>
    `);

  } catch (err) {
    console.error("❌ OAuth error:", err);
    res.status(500).send("❌ Internal server error during Discord OAuth.");
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
