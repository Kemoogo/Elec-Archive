import { readdir, stat, unlink, mkdir, rename, copyFile } from "fs/promises";
import path from "path";

/**
 * Removes temporary MDB files older than maxAgeHours from the temporary upload directory.
 */
export async function cleanupStaleTempFiles(
  dirPath: string,
  maxAgeHours = 2
): Promise<number> {
  try {
    const files = await readdir(dirPath);
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const file of files) {
      if (!file.startsWith("mdb-")) continue;

      const filePath = path.join(dirPath, file);
      try {
        const fileStat = await stat(filePath);
        if (now - fileStat.mtimeMs > maxAgeMs) {
          await unlink(filePath);
          cleanedCount++;
        }
      } catch {
        // Ignore single file stat or unlink failure
      }
    }

    return cleanedCount;
  } catch {
    // Directory might not exist yet, return 0
    return 0;
  }
}

/**
 * Safely moves a file to a destination directory, creating destination directory
 * if needed and falling back to copy+unlink if rename fails across file systems.
 */
export async function safeMoveFile(
  srcPath: string,
  destDir: string,
  fileName: string
): Promise<string> {
  await mkdir(destDir, { recursive: true });
  const destPath = path.join(destDir, fileName);

  try {
    await rename(srcPath, destPath);
  } catch {
    // Fallback to copy and unlink (e.g. if across mount boundaries / Docker volumes)
    await copyFile(srcPath, destPath);
    try {
      await unlink(srcPath);
    } catch {
      // Ignore source deletion failure if already moved
    }
  }

  return destPath;
}
