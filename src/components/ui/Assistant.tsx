import { useEffect } from "react";
import { site } from "../../content";

/**
 * The studio's own website assistant: the same rule-based widget the demo sites use
 * (public/demos/assets/chatbot.js), configured for Auvier Technologies. No AI API and no
 * running cost. Chat enquiries are posted to /api/lead (api/lead.js), which forwards them to
 * the owner's Telegram. If delivery fails, the visitor is told to email instead.
 */
const config = {
  demo: false,
  leadEndpoint: "/api/lead",
  leadFailure: `Sorry, that didn't go through. Please email ${site.email} instead.`,
  name: "Auvier Assistant",
  subtitle: "Ask about websites & pricing",
  greeting:
    "Hi! 👋 I'm the kind of assistant we build for local businesses. Ask me about pricing, timelines, or what's included.",
  quickReplies: ["How much does it cost?", "How long does it take?", "Do I pay monthly for AI?", "Get a free mock-up"],
  intents: [
    {
      generic: true,
      keys: ["price", "cost", "how much", "pricing", "fee", "expensive", "budget"],
      answer:
        "For local businesses, Starter is $750 (one-page site plus assistant) and Pro is $1,500 (up to 6 pages, booking forms, Google profile tune-up). An optional care plan is $49/month. You pay 50% to start and 50% at launch. Bigger custom projects get a fixed quote.",
    },
    {
      keys: ["how long", "timeline", "time", "days", "fast", "when", "launch"],
      answer:
        "The local-business package goes live in 7 days from receiving your info. You'll see a private preview before anything is public. Custom brand sites take around four to eight weeks.",
    },
    {
      keys: ["monthly", "subscription", "ai cost", "ai fees", "running cost", "pay for ai", "ongoing"],
      answer:
        "The standard assistant answers from your own FAQs and has no monthly AI cost. The care plan ($49/month) is optional, for updates and hosting help.",
    },
    {
      keys: ["mock up", "mockup", "mock-up", "free", "sample", "preview", "example"],
      answer: "We'll send a free homepage mock-up within 48 hours, with no obligation. Let me take your details.",
      offerLead: true,
    },
    {
      keys: ["own", "ownership", "domain", "hosting", "host", "email"],
      answer:
        "You own the website. We can host it on your own free account and point your existing domain at it. Your email stays untouched.",
    },
    {
      keys: ["seo", "google", "search", "rank", "maps"],
      answer:
        "Every site includes basic SEO and is Google-ready. Pro adds a Google Business Profile tune-up, which is often the quickest win for local searches.",
    },
    {
      keys: ["what do you need", "need from me", "information", "content", "photos", "copy"],
      answer:
        "About 20 minutes of your time: services, prices, hours, photos if you have them, and the questions customers ask most. We write the copy.",
    },
    {
      keys: ["industries", "dentist", "salon", "plumber", "restaurant", "gym", "lawyer", "who do you work"],
      answer:
        "We focus on local service businesses: dentists, salons, trades, clinics, cleaners, restaurants and similar. Have a look at the three demo sites in the Pricing section.",
    },
    {
      keys: ["pay", "payment", "invoice", "paypal", "card", "deposit"],
      answer: "50% to start and 50% at launch, by card or PayPal. Nothing starts without your written go-ahead.",
    },
    {
      keys: ["where are you", "based", "located", "location", "country", "india", "time zone", "timezone", "us based", "local"],
      answer:
        "We're Auvier Technologies, the web studio of Auvier Groups, based in India and working with clients worldwide. Everything runs by email and preview links, so time zones aren't a problem: replies within one business day, and video calls at a time that suits you.",
    },
  ],
  fallback: "Good question! I'll pass it to the team. Would you like them to email you?",
  leadIntro: "Great, let's get your free mock-up started. What's your name?",
  leadThanks: `Thanks {name}! Your message is with the team. We'll reply within one business day from ${site.email}.`,
};

declare global {
  interface Window {
    CHATBOT_CONFIG?: typeof config;
  }
}

/** Loads the chat widget once (it renders itself into <body>). Paths are relative to /technologies/. */
export function Assistant() {
  useEffect(() => {
    if (document.querySelector("script[data-auvier-assistant]")) return; // StrictMode runs effects twice
    window.CHATBOT_CONFIG = config;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "../demos/assets/chatbot.css";
    const js = document.createElement("script");
    js.src = "../demos/assets/chatbot.js";
    js.defer = true;
    js.dataset.auvierAssistant = "";
    document.head.append(css, js);
  }, []);
  return null;
}
