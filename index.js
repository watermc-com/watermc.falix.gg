const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
require("dotenv").config();

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://watermc-store.onrender.com/auth";

app.use(express.static(path.join(__dirname, "/")));

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

    await new Promise(r => setTimeout(r, 800));

    // 🔁 TRY BOTH ENDPOINTS (AUTO FIX)
    let tokenData;

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
        console.log("👉 Raw response:", text.substring(0, 120));

        try {
          tokenData = JSON.parse(text);
          if (tokenData.access_token) break;
        } catch {}
      } catch (err) {
        console.log("❌ Failed URL:", url);
      }
    }

    if (!tokenData || !tokenData.access_token) {
      console.error("❌ Token Failed:", tokenData);
      return res.send("❌ Discord token failed (rate limit or config issue)");
    }

    // 👤 GET USER
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "Mozilla/5.0"
      }
    });

    const user = await userRes.json();

    if (!user.id) {
      console.error("❌ User Fetch Error:", user);
      return res.send("❌ Failed to fetch user");
    }

    const username = user.global_name || user.username;

    console.log("✅ USER:", username);

    res.send(`
      <script>
        localStorage.setItem("discordUser", "${username}");
        const type = localStorage.getItem("buyType");

        if(type === "rank"){
          window.location.href = "/store.html";
        } else if(type === "coin"){
          window.location.href = "/coin.html";
        } else {
          window.location.href = "/watermc_store.html";
        }
      </script>
    `);

  } catch (err) {
    console.error("🔥 FINAL ERROR:", err);
    res.send("❌ ERROR: " + err.message);
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});
