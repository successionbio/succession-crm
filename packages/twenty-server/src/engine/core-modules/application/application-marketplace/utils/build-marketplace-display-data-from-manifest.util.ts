import { type Manifest } from 'twenty-shared/application';

import { type MarketplaceDisplayData } from 'src/engine/core-modules/application/application-marketplace/types/marketplace-display-data.type';
import { buildRegistryCdnUrl } from 'src/engine/core-modules/application/application-marketplace/utils/build-registry-cdn-url.util';

export const buildMarketplaceDisplayDataFromManifest = (params: {
  manifest: Manifest;
  packageName: string;
  version: string;
  cdnBaseUrl: string;
}): MarketplaceDisplayData => {
  const { manifest, packageName, version, cdnBaseUrl } = params;
  const app = manifest.application;

  return {
    icon: app.icon,
    version,
    category: app.category,
    logo: app.logoUrl
      ? buildRegistryCdnUrl({ cdnBaseUrl, packageName, version, filePath: app.logoUrl })
      : undefined,
    screenshots: (app.screenshots ?? []).map((filePath) =>
      buildRegistryCdnUrl({ cdnBaseUrl, packageName, version, filePath }),
    ),
    aboutDescription: app.aboutDescription,
    providers: app.providers,
    objects: manifest.objects.map((obj) => ({
      universalIdentifier: obj.universalIdentifier,
      nameSingular: obj.nameSingular,
      namePlural: obj.namePlural,
      labelSingular: obj.labelSingular,
      labelPlural: obj.labelPlural,
      description: obj.description,
      icon: obj.icon,
      fields: obj.fields.map((field) => ({
        name: field.name,
        type: field.type,
        label: field.label,
        description: field.description,
        icon: field.icon,
        objectUniversalIdentifier: obj.universalIdentifier,
        universalIdentifier: field.universalIdentifier,
      })),
    })),
    fields: manifest.fields.map((field) => ({
      name: field.name,
      type: field.type,
      label: field.label,
      description: field.description,
      icon: field.icon,
      objectUniversalIdentifier: field.objectUniversalIdentifier,
      universalIdentifier: field.universalIdentifier,
    })),
    logicFunctions: manifest.logicFunctions.map((lf) => ({
      name: lf.name ?? lf.universalIdentifier,
      description: lf.description,
      timeoutSeconds: lf.timeoutSeconds,
    })),
    frontComponents: manifest.frontComponents.map((fc) => ({
      name: fc.name ?? fc.universalIdentifier,
      description: fc.description,
    })),
  };
};
