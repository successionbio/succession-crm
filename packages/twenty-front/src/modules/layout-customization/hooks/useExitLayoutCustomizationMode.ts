import { useStore } from 'jotai';
import { useCallback } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { activeCustomizationPageLayoutIdsState } from '@/layout-customization/states/activeCustomizationPageLayoutIdsState';
import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { navigationMenuItemsDraftState } from '@/navigation-menu-item/common/states/navigationMenuItemsDraftState';
import { selectedNavigationMenuItemIdInEditModeState } from '@/navigation-menu-item/common/states/selectedNavigationMenuItemIdInEditModeState';
import { useDefaultHomePagePath } from '@/navigation/hooks/useDefaultHomePagePath';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { currentPageLayoutIdState } from '@/page-layout/states/currentPageLayoutIdState';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

export const useExitLayoutCustomizationMode = () => {
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { defaultHomePagePath } = useDefaultHomePagePath();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const { closeSidePanelMenu } = useSidePanelMenu();

  const setNavigationMenuItemsDraft = useSetAtomState(
    navigationMenuItemsDraftState,
  );
  const setSelectedNavigationMenuItemIdInEditMode = useSetAtomState(
    selectedNavigationMenuItemIdInEditModeState,
  );
  const setIsLayoutCustomizationModeEnabled = useSetAtomState(
    isLayoutCustomizationModeEnabledState,
  );

  const finalizeExit = useCallback(() => {
    setNavigationMenuItemsDraft(null);
    setSelectedNavigationMenuItemIdInEditMode(null);

    store.set(currentPageLayoutIdState.atom, null);
    store.set(activeCustomizationPageLayoutIdsState.atom, []);
    setIsLayoutCustomizationModeEnabled(false);
    closeSidePanelMenu();
  }, [
    closeSidePanelMenu,
    setIsLayoutCustomizationModeEnabled,
    setNavigationMenuItemsDraft,
    setSelectedNavigationMenuItemIdInEditMode,
    store,
  ]);

  const shouldRedirectToDefaultHome = useCallback(() => {
    const recordIndexMatch = matchPath(
      { path: AppPath.RecordIndexPage, end: false },
      location.pathname,
    );
    const objectNamePlural = recordIndexMatch?.params?.objectNamePlural;

    if (!isDefined(objectNamePlural)) {
      return false;
    }

    const objectMetadataItem = objectMetadataItems.find(
      (item) => item.namePlural === objectNamePlural,
    );

    if (!isDefined(objectMetadataItem)) {
      return false;
    }

    const { canReadObjectRecords } = getObjectPermissionsForObject(
      objectPermissionsByObjectMetadataId,
      objectMetadataItem.id,
    );

    return !canReadObjectRecords;
  }, [
    location.pathname,
    objectMetadataItems,
    objectPermissionsByObjectMetadataId,
  ]);

  const exitLayoutCustomizationMode = useCallback(() => {
    if (shouldRedirectToDefaultHome()) {
      navigate(defaultHomePagePath, { replace: true });
      requestAnimationFrame(() => finalizeExit());
      return;
    }

    finalizeExit();
  }, [
    defaultHomePagePath,
    finalizeExit,
    navigate,
    shouldRedirectToDefaultHome,
  ]);

  return { exitLayoutCustomizationMode };
};
