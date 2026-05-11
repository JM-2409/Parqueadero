const { execSync } = require("child_process");
try {
  execSync("npx prettier --write 'app/**/*.{tsx,ts}'", { stdio: "inherit" });
} catch(e) {
  console.log("Failed");
}
