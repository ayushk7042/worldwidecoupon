const slugifyLib = require("slugify");

const slugify = (text) => {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    trim: true
  });
};

module.exports = slugify;
