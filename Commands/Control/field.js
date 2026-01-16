const { Command } = require("reconlx");
const fs = require("fs");
const path = require("path");
var ks = require("node-key-sender");

let config;
try {
    config = require("../../settings/config.local.json");
} catch (e) {
    config = require("../../settings/config.json");
}

const NATRO_PATH = config.natro;
const NM_CONFIG_PATH = path.join(NATRO_PATH, "settings", "nm_config.ini");
const FIELD_CONFIG_PATH = path.join(NATRO_PATH, "settings", "field_config.ini");


const VALID_FIELDS = [
  "Bamboo","Blue Flower","Cactus","Clover","Coconut","Dandelion",
  "Mountain Top","Mushroom","Pepper","Pine Tree","Pineapple","Pumpkin",
  "Rose","Spider","Strawberry","Stump","Sunflower"
];

// Default fallback values
const FALLBACKS = {
  camera: "None",
  convert: "Walk",
  distance: "1",
  drift: "0",
  gathertime: "10",
  invertFB: "0",
  invertLR: "0",
  pattern: "Stationary",
  percent: "95",
  shiftlock: "0",
  size: "S",
  sprinkler: "Center",
  turns: "1",
  width: "1"
};

// Helper: update key=value in INI
function setValue(config, key, value) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  return config.replace(regex, `${key}=${value}`);
}

// Simple INI parser for [Section] blocks
function parseINI(content) {
  const sections = {};
  let currentSection = null;
  content.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith(";")) return;
    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      sections[currentSection] = {};
    } else if (currentSection) {
      const kv = line.split('=');
      if (kv.length === 2) sections[currentSection][kv[0].trim()] = kv[1].trim();
    }
  });
  return sections;
}

// Map field_config -> nm_config slot 1, with fallbacks
function mapFieldConfigToGather(fieldDefaults) {
  return {
    FieldPattern1: fieldDefaults.pattern || FALLBACKS.pattern,
    FieldPatternSize1: fieldDefaults.size || FALLBACKS.size,
    FieldReturnType1: fieldDefaults.convert || FALLBACKS.convert,
    FieldRotateDirection1: fieldDefaults.camera || FALLBACKS.camera,
    FieldRotateTimes1: fieldDefaults.turns || FALLBACKS.turns,
    FieldSprinklerLoc1: fieldDefaults.sprinkler || FALLBACKS.sprinkler,
    FieldSprinklerDist1: fieldDefaults.distance || FALLBACKS.distance,
    FieldPatternInvertFB1: fieldDefaults.invertFB || FALLBACKS.invertFB,
    FieldPatternInvertLR1: fieldDefaults.invertLR || FALLBACKS.invertLR,
    FieldUntilPack1: fieldDefaults.percent || FALLBACKS.percent,
    FieldPatternShift1: fieldDefaults.shiftlock || FALLBACKS.shiftlock,
    FieldPatternReps1: fieldDefaults.gathertime || FALLBACKS.gathertime
  };
}

module.exports = new Command({
  name: 'field',
  description: 'Switch the active gathering field with defaults from field_config.ini',
  userPermissions: ['SEND_MESSAGES'],
  category: "Control",
  options: [
    {
      name: 'name',
      description: 'Field to gather in (case sensitive)',
      type: 3, // STRING
      required: true
    }
  ],

  run: async ({ interaction }) => {
    const field = interaction.options.getString("name");

    if (!VALID_FIELDS.includes(field)) {
      await interaction.followUp(`Unknown field: "${field}". Valid fields:\n${VALID_FIELDS.join(', ')}`);
      return;
    }

    await interaction.followUp(`Switching field to ${field} with defaults from field_config.ini`);

    
    ks.sendKey('f3');

    // Read configs
    let nmConfig, fieldConfig;
    try {
      nmConfig = fs.readFileSync(NM_CONFIG_PATH, "utf8");
      fieldConfig = fs.readFileSync(FIELD_CONFIG_PATH, "utf8");
    } catch (err) {
      await interaction.followUp(`Failed to read config files: ${err.message}`);
      return;
    }

    const sections = parseINI(fieldConfig);
    if (!sections[field]) {
      await interaction.followUp(`Could not find defaults for field "${field}" in field_config.ini`);
      return;
    }

    const gatherDefaults = mapFieldConfigToGather(sections[field]);

    // Update nm_config slot 1
    nmConfig = setValue(nmConfig, "CurrentFieldNum", "1");
    nmConfig = setValue(nmConfig, "FieldName1", field);

    Object.entries(gatherDefaults).forEach(([k,v]) => {
      nmConfig = setValue(nmConfig, k, v);
    });

    fs.writeFileSync(NM_CONFIG_PATH, nmConfig);

    await interaction.followUp(`Field switched to ${field} with defaults applied`);
  }
});
