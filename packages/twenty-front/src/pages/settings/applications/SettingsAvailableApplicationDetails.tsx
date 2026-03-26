import { LazyMarkdownRenderer } from '@/ai/components/LazyMarkdownRenderer';
import { useInstallMarketplaceApp } from '@/marketplace/hooks/useInstallMarketplaceApp';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { SubMenuTopBarContainer } from '@/ui/layout/page/components/SubMenuTopBarContainer';
import { TabList } from '@/ui/layout/tab-list/components/TabList';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { type Manifest } from 'twenty-shared/application';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import {
  IconBook,
  IconBox,
  IconCheck,
  IconCommand,
  IconDownload,
  IconEyeOff,
  IconFileText,
  IconGraph,
  IconInfoCircle,
  IconLego,
  IconListDetails,
  IconLock,
  IconSettings,
  IconShield,
  IconWorld,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useQuery } from '@apollo/client/react';
import {
  PermissionFlagType,
  FindOneApplicationByUniversalIdentifierDocument,
  FindMarketplaceAppDetailDocument,
} from '~/generated-metadata/graphql';
import { SettingsApplicationPermissionsTab } from '~/pages/settings/applications/tabs/SettingsApplicationPermissionsTab';
import { SettingsAvailableApplicationDetailContentTab } from '~/pages/settings/applications/tabs/SettingsAvailableApplicationDetailContentTab';
import { OBJECT_SETTINGS_WIDTH } from '@/settings/data-model/constants/ObjectSettings';

const AVAILABLE_APPLICATION_DETAIL_ID = 'available-application-detail';

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
  justify-content: space-between;
`;

const StyledHeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledHeaderTop = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledLogo = styled.div`
  align-items: center;
  background-color: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-shrink: 0;
  height: 24px;
  justify-content: center;
  overflow: hidden;
  width: 24px;
`;

const StyledLogoImage = styled.img`
  height: 32px;
  object-fit: contain;
  width: 32px;
`;

const StyledLogoPlaceholder = styled.div`
  align-items: center;
  background-color: ${themeCssVariables.color.blue};
  border-radius: ${themeCssVariables.border.radius.xs};
  color: ${themeCssVariables.font.color.inverted};
  display: flex;
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.medium};
  height: 32px;
  justify-content: center;
  width: 32px;
`;

const StyledAppName = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledAppDescription = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.regular};
`;

const StyledContentContainer = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[8]};
`;

const StyledMainContent = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const StyledSidebar = styled.div`
  flex-shrink: 0;
  width: 180px;
`;

const StyledSidebarSection = styled.div`
  padding: ${themeCssVariables.spacing[3]} 0;

  &:first-of-type {
    padding-top: 0;
  }
`;

const StyledTitleContainer = styled.div`
  width: ${() => {
    return OBJECT_SETTINGS_WIDTH + 'px';
  }};
  margin-bottom: ${themeCssVariables.spacing[4]};
`;

const StyledSidebarLabel = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledSidebarValue = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledContentItem = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  margin-bottom: ${themeCssVariables.spacing[2]};

  &:last-of-type {
    margin-bottom: 0;
  }
`;

const StyledLink = styled.a`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  margin-bottom: ${themeCssVariables.spacing[2]};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:last-of-type {
    margin-bottom: 0;
  }
`;

const StyledScreenshotsContainer = styled.div`
  align-items: center;
  background-color: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  height: 300px;
  justify-content: center;
  margin-bottom: ${themeCssVariables.spacing[4]};
  overflow: hidden;
`;

const StyledScreenshotImage = styled.img`
  height: 100%;
  object-fit: contain;
  width: 100%;
`;

const StyledScreenshotThumbnails = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  margin-bottom: ${themeCssVariables.spacing[6]};
`;

const StyledThumbnail = styled.div<{ isSelected?: boolean }>`
  align-items: center;
  background-color: ${themeCssVariables.background.secondary};
  border: 1px solid
    ${({ isSelected }) =>
      isSelected
        ? themeCssVariables.color.blue
        : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: pointer;
  display: flex;
  flex: 1;
  height: 60px;
  justify-content: center;
  overflow: hidden;

  &:hover {
    border-color: ${themeCssVariables.color.blue};
  }
`;

const StyledThumbnailImage = styled.img`
  height: 100%;
  object-fit: contain;
  width: 100%;
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0 0 ${themeCssVariables.spacing[3]} 0;
`;

const StyledAboutText = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  margin: 0 0 ${themeCssVariables.spacing[6]} 0;
  white-space: pre-line;
`;

const StyledProvidersList = styled.ul`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  list-style-type: disc;
  margin: 0;
  padding-left: ${themeCssVariables.spacing[5]};
`;

const StyledProviderItem = styled.li`
  margin-bottom: ${themeCssVariables.spacing[1]};
`;

const StyledUnlistedBanner = styled.div`
  align-items: center;
  background-color: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  margin-bottom: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

export const SettingsAvailableApplicationDetails = () => {
  const { availableApplicationId = '' } = useParams<{
    availableApplicationId: string;
  }>();

  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState(0);

  const { install, isInstalling } = useInstallMarketplaceApp();
  const canInstallMarketplaceApps = useHasPermissionFlag(
    PermissionFlagType.MARKETPLACE_APPS,
  );
  const { data: installedAppData } = useQuery(
    FindOneApplicationByUniversalIdentifierDocument,
    {
      variables: { universalIdentifier: availableApplicationId },
      skip: !availableApplicationId,
    },
  );

  const { data: detailData } = useQuery(FindMarketplaceAppDetailDocument, {
    variables: { universalIdentifier: availableApplicationId },
    skip: !availableApplicationId,
  });

  const detail = detailData?.findMarketplaceAppDetail;
  const manifest = detail?.manifest as Manifest | undefined;
  const app = manifest?.application;

  const displayName = app?.displayName ?? detail?.name ?? '';
  const description = app?.description ?? '';
  const screenshots = app?.screenshots ?? [];
  const providers = app?.providers ?? [];
  const aboutDescription = app?.aboutDescription ?? description;

  const contentEntries = [
    {
      icon: IconBox,
      count: (manifest?.objects ?? []).length,
      one: t`object`,
      many: t`objects`,
    },
    {
      icon: IconListDetails,
      count: (manifest?.fields ?? []).length,
      one: t`field`,
      many: t`fields`,
    },
    {
      icon: IconCommand,
      count: (manifest?.logicFunctions ?? []).length,
      one: t`logic function`,
      many: t`logic functions`,
    },
    {
      icon: IconGraph,
      count: (manifest?.frontComponents ?? []).filter(
        (fc) =>
          !isDefined(fc.command) &&
          fc.universalIdentifier !==
            manifest?.application
              .settingsCustomTabFrontComponentUniversalIdentifier,
      ).length,
      one: t`widget`,
      many: t`widgets`,
    },
    {
      icon: IconCommand,
      count: (manifest?.frontComponents ?? []).filter(
        (fc) => isDefined(fc.command) && !fc.isHeadless,
      ).length,
      one: t`command`,
      many: t`commands`,
    },
    {
      icon: IconShield,
      count: (manifest?.roles ?? []).filter(
        (role) =>
          role.universalIdentifier !==
          manifest?.application.defaultRoleUniversalIdentifier,
      ).length,
      one: t`role`,
      many: t`roles`,
    },
    {
      icon: IconBook,
      count: (manifest?.skills ?? []).length,
      one: t`skill`,
      many: t`skills`,
    },
    {
      icon: IconLego,
      count: (manifest?.agents ?? []).length,
      one: t`agent`,
      many: t`agents`,
    },
  ].filter((entry) => entry.count > 0);

  const isUnlisted = isDefined(detail) && !detail.isListed;
  const installedApp = installedAppData?.findOneApplication;
  const isAlreadyInstalled = isDefined(installedApp);
  const hasScreenshots = screenshots.length > 0;

  const defaultRole = manifest?.roles?.find(
    (r) => r.universalIdentifier === app?.defaultRoleUniversalIdentifier,
  );

  const handleInstall = async () => {
    if (isDefined(detail)) {
      await install({
        universalIdentifier: detail.universalIdentifier,
      });
    }
  };

  const activeTabId = useAtomComponentStateValue(
    activeTabIdComponentState,
    AVAILABLE_APPLICATION_DETAIL_ID,
  );

  const tabs = [
    { id: 'about', title: t`About`, Icon: IconInfoCircle },
    { id: 'content', title: t`Content`, Icon: IconBox },
    { id: 'permissions', title: t`Permissions`, Icon: IconLock },
    { id: 'settings', title: t`Settings`, Icon: IconSettings },
  ];

  const renderActiveTabContent = () => {
    if (!detail) return null;

    switch (activeTabId) {
      case 'about':
        return (
          <>
            {hasScreenshots && (
              <>
                <StyledScreenshotsContainer>
                  <StyledScreenshotImage
                    src={screenshots[selectedScreenshotIndex]}
                    alt={`${displayName} screenshot ${selectedScreenshotIndex + 1}`}
                  />
                </StyledScreenshotsContainer>
                <StyledScreenshotThumbnails>
                  {screenshots.slice(0, 6).map((screenshot, index) => (
                    <StyledThumbnail
                      key={index}
                      isSelected={index === selectedScreenshotIndex}
                      onClick={() => setSelectedScreenshotIndex(index)}
                    >
                      <StyledThumbnailImage
                        src={screenshot}
                        alt={`${displayName} thumbnail ${index + 1}`}
                      />
                    </StyledThumbnail>
                  ))}
                </StyledScreenshotThumbnails>
              </>
            )}

            <StyledContentContainer>
              <StyledMainContent>
                {aboutDescription && (
                  <Section>
                    {aboutDescription && (
                      <>
                        <StyledSectionTitle>{t`About`}</StyledSectionTitle>
                        <LazyMarkdownRenderer text={aboutDescription} />
                      </>
                    )}
                  </Section>
                )}
              </StyledMainContent>

              <StyledSidebar>
                <StyledSidebarSection>
                  <StyledSidebarLabel>{t`Created by`}</StyledSidebarLabel>
                  <StyledSidebarValue>
                    {app?.author ?? 'Unknown'}
                  </StyledSidebarValue>
                </StyledSidebarSection>

                {app?.category && (
                  <StyledSidebarSection>
                    <StyledSidebarLabel>{t`Category`}</StyledSidebarLabel>
                    <StyledSidebarValue>{app.category}</StyledSidebarValue>
                  </StyledSidebarSection>
                )}

                {contentEntries.length > 0 && (
                  <StyledSidebarSection>
                    <StyledSidebarLabel>{t`Content`}</StyledSidebarLabel>
                    {contentEntries.map((entry) => (
                      <StyledContentItem key={entry.one}>
                        <entry.icon size={16} />
                        {entry.count}{' '}
                        {entry.count === 1 ? entry.one : entry.many}
                      </StyledContentItem>
                    ))}
                  </StyledSidebarSection>
                )}

                {isAlreadyInstalled && (
                  <StyledSidebarSection>
                    <StyledSidebarLabel>{t`Current`}</StyledSidebarLabel>
                    <StyledSidebarValue>
                      {installedApp?.version ?? t`Unknown`}
                    </StyledSidebarValue>
                  </StyledSidebarSection>
                )}

                <StyledSidebarSection>
                  <StyledSidebarLabel>{t`Latest`}</StyledSidebarLabel>
                  <StyledSidebarValue>
                    {detail.latestAvailableVersion ?? '0.0.0'}
                  </StyledSidebarValue>
                </StyledSidebarSection>

                {providers.length > 0 && (
                  <>
                    <StyledSidebarSection>
                      <StyledSidebarLabel>{t`Providers`}</StyledSidebarLabel>
                      <StyledProvidersList>
                        {providers.map((provider) => (
                          <StyledProviderItem key={provider}>
                            {provider}
                          </StyledProviderItem>
                        ))}
                      </StyledProvidersList>
                    </StyledSidebarSection>
                  </>
                )}

                {(app?.websiteUrl || app?.termsUrl) && (
                  <StyledSidebarSection>
                    <StyledSidebarLabel>{t`Developers links`}</StyledSidebarLabel>
                    {app?.websiteUrl && (
                      <StyledLink
                        href={app.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <IconWorld size={16} />
                        {t`Website`}
                      </StyledLink>
                    )}
                    {app?.termsUrl && (
                      <StyledLink
                        href={app.termsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <IconFileText size={16} />
                        {t`Terms / Privacy`}
                      </StyledLink>
                    )}
                  </StyledSidebarSection>
                )}
              </StyledSidebar>
            </StyledContentContainer>
          </>
        );
      case 'content':
        return (
          <SettingsAvailableApplicationDetailContentTab
            applicationId={detail.universalIdentifier}
            content={manifest}
          />
        );
      case 'permissions':
        return (
          <SettingsApplicationPermissionsTab
            marketplaceAppDefaultRole={defaultRole}
            marketplaceAppObjects={manifest?.objects}
          />
        );
      case 'settings':
        return <div>{t`Settings tab`}</div>;
      default:
        return null;
    }
  };

  if (!detail) {
    return null;
  }

  return (
    <SubMenuTopBarContainer
      links={[
        {
          children: t`Workspace`,
          href: getSettingsPath(SettingsPath.Workspace),
        },
        {
          children: t`Applications`,
          href: getSettingsPath(SettingsPath.Applications),
        },
        { children: displayName },
      ]}
      title={
        <StyledTitleContainer>
          {isUnlisted && (
            <StyledUnlistedBanner>
              <IconEyeOff size={16} />
              {t`This application is not listed on the marketplace. It was shared via a direct link.`}
            </StyledUnlistedBanner>
          )}
          <StyledHeader>
            <StyledHeaderLeft>
              <StyledHeaderTop>
                <StyledLogo>
                  {app?.logoUrl ? (
                    <StyledLogoImage src={app.logoUrl} alt={displayName} />
                  ) : (
                    <StyledLogoPlaceholder>
                      {displayName.charAt(0).toUpperCase()}
                    </StyledLogoPlaceholder>
                  )}
                </StyledLogo>
                <StyledAppName>{displayName}</StyledAppName>
              </StyledHeaderTop>
              <StyledAppDescription>{description}</StyledAppDescription>
            </StyledHeaderLeft>
            {canInstallMarketplaceApps && (
              <Button
                Icon={isAlreadyInstalled ? IconCheck : IconDownload}
                title={
                  isAlreadyInstalled
                    ? t`Installed`
                    : isInstalling
                      ? t`Installing...`
                      : t`Install`
                }
                variant={isAlreadyInstalled ? 'secondary' : 'primary'}
                accent={isAlreadyInstalled ? 'default' : 'blue'}
                onClick={handleInstall}
                disabled={isAlreadyInstalled || isInstalling}
              />
            )}
          </StyledHeader>
        </StyledTitleContainer>
      }
    >
      <SettingsPageContainer>
        <TabList
          tabs={tabs}
          componentInstanceId={AVAILABLE_APPLICATION_DETAIL_ID}
          behaveAsLinks={false}
        />

        {renderActiveTabContent()}
      </SettingsPageContainer>
    </SubMenuTopBarContainer>
  );
};
