const catalog = require('../config/treatments.json');
if (catalog.some(item => !Number.isInteger(item.duration_minutes) || item.duration_minutes < 1 || item.duration_minutes > 540)) throw new Error('Invalid treatment duration configuration.');
function selectTreatments(input, legacy) {
  const names = input === undefined ? [legacy] : input;
  if (!Array.isArray(names) || !names.length || names.length > catalog.length || new Set(names).size !== names.length)
    throw Object.assign(new Error('Choose one or more distinct treatments.'), { status: 400 });
  const selected = names.map(name => catalog.find(item => item.name === name));
  if (selected.some(item => !item)) throw Object.assign(new Error('Choose treatments from the available list.'), { status: 400 });
  return { service: selected.map(item => item.name).join('; '), treatments: selected,
    duration_minutes: selected.reduce((sum, item) => sum + item.duration_minutes, 0) };
}
module.exports = { catalog, selectTreatments };
