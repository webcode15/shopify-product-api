import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

// Simulate __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define constants from env
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// Create dir if it doesn't exist
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export const locationController = async (req, res) => {
  const query = `
    query {
      locations(first: 50) {
        edges {
          node { id name }
        }
      }
    }
  `;

  try {
    const response = await fetch(SHOPIFY_API_URL, {
      method: "POST",   
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL Errors:", data.errors);
      return res.status(500).json({ error: "Failed to fetch locations", details: data.errors });
    }

    const locations = data.data.locations.edges.map((edge) => edge.node);
    const filename = path.join(__dirname, "cached", "locations.json");
    ensureDirExists(path.dirname(filename));
    fs.writeFileSync(filename, JSON.stringify(locations, null, 2), "utf-8");

    res.json({ totalLocations: locations.length, locations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ error: "Failed to fetch locations", details: error.message });
  }
};
