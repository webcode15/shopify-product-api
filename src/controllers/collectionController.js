import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let newJerseyProducts = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "./cached/products_gid___shopify_Location_68360798375.json"),
    "utf-8"
  )
);
const cummingProducts = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "./cached/products_gid___shopify_Location_70232211623.json"),
    "utf-8"
  )
);
const warehouseProducts = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "./cached/products_gid___shopify_Location_76107481255.json"),
    "utf-8"
  )
);

const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;


// ✅ Main controller
export const collectionController = async (req, res) => {
  const collectionHandle = req.params.handle;
  const {locationId,size} = req.query;
  // console.log("🔥 /products/collection/:handle hit");
  // console.log("locationId:", locationId);

  if (!locationId) {
    return res.status(400).json({ error: "locationId query param is required" });
  }

  // Serve cached data for specific known locations
  if (locationId === "gid://shopify/Location/68360798375") {
    console.log("🧾 newJerseyProducts count:", newJerseyProducts.length);
if(size){
  newJerseyProducts = newJerseyProducts.filter(prod=> prod.size==size)
}
    return res.json({ items: newJerseyProducts });
  } else if (locationId === "gid://shopify/Location/70232211623") {
    console.log("🧾 cummingProducts count:", cummingProducts.length);
    return res.json({ items: cummingProducts });
  } else if (locationId === "gid://shopify/Location/76107481255") {
    console.log("🧾 warehouseProducts count:", warehouseProducts.length);
    return res.json({ totalCount: warehouseProducts.length, items: warehouseProducts });
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
        return res
          .status(500)
          .json({ error: "Failed to fetch products collection", details: data.errors });
      }

      const inventoryLevels = data.data?.location?.inventoryLevels;
      if (!inventoryLevels) break;

      allNodes = allNodes.concat(inventoryLevels.nodes || []);
      hasNextPage = inventoryLevels.pageInfo.hasNextPage;
      after = inventoryLevels.pageInfo.endCursor;
    }

    const items = allNodes
      .filter((level) => {
        const availableQty = level.quantities?.find(
          (q) => q.name === "available" && q.quantity > 0
        );
        const collections = level.item?.variant?.product?.collections?.edges || [];

        return (
          availableQty &&
          collections.some((edge) => edge.node.handle === collectionHandle)
        );
      })
      .map((level) => {
        const qty = level.quantities.find((q) => q.name === "available").quantity;
        const variant = level.item.variant;
        const prod = variant.product;

        const sizeOpt = variant.selectedOptions?.find(
          (o) => o.name?.toLowerCase() === "size"
        );
        const weightOpt = variant.selectedOptions?.find(
          (o) => o.name?.toLowerCase() === "weight"
        );

        const categories = (prod.collections?.edges || [])
          .map((edge) => edge.node?.title)
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

    // Save new cache file for this location
 

    res.json({ totalCount: items.length, items });
  } catch (err) {
    console.error("❌ Error fetching products collection:", err);
    res.status(500).json({ error: "Failed to fetch products collection" });
  }
};

