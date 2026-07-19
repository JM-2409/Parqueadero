import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key) => ({ url, key }))
}));

describe('Supabase Client Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('configures correctly with valid environment variables', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key';

    const { isSupabaseConfigured, supabase } = await import('./supabase');

    expect(isSupabaseConfigured).toBe(true);
    expect(createClient).toHaveBeenCalledWith(
      'https://valid-project.supabase.co',
      'valid-anon-key'
    );
  });

  it('trims whitespace from environment variables', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '  https://valid-project.supabase.co  ';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '  valid-anon-key  ';

    const { isSupabaseConfigured } = await import('./supabase');

    expect(isSupabaseConfigured).toBe(true);
    expect(createClient).toHaveBeenCalledWith(
      'https://valid-project.supabase.co',
      'valid-anon-key'
    );
  });

  it('treats literal "undefined" and "null" as empty strings', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'undefined';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'null';

    const { isSupabaseConfigured } = await import('./supabase');

    expect(isSupabaseConfigured).toBe(false);
    expect(createClient).toHaveBeenCalledWith(
      'https://placeholder.supabase.co',
      'placeholder_key'
    );
  });

  it('adds https:// protocol if missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'my-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key';

    const { isSupabaseConfigured } = await import('./supabase');

    expect(isSupabaseConfigured).toBe(true);
    expect(createClient).toHaveBeenCalledWith(
      'https://my-project.supabase.co',
      'valid-anon-key'
    );
  });

  it('uses placeholders when variables are empty', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

    const { isSupabaseConfigured } = await import('./supabase');

    expect(isSupabaseConfigured).toBe(false);
    expect(createClient).toHaveBeenCalledWith(
      'https://placeholder.supabase.co',
      'placeholder_key'
    );
  });

  it('sets isSupabaseConfigured to false if url is the placeholder', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder_key';

    const { isSupabaseConfigured } = await import('./supabase');

    expect(isSupabaseConfigured).toBe(false);
    expect(createClient).toHaveBeenCalledWith(
      'https://placeholder.supabase.co',
      'placeholder_key'
    );
  });
});
