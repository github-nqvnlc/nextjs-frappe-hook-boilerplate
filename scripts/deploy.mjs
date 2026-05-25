import { execSync } from "child_process";
import { readFileSync } from "fs";

// Read .env.production directly
const envPath = "./.env.production";
let envVars = {};

try {
  const envContent = readFileSync(envPath, "utf8");
  
  // Parse .env.production file
  envVars = envContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .reduce((acc, line) => {
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=").trim();
      if (key && value) {
        acc[key.trim()] = value;
      }
      return acc;
    }, {});
} catch (err) {
  console.error(`❌ Could not read ${envPath}:`, err.message);
  process.exit(1);
}

// Log environment
console.log("🚀 Deploying with environment:");
Object.entries(envVars).forEach(([key, value]) => {
  const displayValue = key.includes("PASSWORD") || key.includes("SECRET") || key.includes("KEY") || key.includes("TOKEN")
    ? "***"
    : value;
  console.log(`   ${key}: ${displayValue}`);
});

// Build
console.log("\n📦 Building Next.js app...");
execSync("npm run build", { stdio: "inherit" });

// Build wrangler deploy command with all vars
const deployVars = Object.entries(envVars)
  .map(([key, value]) => `--var ${key}:"${value}"`);

// Deploy
console.log("\n☁️  Deploying to Cloudflare Workers...");
let deployCmd = "./node_modules/.bin/wrangler deploy";
if (deployVars.length > 0) {
  deployCmd += " " + deployVars.join(" ");
}

execSync(deployCmd, { stdio: "inherit" });
console.log("\n✅ Deploy complete!");
