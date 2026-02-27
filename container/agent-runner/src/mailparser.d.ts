declare module 'mailparser' {
  import { Readable } from 'stream';

  export interface ParsedMail {
    from?: { text: string };
    to?: { text: string };
    subject?: string;
    date?: Date;
    text?: string;
    html?: string;
  }

  export function simpleParser(
    stream: Readable,
    callback: (err: Error | undefined, parsed: ParsedMail) => void
  ): void;
}
