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

export const collectionController = async (req, res) => {
  const collectionHandle = req.params.handle;
  const { locationId, size, weight, vendor, productType } = req.query;

  if (!locationId) {
    return res.status(400).json({ error: "locationId query param is required" });
  }
  const normalizedHandle = collectionHandle.toLowerCase().replace(/-/g, " ");
  function filterByCollection(products) {
    return products.filter((prod) => {
      return prod.categories?.some(
        (cat) => cat.toLowerCase().replace(/-/g, " ") === normalizedHandle
      );
    });
  }
  let products = [];

  if (locationId === "gid://shopify/Location/68360798375") {
    products = filterByCollection(newJerseyProducts);
    console.log("🧾 newJerseyProducts count:", products.length);
  } else if (locationId === "gid://shopify/Location/70232211623") {
    products = filterByCollection(cummingProducts);
    console.log("🧾 cummingProducts count:", products.length);
  } else if (locationId === "gid://shopify/Location/76107481255") {
    products = filterByCollection(warehouseProducts);
    console.log("🧾 warehouseProducts count:", products.length);
  } else {
    return res.status(404).json({ error: "Location not found or no cached data" });
  }

  const weightArray = weight ? weight.split(",") : [];
  const gradeArray = productType ? productType.split(",") : [];
  const sizeArray = size ? size.split(",") : [];
  const vendorArray = vendor ? vendor.split(",") : [];

  const filtered = products.filter((prod) => {
    const sizeMatch = sizeArray.length === 0 || sizeArray.includes(prod.size);
    const weightMatch = weightArray.length === 0 || weightArray.includes(prod.weight);
    const vendorMatch = vendorArray.length === 0 || vendorArray.includes(prod.vendor);
    const gradeMatch = gradeArray.length === 0 || gradeArray.includes(prod.productType);
    return sizeMatch && weightMatch && vendorMatch && gradeMatch ;
  });

  return res.json({ items: filtered  });
};
