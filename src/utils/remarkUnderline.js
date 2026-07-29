export default function remarkUnderline() {
  return (tree) => {
    const replacements = [];

    function walk(node, index, parent) {
      if (node.type === "text") {
        const parts = [];
        let last = 0;
        const re = /\+\+(.+?)\+\+/g;
        let m;
        while ((m = re.exec(node.value)) !== null) {
          if (m.index > last) parts.push({ type: "text", value: node.value.slice(last, m.index) });
          parts.push({
            type: "text",
            value: m[1],
            data: { hName: "u", hProperties: {} },
          });
          last = m.index + m[0].length;
        }
        if (last < node.value.length) parts.push({ type: "text", value: node.value.slice(last) });
        if (parts.length > 1) replacements.push({ parent, index, children: parts });
      }
      if (node.children) node.children.forEach((c, i) => walk(c, i, node));
    }

    walk(tree, null, null);

    for (const { parent, index, children } of replacements.reverse()) {
      parent.children.splice(index, 1, ...children);
    }
  };
}
