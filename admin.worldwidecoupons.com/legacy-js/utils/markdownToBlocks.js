const markdownToBlocks = (markdown) => {
  const lines = markdown.split("\n");
  const blocks = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", level: 2, value: line.replace("## ", "") });
    } else if (line.startsWith("### ")) {
      blocks.push({ type: "heading", level: 3, value: line.replace("### ", "") });
    } else {
      blocks.push({ type: "text", value: line });
    }
  }

  return blocks;
};

module.exports = { markdownToBlocks };
