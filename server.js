import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import productRoute from './src/routes/productRoute.js'
import collectionRoute from './src/routes/collectionRoute.js'
import locationRoute from './src/routes/locationRoute.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const whitelist = [
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://cricketstoreonline.com",
  "https://cricketstoreonline.myshopify.com",
  "https://szf6kwy2dls7x8nw-62411112615.shopifypreview.com",
];

const corsOptions = {
  origin: (origin, callback) => {
    console.log("🌍 Incoming origin:", origin); 
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log("Not allowed by CORS: ", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use('/',productRoute)
app.use('/',collectionRoute)
app.use('/',locationRoute)


const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
