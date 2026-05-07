import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import fs from "fs";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize services lazily
  let stripe: Stripe | null = null;
  if (process.env.STRIPE_API_KEY) {
    stripe = new Stripe(process.env.STRIPE_API_KEY);
    console.log("Stripe initialized");
  } else {
    console.error("STRIPE_API_KEY is missing");
  }

  let supabaseAdmin: any = null;
  if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log("Supabase Admin initialized");
  } else {
    console.error("Supabase configuration is missing");
  }

  app.post("/api/webhook", express.raw({type: 'application/json'}), async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Stripe or Webhook secret not configured");
      return res.status(500).send("Server configuration error");
    }
    
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      if (userId && supabaseAdmin) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', userId);
        
        if (error) {
          console.error("Supabase update error:", error);
          return res.status(500).json({ error: "Failed to update user profile" });
        }
        console.log(`User ${userId} upgraded to premium.`);
      }
    }

    res.json({received: true});
  });

  app.use(express.json());

  app.post("/api/create-checkout-session", async (req, res) => {
    console.log("Received request to /api/create-checkout-session", req.body);
    const { userId } = req.body;
    if (!userId) {
      console.error("Missing userId in request body");
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!stripe) {
      console.error("Stripe not initialized");
      return res.status(500).json({ error: "Server configuration error: Stripe not initialized" });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: 'price_1TC1ROA4cFprIDo8wktcSzj6',
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${process.env.APP_URL || 'https://ais-dev-njxwfj4ow4z2exos4xfcgu-366807427807.asia-southeast1.run.app'}/profile?success=true`,
        cancel_url: `${process.env.APP_URL || 'https://ais-dev-njxwfj4ow4z2exos4xfcgu-366807427807.asia-southeast1.run.app'}/profile?canceled=true`,
        client_reference_id: userId,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // API Proxy for Nominatim to bypass browser User-Agent restrictions
  app.get("/api/search", async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q as string)}&format=json&limit=10&addressdetails=1`;
    
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "KyusafeApp/1.0 (davantesandrew@gmail.com)",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Nominatim error: ${response.statusText}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      // Fallback to serving index.html from root if dist doesn't exist
      app.use(express.static(path.join(process.cwd())));
      app.get("*", (req, res) => {
        res.sendFile(path.join(process.cwd(), "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
