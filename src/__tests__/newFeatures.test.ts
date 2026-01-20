import fs from "fs";
import { cli } from "./cli";
import path from "path";

const tmpDir = process.platform === "win32" ? process.env.TEMP : "/tmp";
const testFromfileInput = path.join(tmpDir!, "test_fromfile_input.txt");

test("Should be able to generate tree from file list with --fromfile", () => {
  // Create a test file with paths
  const testPaths = [
    "src/index.ts",
    "src/utils/utils.ts",
    "src/types/settingsType.ts",
  ];
  fs.writeFileSync(testFromfileInput, testPaths.join("\n"));
  
  const result = cli(["--fromfile", testFromfileInput]);
  
  // Verify the output contains expected structure
  expect(result).toContain("src");
  expect(result).toContain("index.ts");
  expect(result).toContain("utils");
  expect(result).toContain("utils.ts");
  expect(result).toContain("types");
  expect(result).toContain("settingsType.ts");
  
  // Cleanup
  fs.unlinkSync(testFromfileInput);
});

test("Should be able to generate tree with sizes using --du", () => {
  const result = cli(["--du", "src/__tests__/testStructure"]);
  
  // Verify the output contains size markers
  expect(result).toContain("[");
  expect(result).toContain("]");
  
  // Verify the output contains expected files
  expect(result).toContain("LICENSE");
  expect(result).toContain("README.md");
});
