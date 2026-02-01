import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';
export const alt = 'SignalsLoop - AI-Native Product OS for Modern Product Teams';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  // Read the static OG image from public folder
  const imageData = await readFile(join(process.cwd(), 'public', 'og-image.png'));
  const base64Image = imageData.toString('base64');
  const imageSrc = `data:image/png;base64,${base64Image}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <img
          src={imageSrc}
          alt="SignalsLoop"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
