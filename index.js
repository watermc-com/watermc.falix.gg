const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();

// Discord OAuth credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Serve static files
app.use(express.static(path.join(__dirname, "/")));

// OAuth callback
app.get("/auth", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send("❌ No code from Discord");

    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);

    // Request token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    const tokenText = await tokenResponse.text();
    console.log("Discord token raw response:", tokenText);

    let tokenData;
    try { tokenData = JSON.parse(tokenText); } 
    catch { return res.send("❌ Failed to parse token. Check server logs."); }

    // Fetch user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userText = await userResponse.text();
    console.log("Discord user raw response:", userText);

    let user;
    try { user = JSON.parse(userText); } 
    catch { return res.send("❌ Failed to parse user info"); }

    const username = user.global_name || user.username;

    // Send HTML to save username and redirect to store
    res.send(`
      <script>
        localStorage.setItem("discordUser","${username}");
        window.location.href = "/watermc_store.html";
      </script>
    `);

  } catch (err) {
    console.error("OAuth error:", err);
    res.status(500).send("❌ Internal server error during Discord OAuth.");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server running on port ${PORT}`));
