import knex from "knex";
import wkx from "wkx";
import { convertLatToDMM, convertLonToDMM } from "./utils/converter";
import type { Point } from "geojson";
import type { SenderPosition } from "./types/common";

process.env.TZ = "UTC";

const db = knex({
  client: "pg",
  connection: process.env.DATABASE_URL,
  searchPath: ["knex", "public"],
});

// const searchAddress = "2016CA";
const searchAddress = "FD6A5A";
const searchInterval = 30; // hours

if (!searchAddress) {
  console.log("No address provided");
  process.exit(1);
}

const fixes = await db<SenderPosition>("sender_positions")
  .select("*")
  .where({ address: searchAddress })
  .andWhereRaw(`"timestamp" > NOW() - INTERVAL '${searchInterval} HOURS'`)
  .orderBy("timestamp", "asc");

if (fixes.length === 0) {
  console.log("No fixes found");
  process.exit(1);
}

/**
 * Missing:
 * HFFTYFRTYPE: Manufacturer, Model
 * HFGPSMarconiCanada: Superstar,12ch, max10000m
 * HFPRSPRESSALTSENSOR: Sensyn, XYZ1111, max11000m CR LF
 * HFCCLCOMPETITIONCLASS:15m Motor Glider
 *
 * I033638FXA3940SIU4143ENL (note: I corrected a TYPO from the original document that had RPM on this record)
 */

const lines: string[] = [];

// Manufacturer Code (A XXX ABC FLIGHT:1)
lines.push("AXXXABC FLIGHT:1");

// UTC date of flight
const date = fixes[0].timestamp;
const year = date.getUTCFullYear().toString().slice(-2);
const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
const day = date.getUTCDate().toString().padStart(2, "0");
const formattedDate = `${day}${month}${year}`;

// const date = "DDMMYY";
lines.push(`HFDTE${formattedDate}`);

// Pilot in charge
const pilot = fixes[0].name;
lines.push(`HFPLTPILOTINCHARGE: ${pilot}`);

// Glider Type
const gliderType = "";
lines.push(`HFGTYGLIDERTYPE: ${gliderType}`);

// Glider ID
const gliderID = "";
lines.push(`HFGIDGLIDERID: ${gliderID}`);

// GPS Datum
const gpsDatum = "WGS-1984";
lines.push(`HFDTM100GPSDATUM: ${gpsDatum}`);

// Firmware Version
const firmwareVersion = "1.0";
lines.push(`HFRFWFIRMWAREVERSION: ${firmwareVersion}`);

// Hardware Version
const hardwareVersion = "1.0";
lines.push(`HFRHWHARDWAREVERSION: ${hardwareVersion}`);

// Competition ID
const competitionID = "XYZ-78910";
lines.push(`HFCIDCOMPETITIONID: ${competitionID}`);

fixes.forEach((fix) => {
  const timestamp = fix.timestamp
    .toUTCString()
    .split(" ")[4]
    .replaceAll(":", "");
  const buffer = Buffer.from(fix.location, "hex");
  const geometry = wkx.Geometry.parse(buffer).toGeoJSON() as Point;
  const [lon, lat] = geometry.coordinates;
  const latDMS = convertLatToDMM(+lat);
  const lonDMS = convertLonToDMM(+lon);

  if (latDMS.length != 8) throw new Error("Invalid DMS lat");
  if (lonDMS.length != 9) throw new Error("Invalid DMS lon");

  const gpsAlt = fix.altitude.toString().padStart(5, "0");
  const pressureAlt = "00000";
  const accuracy = "000";

  const bRecord = `B${timestamp}${latDMS}${lonDMS}A${pressureAlt}${gpsAlt}${accuracy}`;

  lines.push(bRecord);
});

console.log("FLARM ID:", fixes[0].address);
console.log("Date:", formattedDate);
console.log("Number of fixes:", fixes.length);

await Bun.write(`${fixes[0].address}-${formattedDate}.igc`, lines.join("\n"));
