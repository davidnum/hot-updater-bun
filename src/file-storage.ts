import { BunFile } from 'bun';
import { join } from 'path';

export class FileStorage {
  constructor(private readonly uploadsDir: string) {}

  public saveFile = async (bundleId: string, file: File): Promise<void> => {
    const filePath = join(this.uploadsDir, bundleId);
    Bun.write(filePath, file);
  };

  public deleteFile = async (bundleId: string): Promise<void> => {
    const filePath = join(this.uploadsDir, bundleId);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      await file.delete();
    }
  };

  public getFile = async (bundleId: string): Promise<BunFile | null> => {
    const filePath = join(this.uploadsDir, bundleId);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return file;
    }
    return null;
  };
}
