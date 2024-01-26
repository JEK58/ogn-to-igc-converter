import fs from "fs";
import IGCParser from "igc-parser";

let result = IGCParser.parse(fs.readFileSync("2016CA-250124.igc", "utf8"));
console.log("🚀 ~ result:", result);

console.log("done");
