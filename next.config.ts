import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // A pet-képeket alapból a public/images/pets/ mappából töltjük.
  // Ha külső (pl. wiki) képeket akarsz linkelni, vedd ki a kommentet
  // és írd be a wiki domainjét:
  //
  // images: {
  //   remotePatterns: [
  //     { protocol: 'https', hostname: 'wiki.pelda-szerver.hu' },
  //   ],
  // },
};

export default nextConfig;
