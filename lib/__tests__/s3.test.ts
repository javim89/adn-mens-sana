// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { sendMock, getSignedUrlMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = sendMock;
  }
  class PutObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  class GetObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  class DeleteObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  class HeadObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  return { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
}));

const S3_ENV = {
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'bucket-test',
  S3_ACCESS_KEY_ID: 'AKIATEST',
  S3_SECRET_ACCESS_KEY: 'secret',
};

// El cliente S3 es un singleton de módulo: se reimporta en cada test para aislar el env.
async function loadS3() {
  vi.resetModules();
  return import('@/lib/s3');
}

describe('lib/s3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const [k, v] of Object.entries(S3_ENV)) vi.stubEnv(k, v);
    getSignedUrlMock.mockResolvedValue('https://signed.example/url');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('createUploadUrl', () => {
    it('returns a signed PUT url and a deportistas/<uuid>.<ext> key', async () => {
      const { createUploadUrl, isValidFotoKey } = await loadS3();

      const result = await createUploadUrl({ contentType: 'image/png', size: 1024 });

      expect(result.uploadUrl).toBe('https://signed.example/url');
      expect(result.key).toMatch(/^deportistas\/[0-9a-f-]{36}\.png$/);
      expect(isValidFotoKey(result.key)).toBe(true);

      const [, command, options] = getSignedUrlMock.mock.calls[0];
      expect(command.input).toEqual({
        Bucket: 'bucket-test',
        Key: result.key,
        ContentType: 'image/png',
        ContentLength: 1024,
      });
      expect(options.expiresIn).toBe(300);
      expect(options.signableHeaders).toEqual(new Set(['content-type', 'content-length']));
    });

    it.each([
      ['image/jpeg', 'jpg'],
      ['image/webp', 'webp'],
    ])('maps %s to .%s', async (contentType, ext) => {
      const { createUploadUrl } = await loadS3();
      const { key } = await createUploadUrl({ contentType, size: 10 });
      expect(key.endsWith(`.${ext}`)).toBe(true);
    });

    it('rejects a content type outside the whitelist', async () => {
      const { createUploadUrl } = await loadS3();
      await expect(createUploadUrl({ contentType: 'application/pdf', size: 10 })).rejects.toThrow(
        /Tipo de archivo/,
      );
      expect(getSignedUrlMock).not.toHaveBeenCalled();
    });

    it('rejects files larger than 5 MB', async () => {
      const { createUploadUrl } = await loadS3();
      await expect(
        createUploadUrl({ contentType: 'image/png', size: 5 * 1024 * 1024 + 1 }),
      ).rejects.toThrow(/5 MB/);
    });

    it('rejects empty files', async () => {
      const { createUploadUrl } = await loadS3();
      await expect(createUploadUrl({ contentType: 'image/png', size: 0 })).rejects.toThrow();
    });

    it('throws when S3 env vars are missing', async () => {
      vi.stubEnv('S3_BUCKET', '');
      const { createUploadUrl } = await loadS3();
      await expect(createUploadUrl({ contentType: 'image/png', size: 10 })).rejects.toThrow(
        /S3 no está configurado/,
      );
    });
  });

  describe('isValidFotoKey', () => {
    it.each([
      ['deportistas/123e4567-e89b-12d3-a456-426614174000.jpg', true],
      ['deportistas/123e4567-e89b-12d3-a456-426614174000.webp', true],
      ['deportistas/123e4567-e89b-12d3-a456-426614174000.gif', false],
      ['otros/123e4567-e89b-12d3-a456-426614174000.jpg', false],
      ['deportistas/../secret.jpg', false],
      ['', false],
      [null, false],
      [42, false],
    ])('isValidFotoKey(%s) === %s', async (key, expected) => {
      const { isValidFotoKey } = await loadS3();
      expect(isValidFotoKey(key)).toBe(expected);
    });
  });

  describe('getFotoUrl', () => {
    it('returns null when there is no key', async () => {
      const { getFotoUrl } = await loadS3();
      expect(await getFotoUrl(null)).toBeNull();
      expect(await getFotoUrl(undefined)).toBeNull();
      expect(getSignedUrlMock).not.toHaveBeenCalled();
    });

    it('returns a 1h signed GET url for a key', async () => {
      const { getFotoUrl } = await loadS3();
      const url = await getFotoUrl('deportistas/x.jpg');

      expect(url).toBe('https://signed.example/url');
      const [, command, options] = getSignedUrlMock.mock.calls[0];
      expect(command.input).toEqual({ Bucket: 'bucket-test', Key: 'deportistas/x.jpg' });
      expect(options.expiresIn).toBe(3600);
    });

    it('returns null instead of throwing when S3 env vars are missing', async () => {
      vi.stubEnv('S3_REGION', '');
      const { getFotoUrl } = await loadS3();
      expect(await getFotoUrl('deportistas/x.jpg')).toBeNull();
    });
  });

  describe('fotoExiste', () => {
    it('returns true when HeadObject succeeds', async () => {
      const { fotoExiste } = await loadS3();
      sendMock.mockResolvedValue({});

      expect(await fotoExiste('deportistas/x.jpg')).toBe(true);
      expect(sendMock.mock.calls[0][0].input).toEqual({ Bucket: 'bucket-test', Key: 'deportistas/x.jpg' });
    });

    it.each([
      ['NotFound name', Object.assign(new Error('nf'), { name: 'NotFound' })],
      ['NoSuchKey name', Object.assign(new Error('nsk'), { name: 'NoSuchKey' })],
      ['404 status', Object.assign(new Error('x'), { $metadata: { httpStatusCode: 404 } })],
    ])('returns false on %s', async (_label, error) => {
      const { fotoExiste } = await loadS3();
      sendMock.mockRejectedValue(error);

      expect(await fotoExiste('deportistas/x.jpg')).toBe(false);
    });

    it('rethrows other S3 errors (e.g. 403) instead of claiming the foto is missing', async () => {
      const { fotoExiste } = await loadS3();
      sendMock.mockRejectedValue(
        Object.assign(new Error('Forbidden'), { name: 'Forbidden', $metadata: { httpStatusCode: 403 } }),
      );

      await expect(fotoExiste('deportistas/x.jpg')).rejects.toThrow('Forbidden');
    });

    it('throws when S3 env vars are missing', async () => {
      vi.stubEnv('S3_ACCESS_KEY_ID', '');
      const { fotoExiste } = await loadS3();
      await expect(fotoExiste('deportistas/x.jpg')).rejects.toThrow(/S3 no está configurado/);
    });
  });

  describe('deleteFoto', () => {
    it('sends a DeleteObjectCommand for the key', async () => {
      const { deleteFoto } = await loadS3();
      sendMock.mockResolvedValue({});

      await deleteFoto('deportistas/x.jpg');

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.calls[0][0].input).toEqual({
        Bucket: 'bucket-test',
        Key: 'deportistas/x.jpg',
      });
    });

    it('does nothing without a key', async () => {
      const { deleteFoto } = await loadS3();
      await deleteFoto(null);
      expect(sendMock).not.toHaveBeenCalled();
    });

    it('swallows S3 errors (best-effort)', async () => {
      const { deleteFoto } = await loadS3();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      sendMock.mockRejectedValue(new Error('boom'));

      await expect(deleteFoto('deportistas/x.jpg')).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
