export function convertLatToDMM(decimalDegrees: number): string {
  const abs = Math.abs(decimalDegrees);
  const degrees = Math.floor(abs);
  const minutes = ((abs - degrees) * 60).toFixed(3);
  const direction = decimalDegrees >= 0 ? "N" : "S";

  return `${degrees.toString().padStart(2, "0")}${minutes
    .replace(".", "")
    .padStart(5, "0")}${direction}`;
}

export function convertLonToDMM(decimalDegrees: number): string {
  const abs = Math.abs(decimalDegrees);
  const DDD = Math.floor(abs);
  const minutes = ((abs - DDD) * 60).toString();
  const [MM, mmm] = minutes.split(".");

  const direction = decimalDegrees >= 0 ? "E" : "W";

  return `${DDD.toString().padStart(3, "0")}${MM.padStart(2, "0")}${mmm
    .slice(0, 3)
    .padStart(3, "0")}${direction}`;
}
