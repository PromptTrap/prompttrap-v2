import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

export const FileReadArgsSchema = z.object({
  path: z.string().describe('The path to the file to read'),
});

export const FileListArgsSchema = z.object({
  path: z.string().describe('The directory path to list'),
});

export const FileWriteArgsSchema = z.object({
  path: z.string().describe('The path to the file to write'),
  content: z.string().describe('The content to write to the file'),
});

/**
 * Read a file and return its contents
 */
export async function fileRead(args: z.infer<typeof FileReadArgsSchema>): Promise<string> {
  const content = await fs.readFile(args.path, 'utf-8');
  return content;
}

/**
 * List files in a directory
 */
export async function fileList(args: z.infer<typeof FileListArgsSchema>): Promise<string> {
  const files = await fs.readdir(args.path, { withFileTypes: true });

  const results = files.map(file => {
    const type = file.isDirectory() ? 'dir' : 'file';
    return `${type}: ${file.name}`;
  });

  return results.join('\n');
}

/**
 * Write content to a file
 */
export async function fileWrite(args: z.infer<typeof FileWriteArgsSchema>): Promise<string> {
  await fs.writeFile(args.path, args.content, 'utf-8');
  return `Successfully wrote ${args.content.length} bytes to ${args.path}`;
}
