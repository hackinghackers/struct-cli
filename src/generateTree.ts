import * as fs from "fs";
import glob from "glob";
import path from "path";
import { execSync } from "child_process";
import { TreeType, treeJsonToString } from "@structure-codes/utils";
import { getConfigPath, validatePath } from "./utils/utils";
import { addSizesToTree, treeWithSizesToString } from "./utils/treeWithSizes";

const getDefaults = () => {
  const configPath = getConfigPath();
  if (!configPath) return [];
  try {
    const config = fs.readFileSync(configPath).toString();
    return JSON.parse(config);
  } catch (err) {
    console.warn("Could not find config file at:" + configPath);
    return [];
  }
};

type GlobOptionsProps = {
  parentDir: string;
  ignored: string[];
  configIgnore: boolean;
};

const globOptions = ({ parentDir, ignored, configIgnore }: GlobOptionsProps) => {
  const config = getDefaults();
  const defaultIgnore = configIgnore ? [] : config.ignored;
  const mergedIgnore = [...ignored, ...defaultIgnore].map((path) => `${parentDir}/**/${path}/**`);
  return {
    dot: true,
    ignore: mergedIgnore,
    strict: false,
  };
};

type OptionsType = {
  silent: boolean;
  json: boolean;
  output: string;
  editor: boolean;
  ignore: string[];
  configIgnore: boolean;
  dirOnly: boolean;
  fromfile: boolean;
  du: boolean;
};

export const generateTree = (directory: string, options: OptionsType) => {
  const { silent, json, output, editor, ignore: ignored, configIgnore, dirOnly, fromfile, du } = options;
  
  // When --fromfile is used, the directory argument is a file containing paths
  if (fromfile) {
    if (!validatePath(directory, "file")) return;
    const fileContent = fs.readFileSync(directory, "utf8");
    const paths = fileContent.split("\n").filter(line => line.trim() !== "");
    
    const tree: TreeType[] = [];
    let _index = 0;
    
    paths.forEach((filePath) => {
      const normalizedPath = filePath.trim().replace(/\\/g, "/");
      const levels = normalizedPath.split("/");
      let curr: TreeType[] = tree;
      
      levels.forEach((level) => {
        if (!level) return;
        
        const branch = curr.find((leaf) => leaf.name === level);
        if (branch) return (curr = branch.children);
        curr.push({
          name: level,
          children: [],
          _index,
        });
        _index++;
        curr = curr[curr.length - 1].children;
      });
    });
    
    const treeString = treeJsonToString({ tree });
    
    if (output) {
      if (!silent) console.info(`Writing data to ${output}`);
      fs.writeFileSync(output, treeString);
    }
    
    if (!silent && json) {
      console.info(JSON.stringify(tree, null, 2));
    } else if (!silent) {
      console.info(treeString);
    }
    
    if (editor) {
      try {
        execSync("code --help");
      } catch {
        return console.warn("Could not find code binary on path.");
      }
      const tmpDir = process.platform === "win32" ? process.env.TEMP : "/tmp";
      const tmpFile = `fromfile_${Date.now()}.tree`;
      const tmpPath = tmpDir + "/" + tmpFile;
      fs.writeFileSync(tmpPath, treeString);
      execSync(`code ${tmpPath}`);
    }
    
    return;
  }
  
  if (!validatePath(directory, "dir")) return;
  const absolutePath = path.resolve(directory).replace(/\\/g, "/");
  const searchPath = `${absolutePath}/**/*${dirOnly ? "/" : ""}`;
  glob(
    searchPath,
    globOptions({ parentDir: absolutePath, ignored, configIgnore }),
    (err, matches) => {
      if (err) {
        return console.error(`Error searching for files in ${absolutePath}`);
      }
      if (!matches) {
        return console.error("No matches found");
      }
      const tree: TreeType[] = [];
      let _index = 0;
      matches.forEach((match) => {
        const path = match.replace(absolutePath, "");
        const levels = path.split("/");
        let curr: TreeType[] = tree;
        levels.forEach((level) => {
          // Avoid empty strings
          if (!level) return;

          // Generate tree json structure
          const branch = curr.find((leaf) => leaf.name === level);
          if (branch) return (curr = branch.children);
          curr.push({
            name: level,
            children: [],
            _index,
          });
          _index++;
          curr = curr[curr.length - 1].children;
        });
      });
      
      // Add size information if --du is enabled
      const finalTree = du ? addSizesToTree(tree, absolutePath) : tree;
      const treeString = du ? treeWithSizesToString(finalTree) : treeJsonToString({ tree });

      if (output) {
        if (!silent) console.info(`Writing data to ${output}`);
        fs.writeFileSync(output, treeString);
      }

      if (!silent && json) {
        console.info(JSON.stringify(finalTree, null, 2));
      } else if (!silent) {
        console.info(treeString);
      }

      // Open generated tree in vscode if the user has it installed
      if (editor) {
        try {
          execSync("code --help");
        } catch {
          return console.warn("Could not find code binary on path.");
        }
        const tmpDir = process.platform === "win32" ? process.env.TEMP : "/tmp";
        const tmpFile = `${path.basename(absolutePath)}_${Date.now()}.tree`;
        const tmpPath = tmpDir + "/" + tmpFile;
        fs.writeFileSync(tmpPath, treeString);
        execSync(`code ${tmpPath}`);
      }
    }
  );
};
