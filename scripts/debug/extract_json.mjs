import fs from 'fs';

const inputFile = 'SECAO6_LOCAL.json';
const outputFile = 'SECAO6_LOCAL.json';

try {
    const content = fs.readFileSync(inputFile, 'utf-8');

    // Find the JSON block
    const jsonStart = content.indexOf('### JSON_BEGIN');
    const jsonEnd = content.indexOf('### JSON_END');

    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Could not find JSON markers in file.");
    }

    // Extract everything between [ and ] inside the block
    // A safer way knowing the markers:
    // Marker is "### JSON_BEGIN\n["

    const substring = content.substring(jsonStart, jsonEnd);
    const startBracket = substring.indexOf('[');
    const lastBracket = substring.lastIndexOf(']');

    if (startBracket === -1 || lastBracket === -1) {
        throw new Error("Could not find JSON array brackets.");
    }

    const jsonStr = substring.substring(startBracket, lastBracket + 1);

    // Validate JSON
    JSON.parse(jsonStr);
    console.log("✅ JSON validated successfully.");

    fs.writeFileSync(outputFile, jsonStr);
    console.log(`💾 Clean JSON saved to ${outputFile}`);

} catch (err) {
    console.error("💥 Error extracting JSON:", err);
}
