import fs from 'node:fs';
import path from 'node:path';

export type AtomicWriteContent = string | NodeJS.ArrayBufferView;
export type AtomicWriteOptions = fs.WriteFileOptions | BufferEncoding;

function parseOptions(options?: AtomicWriteOptions): {
  encoding?: BufferEncoding;
  mode?: number;
} {
  let encoding: BufferEncoding | undefined = 'utf8';
  let mode: number | undefined = undefined;

  if (typeof options === 'string') {
    encoding = options as BufferEncoding;
  } else if (options && typeof options === 'object') {
    if ('encoding' in options && options.encoding) {
      encoding = options.encoding as BufferEncoding;
    }
    if ('mode' in options && typeof options.mode === 'number') {
      mode = options.mode;
    }
  }

  return { encoding, mode };
}

/**
 * Synchronously writes data to a file atomically by writing to a temporary file
 * in the same directory, flushing it to physical storage with fsync, and renaming it over
 * the target file. This prevents file corruption and 0-byte truncation on unexpected termination.
 */
export function atomicWriteFileSync(
  filePath: string,
  content: AtomicWriteContent,
  options?: AtomicWriteOptions
): void {
  const resolvedPath = path.resolve(filePath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const { encoding, mode } = parseOptions(options);
  const tempPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  let fd: number | undefined;
  let renamed = false;

  try {
    fd = fs.openSync(tempPath, 'w', mode);
    if (typeof content === 'string') {
      fs.writeFileSync(fd, content, { encoding });
    } else {
      fs.writeFileSync(fd, content);
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;

    let attempts = 0;
    while (!renamed) {
      try {
        fs.renameSync(tempPath, resolvedPath);
        renamed = true;
      } catch (renameErr: any) {
        attempts++;
        if ((renameErr.code === 'EPERM' || renameErr.code === 'EACCES' || renameErr.code === 'EBUSY') && attempts <= 5) {
          const end = Date.now() + 10;
          while (Date.now() < end) {
            // Spin wait
          }
          continue;
        }
        throw renameErr;
      }
    }
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
    if (!renamed && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
  }
}

/**
 * Asynchronously writes data to a file atomically by writing to a temporary file
 * in the same directory, syncing to physical storage, and renaming it over the target file.
 */
export async function atomicWriteFile(
  filePath: string,
  content: AtomicWriteContent,
  options?: AtomicWriteOptions
): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  const dir = path.dirname(resolvedPath);

  await fs.promises.mkdir(dir, { recursive: true });

  const { encoding, mode } = parseOptions(options);
  const tempPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  let handle: fs.promises.FileHandle | undefined;
  let renamed = false;

  try {
    handle = await fs.promises.open(tempPath, 'w', mode);
    if (typeof content === 'string') {
      await handle.writeFile(content, encoding);
    } else {
      await handle.writeFile(content);
    }
    await handle.sync();
    await handle.close();
    handle = undefined;

    let attempts = 0;
    while (!renamed) {
      try {
        await fs.promises.rename(tempPath, resolvedPath);
        renamed = true;
      } catch (renameErr: any) {
        attempts++;
        if ((renameErr.code === 'EPERM' || renameErr.code === 'EACCES' || renameErr.code === 'EBUSY') && attempts <= 5) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          continue;
        }
        throw renameErr;
      }
    }
  } finally {
    if (handle) {
      try {
        await handle.close();
      } catch {}
    }
    if (!renamed && fs.existsSync(tempPath)) {
      try {
        await fs.promises.unlink(tempPath);
      } catch {}
    }
  }
}
