import { Injectable, Logger } from '@nestjs/common';

import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { ApplicationRegistrationSourceType } from 'src/engine/core-modules/application/application-registration/enums/application-registration-source-type.enum';
import { MARKETPLACE_CATALOG_INDEX } from 'src/engine/core-modules/application/application-marketplace/constants/marketplace-catalog-index.constant';
import { MarketplaceService } from 'src/engine/core-modules/application/application-marketplace/marketplace.service';
import { buildMarketplaceDisplayDataFromManifest } from 'src/engine/core-modules/application/application-marketplace/utils/build-marketplace-display-data-from-manifest.util';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class MarketplaceCatalogSyncService {
  private readonly logger = new Logger(MarketplaceCatalogSyncService.name);

  constructor(
    private readonly applicationRegistrationService: ApplicationRegistrationService,
    private readonly marketplaceService: MarketplaceService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  async syncCatalog(): Promise<void> {
    await this.syncCuratedApps();
    await this.syncRegistryApps();

    this.logger.log('Marketplace catalog sync completed');
  }

  private async syncCuratedApps(): Promise<void> {
    for (const entry of MARKETPLACE_CATALOG_INDEX) {
      try {
        await this.applicationRegistrationService.upsertFromCatalog({
          universalIdentifier: entry.universalIdentifier,
          name: entry.name,
          description:
            entry.richDisplayData.aboutDescription ?? entry.description,
          author: entry.author,
          sourceType: ApplicationRegistrationSourceType.NPM,
          sourcePackage: entry.sourcePackage,
          logoUrl: entry.logoUrl ?? null,
          websiteUrl: entry.websiteUrl ?? null,
          termsUrl: entry.termsUrl ?? null,
          latestAvailableVersion: entry.richDisplayData.version ?? null,
          isListed: true,
          isFeatured: entry.isFeatured,
          marketplaceDisplayData: entry.richDisplayData,
          ownerWorkspaceId: null,
        });
      } catch (error) {
        this.logger.error(
          `Failed to sync curated app "${entry.name}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async syncRegistryApps(): Promise<void> {
    const packages = await this.marketplaceService.fetchAppsFromRegistry();

    const curatedIdentifiers = new Set(
      MARKETPLACE_CATALOG_INDEX.map((entry) => entry.universalIdentifier),
    );

    for (const pkg of packages) {
      try {
        const manifest =
          await this.marketplaceService.fetchManifestFromRegistryCdn(
            pkg.name,
            pkg.version,
          );

        if (!manifest) {
          this.logger.debug(
            `Skipping ${pkg.name}: no manifest found on CDN`,
          );
          continue;
        }

        const universalIdentifier =
          manifest.application.universalIdentifier;

        if (curatedIdentifiers.has(universalIdentifier)) {
          continue;
        }

        const cdnBaseUrl = this.twentyConfigService.get('APP_REGISTRY_CDN_URL');

        const displayData = buildMarketplaceDisplayDataFromManifest({
          manifest,
          packageName: pkg.name,
          version: pkg.version,
          cdnBaseUrl,
        });

        await this.applicationRegistrationService.upsertFromCatalog({
          universalIdentifier,
          name: manifest.application.displayName ?? pkg.name,
          description:
            manifest.application.aboutDescription ?? pkg.description,
          author: manifest.application.author ?? pkg.author,
          sourceType: ApplicationRegistrationSourceType.NPM,
          sourcePackage: pkg.name,
          logoUrl: displayData.logo ?? null,
          websiteUrl:
            manifest.application.websiteUrl ?? pkg.websiteUrl ?? null,
          termsUrl: manifest.application.termsUrl ?? null,
          latestAvailableVersion: pkg.version ?? null,
          isListed: true,
          isFeatured: false,
          marketplaceDisplayData: displayData,
          ownerWorkspaceId: null,
        });
      } catch (error) {
        this.logger.error(
          `Failed to sync registry app "${pkg.name}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
