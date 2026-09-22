const extractTags = (title, content) => {
  const words = (title + " " + content)
    .toLowerCase()
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ");

  const blacklist = ["the", "is", "and", "of", "to", "in", "for", "on", "with"];
  const freq = {};

  words.forEach(word => {
    if (word.length > 4 && !blacklist.includes(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  });

  return Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 10);
};

module.exports = { extractTags };
