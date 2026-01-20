import * as fs from "fs";
import path from "path";
import { TreeType } from "@structure-codes/utils";

// Extended TreeType to include size
interface TreeTypeWithSize extends TreeType {
  size?: number;
  children: TreeTypeWithSize[];
}

/**
 * Compute size of a file or directory in bytes
 */
export const computeSize = (filePath: string): number => {
  try {
    const stats = fs.lstatSync(filePath);
    if (stats.isFile()) {
      return stats.size;
    } else if (stats.isDirectory()) {
      let totalSize = stats.size;
      const files = fs.readdirSync(filePath);
      files.forEach((file) => {
        const fullPath = path.join(filePath, file);
        totalSize += computeSize(fullPath);
      });
      return totalSize;
    }
    return 0;
  } catch (err) {
    return 0;
  }
};

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0";
  const k = 1024;
  const sizes = ["", "K", "M", "G", "T"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  
  // Format with appropriate precision
  const formatted = i === 0 ? Math.round(value).toString() : value.toFixed(1);
  return `${formatted}${sizes[i]}`;
};

/**
 * Add size information to tree nodes
 */
export const addSizesToTree = (tree: TreeType[], basePath: string): TreeTypeWithSize[] => {
  return tree.map(node => {
    const fullPath = path.join(basePath, node.name);
    const size = computeSize(fullPath);
    return {
      ...node,
      size,
      children: node.children.length > 0 ? addSizesToTree(node.children, fullPath) : []
    };
  });
};

/**
 * Convert tree with sizes to string format
 */
export const treeWithSizesToString = (tree: TreeTypeWithSize[], tabChar: string = "  "): string => {
  let result = "";
  
  const buildString = (nodes: TreeTypeWithSize[], indent: boolean[]): void => {
    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1;
      
      // Build the indentation prefix
      let prefix = "";
      indent.forEach((isLastInLevel) => {
        prefix += isLastInLevel ? tabChar : `│${tabChar}`;
      });
      prefix += isLast ? "└── " : "├── ";
      
      // Format size with fixed width for alignment
      const sizeStr = node.size !== undefined ? `[${formatBytes(node.size).padStart(10)}]  ` : "";
      
      result += `${sizeStr}${prefix}${node.name}\n`;
      
      // Recurse for children
      if (node.children.length > 0) {
        buildString(node.children, [...indent, isLast]);
      }
    });
  };
  
  buildString(tree, []);
  return result.replace(/\n$/, "");
};
