const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
require("dotenv").config();

const app = express();

// 🔐 ENV VARIABLES
const CLIENT_ID = process.env.CLIENT_ID || "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "YOUR_CLIENT_SECRET";
const REDIRECT_URI = process.env.REDIRECT_URI || "https://watermc-store.onrender.com/auth";

// 📁 Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "/")));

// 🔗 DISCORD OAUTH ROUTE
app.get("/auth", async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.send("❌ No code provided by Discord.");
    }

    // 📦 Prepare token request
    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);

    // 🔄 Request access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("❌ Token Error:", tokenData);
      return res.send("❌ Failed to get Discord access token.");
    }

    // 👤 Get Discord user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const userData = await userResponse.json();

    if (!userData.id) {
      console.error("❌ User Error:", userData);
      return res.send("❌ Failed to fetch Discord user.");
    }

    const username = userData.global_name || userData.username || "Unknown";

    // 🚀 Redirect logic based on what user clicked
    res.send(`
      <script>

        // Save Discord username
        localStorage.setItem("discordUser", "${username}");

        // Get what user selected before login
        const type = localStorage.getItem("buyType");

        if(type === "rank"){
          window.location.href = "/store.html";
        } 
        else if(type === "coin"){
          window.location.href = "/coin.html";
        } 
        else {
          // fallback safety
          window.location.href = "/watermc_store.html";
        }

      </script>
    `);

  } catch (error) {
    console.error("🔥 OAuth Error:", error);
    res.status(500).send("❌ Internal server error during Discord login.");
  }
});

// 🌐 START SERVER
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 WaterMC Store running on port " + PORT);
});
