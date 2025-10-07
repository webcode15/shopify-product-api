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

// export const collectionController = async (req, res) => {
//   const collectionHandle = req.params.handle;
//   const { locationId, size, weight, vendor } = req.query;

//   if (!locationId) {
//     return res.status(400).json({ error: "locationId query param is required" });
//   }

//   // Helper to filter products with multi-value support
//   function multiFilter(products, key, queryValue) {
//     if (!queryValue) return products;
//     const values = queryValue.split(",").map((v) => v.trim());
//     return products.filter((prod) => values.includes(prod[key]));
//   }

//   if (locationId === "gid://shopify/Location/68360798375") {
//     console.log("🧾 newJerseyProducts count:", newJerseyProducts.length);

//     let filteredProducts = [...newJerseyProducts];

//     filteredProducts = multiFilter(filteredProducts, "size", size);
//     filteredProducts = multiFilter(filteredProducts, "weight", weight);
//     filteredProducts = multiFilter(filteredProducts, "vendor", vendor);

//     return res.json({ items: filteredProducts });
//   } else if (locationId === "gid://shopify/Location/70232211623") {
//     console.log("🧾 cummingProducts count:", cummingProducts.length);
//     // For simplicity, no filter on cached data here, add if needed
//     return res.json({ items: cummingProducts });
//   } else if (locationId === "gid://shopify/Location/76107481255") {
//     console.log("🧾 warehouseProducts count:", warehouseProducts.length);
//     return res.json({ totalCount: warehouseProducts.length, items: warehouseProducts });
//   }

//   // You can add dynamic Shopify API fetching here if needed (same as your original code)

//   return res.status(404).json({ error: "Location not found or no cached data" });
// };
export const collectionController = async (req, res) => {
  const collectionHandle = req.params.handle;
  const { locationId } = req.query;

  if (!locationId) {
    return res.status(400).json({ error: "locationId query param is required" });
  }

  // Normalize collection handle to lowercase for comparison
  const normalizedHandle = collectionHandle.toLowerCase().replace(/-/g, " ");

  // Helper function to filter by collection handle using categories
  function filterByCollection(products) {
    return products.filter((prod) => {
      return prod.categories?.some(
        (cat) => cat.toLowerCase().replace(/-/g, " ") === normalizedHandle
      );
    });
  }

  let products = [];

  if (locationId === "gid://shopify/Location/68360798375") {
    console.log("🧾 newJerseyProducts count:", newJerseyProducts.length);
    products = filterByCollection(newJerseyProducts);
  } else if (locationId === "gid://shopify/Location/70232211623") {
    console.log("🧾 cummingProducts count:", cummingProducts.length);
    products = filterByCollection(cummingProducts);
  } else if (locationId === "gid://shopify/Location/76107481255") {
    console.log("🧾 warehouseProducts count:", warehouseProducts.length);
    products = filterByCollection(warehouseProducts);
  } else {
    return res.status(404).json({ error: "Location not found or no cached data" });
  }

  return res.json({ items: products });
};
