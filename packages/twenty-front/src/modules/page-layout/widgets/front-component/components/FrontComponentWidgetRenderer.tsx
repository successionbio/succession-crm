import { styled } from '@linaria/react';
import { Suspense, lazy } from 'react';

import { isDefined } from 'twenty-shared/utils';

import { usePageLayoutContentContext } from '@/page-layout/contexts/PageLayoutContentContext';
import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { PageLayoutWidgetNoDataDisplay } from '@/page-layout/widgets/components/PageLayoutWidgetNoDataDisplay';
import { isWidgetConfigurationOfType } from '@/side-panel/pages/page-layout/utils/isWidgetConfigurationOfType';
import { PageLayoutTabLayoutMode } from '~/generated-metadata/graphql';

const StyledContainer = styled.div<{
  isInEditMode: boolean;
  isVerticalList: boolean;
}>`
  height: ${({ isVerticalList }) => (isVerticalList ? '300px' : '100%')};
  overflow: auto;
  pointer-events: ${({ isInEditMode }) => (isInEditMode ? 'none' : 'auto')};
  width: 100%;
`;

const FrontComponentRenderer = lazy(() =>
  import('@/front-components/components/FrontComponentRenderer').then(
    (module) => ({ default: module.FrontComponentRenderer }),
  ),
);

type FrontComponentWidgetRendererProps = {
  widget: PageLayoutWidget;
};

export const FrontComponentWidgetRenderer = ({
  widget,
}: FrontComponentWidgetRendererProps) => {
  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();
  const { layoutMode } = usePageLayoutContentContext();

  const isVerticalList = layoutMode === PageLayoutTabLayoutMode.VERTICAL_LIST;

  const configuration = widget.configuration;

  if (
    !isDefined(configuration) ||
    !isWidgetConfigurationOfType(configuration, 'FrontComponentConfiguration')
  ) {
    return <PageLayoutWidgetNoDataDisplay />;
  }

  const frontComponentId = configuration.frontComponentId;

  return (
    <StyledContainer
      isInEditMode={isPageLayoutInEditMode}
      isVerticalList={isVerticalList}
    >
      <Suspense fallback={null}>
        <FrontComponentRenderer frontComponentId={frontComponentId} />
      </Suspense>
    </StyledContainer>
  );
};
