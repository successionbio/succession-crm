import { type Manifest } from 'twenty-shared/application';

export const resolveManifestAssetUrls = (
  manifest: Manifest,
  urlBuilder: (filePath: string) => string,
): Manifest => {
  return {
    ...manifest,
    application: {
      ...manifest.application,
      logoUrl: manifest.application.logoUrl
        ? urlBuilder(manifest.application.logoUrl)
        : undefined,
      screenshots: (manifest.application.screenshots ?? []).map(urlBuilder),
    },
  };
};
