const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
require("dotenv").config();

const app = express();

// 🔐 ENV VARIABLES
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://watermc-store.onrender.com/auth";

// 📁 Serve static files
app.use(express.static(path.join(__dirname, "/")));

// 🔗 DISCORD OAUTH ROUTE
app.get("/auth", async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.send("❌ No code provided");
    }

    console.log("👉 Code:", code);

    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);

    // ⏳ Delay (avoid rate limit)
    await new Promise(r => setTimeout(r, 800));

    let tokenData = null;

    // 🔁 TRY BOTH TOKEN ENDPOINTS
    for (const url of [
      "https://discord.com/api/oauth2/token",
      "https://discordapp.com/api/oauth2/token"
    ]) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
          },
          body: params.toString()
        });

        const text = await response.text();
        console.log("👉 Token Raw:", text.substring(0, 120));

        try {
          tokenData = JSON.parse(text);
          if (tokenData.access_token) break;
        } catch {}
      } catch (err) {
        console.log("❌ Token URL failed:", url);
      }
    }

    if (!tokenData || !tokenData.access_token) {
      console.error("❌ Token Failed:", tokenData);
      return res.send("❌ Discord token failed (rate limit or config issue)");
    }

    // ⏳ Delay before user fetch
    await new Promise(r => setTimeout(r, 800));

    let user = null;

    // 🔁 TRY BOTH USER ENDPOINTS
    for (const url of [
      "https://discord.com/api/users/@me",
      "https://discordapp.com/api/users/@me"
    ]) {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
          }
        });

        const text = await response.text();
        console.log("👉 User Raw:", text.substring(0, 120));

        try {
          user = JSON.parse(text);
          if (user.id) break;
        } catch {}
      } catch (err) {
        console.log("❌ User URL failed:", url);
      }
    }

    if (!user || !user.id) {
      console.error("❌ User Fetch Failed:", user);
      return res.send("❌ Discord user fetch failed (rate limited)");
    }

    const username = user.global_name || user.username || "Unknown";

    console.log("✅ USER:", username);

    // 🚀 Redirect
    res.send(`
      <script>
        localStorage.setItem("discordUser", "${username}");
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

  } catch (err) {
    console.error("🔥 FINAL ERROR:", err);
    res.send("❌ ERROR: " + err.message);
  }
});

// 🌐 START SERVER
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 WaterMC Store running on port " + PORT);
});
