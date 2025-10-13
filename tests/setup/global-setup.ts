async function globalSetup(config: any) {
  // Set environment variables for testing if not already set
  if (!process.env.VITE_DIGITRANSIT_KEY) {
    process.env.VITE_DIGITRANSIT_KEY = "test-key";
    console.log("🧪 Set VITE_DIGITRANSIT_KEY=test-key for testing");
  }

  // Log test environment info
  console.log("🚀 Starting test environment");
  console.log(`📍 Base URL: ${config.projects[0]?.use?.baseURL || "Not set"}`);
  console.log(
    `🔑 Digitransit key: ${process.env.VITE_DIGITRANSIT_KEY ? "Set" : "Not set"}`,
  );
}

export default globalSetup;
