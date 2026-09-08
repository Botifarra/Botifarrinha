const { load, save } = require("./db");

const NAME = "suggestionsGroup";

// Guarda un solo grupo: el que se define con .set_sug.
function getSuggestionsGroup() {
  return load(NAME, null);
}

function setSuggestionsGroup(groupId) {
  save(NAME, groupId);
  return groupId;
}

module.exports = { getSuggestionsGroup, setSuggestionsGroup };
