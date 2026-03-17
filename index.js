const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
require("dotenv").config();

const app = express();

// 🔐 ENV VARIABLES
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://watermc-store.onrender.com/auth";

// 📁 Serve static files
app.use(express.static(path.join(__dirname, "/")));

// 🔗 DISCORD OAUTH ROUTE (FULL FIXED)
app.get("/auth", async (req, res) => {
  try {
    const code = req.query.code;

    console.log("👉 Code:", code);

    if (!code) {
      return res.send("❌ No code provided by Discord.");
    }

    // ❗ Check env first
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error("❌ Missing CLIENT_ID or CLIENT_SECRET");
      return res.send("❌ Server config error (env missing)");
    }

    // 📦 Prepare request
    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);

    // 🔄 Get token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const tokenText = await tokenResponse.text();
    console.log("👉 Token Raw:", tokenText);

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (err) {
      console.error("❌ Token parse error");
      return res.send("❌ Failed to parse token response");
    }

    if (!tokenData.access_token) {
      console.error("❌ No access token:", tokenData);
      return res.send("❌ Discord token error");
    }

    // 👤 Get user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const userText = await userResponse.text();
    console.log("👉 User Raw:", userText);

    let userData;
    try {
      userData = JSON.parse(userText);
    } catch (err) {
      console.error("❌ User parse error");
      return res.send("❌ Failed to parse user data");
    }

    if (!userData.id) {
      console.error("❌ Invalid user data:", userData);
      return res.send("❌ Failed to fetch Discord user");
    }

    const username = (userData.global_name || userData.username || "Unknown")
      .replace(/'/g, "\\'"); // prevent JS break

    // 🚀 FINAL REDIRECT
    res.send(`
      <script>

        localStorage.setItem("discordUser", '${username}');

        const type = localStorage.getItem("buyType");

        if(type === "rank"){
          window.location.href = "/store.html";
        } 
        else if(type === "coin"){
          window.location.href = "/coin.html";
        } 
        else {
          window.location.href = "/watermc_store.html";
        }

      </script>
    `);

  } catch (error) {
    console.error("🔥 FULL ERROR:", error);
    res.send("❌ Internal server error (check Render logs)");
  }
});

// 🌐 START SERVER
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 WaterMC Store running on port " + PORT);
});
