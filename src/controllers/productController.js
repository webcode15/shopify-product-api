import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

export const  productController = async (req, res) => {
  const locationId = req.query.locationId;
  console.log("Fetching products for location:", locationId);
  if (!locationId) {
    return res.status(400).json({ error: "locationId is required" });
  }
function sanitizeFilename(name) {
  // Replace all chars except a-z, A-Z, 0-9, _, - with _
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory ${dirPath} does not exist. Creating...`);
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created.`);
  }
}
  const gql = `
    query LocationInventoryLevels($locationId: ID!, $after: String) {
      location(id: $locationId) {
        inventoryLevels(first: 250, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            item {
              variant {
                id
                title
                price
                compareAtPrice
                selectedOptions { name value }
                product {
                  id
                  title
                  vendor
                  productType
                  handle
                  featuredImage { url }
                  collections(first: 250) { edges { node { title handle } } }
                }
              }
            }
            quantities(names: ["available"]) { name quantity }
          }
        }
      }
    }
  `;

  try {
    let allNodes = [];
    let hasNextPage = true;
    let after = null;

    while (hasNextPage) {
      const response = await fetch(SHOPIFY_API_URL, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: gql, variables: { locationId, after } }),
      });
      const data = await response.json();

      if (data.errors) {
        console.error("GraphQL Errors:", data.errors);
        return res.status(500).json({ error: "Failed to fetch products", details: data.errors });
      }

      const inventoryLevels = data.data?.location?.inventoryLevels;
      if (!inventoryLevels) break;

      allNodes = allNodes.concat(inventoryLevels.nodes || []);
      hasNextPage = inventoryLevels.pageInfo.hasNextPage;
      after = inventoryLevels.pageInfo.endCursor;
    }

    const items = allNodes
      .filter(level => level.quantities?.some(q => q.name === "available" && q.quantity > 0))
      .map(level => {
        const qty = level.quantities.find(q => q.name === "available").quantity;
        const variant = level.item.variant;
        const prod = variant.product;

        const sizeOpt = variant.selectedOptions?.find(o => o.name?.toLowerCase() === "size");
        const weightOpt = variant.selectedOptions?.find(o => o.name?.toLowerCase() === "weight");

        const categories = (prod.collections?.edges || [])
          .map(edge => edge.node?.title)
          .filter(Boolean);

        return {
          id: prod.id,
          title: prod.title,
          image: prod.featuredImage?.url || "",
          available: qty,
          price: variant.price || null,
          compareAtPrice: variant.compareAtPrice,
          size: sizeOpt ? sizeOpt.value : null,
          weight: weightOpt ? weightOpt.value : null,
          vendor: prod.vendor || null,
          productType: prod.productType || null,
          categories,
          url: `/products/${prod.handle}`,
        };
      });

    const safeLoc = sanitizeFilename(locationId);
    const filename = path.join(__dirname, "/cached", `products_${safeLoc}.json`);
    ensureDirExists(path.dirname(filename));
    fs.writeFileSync(filename, JSON.stringify(items, null, 2), "utf-8");
    console.log(`Saved products JSON for location ${locationId} at: ${filename}`);

    res.json({ totalCount: items.length, items });
  } catch (err) {
    console.error("Error fetching products batch:", err);
    res.status(500).json({ error: "Failed to fetch products batch" });
  }
}