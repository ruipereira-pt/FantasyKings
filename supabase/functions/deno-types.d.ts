// Type declarations for Deno runtime
// These files run in Deno, not Node.js, so TypeScript Node won't understand them
// This file suppresses TypeScript errors for Deno-specific syntax

declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
  
  interface Env {
    get(key: string): string | undefined;
  }
  
  const env: Env;
}

// Declare npm: imports as valid
declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "npm:uuid@9" {
  export function v4(): string;
}

// Declare JSR imports
declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {}

