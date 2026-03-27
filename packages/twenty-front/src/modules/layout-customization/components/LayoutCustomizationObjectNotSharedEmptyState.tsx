import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const NOT_SHARED_BACKGROUND_IMAGE =
  '/images/placeholders/background/not_shared_bg.png';
const NOT_SHARED_MOVING_IMAGE =
  '/images/placeholders/moving-image/not_shared.png';

const StyledPanel = styled.div`
  border-radius: ${themeCssVariables.border.radius.md};
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
`;

const StyledEmptyContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  height: 100%;
  justify-content: center;
  text-align: center;
  width: 100%;
`;

const StyledImageContainer = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  position: relative;
`;

const StyledBackgroundImage = styled.img`
  max-height: 160px;
  max-width: 160px;
`;

const StyledInnerImage = styled.img`
  max-height: 130px;
  max-width: 130px;
  position: absolute;
`;

const StyledEmptyTextContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: center;
  text-align: center;
  width: 100%;
`;

const StyledEmptyTitle = styled.div`
  color: ${themeCssVariables.grayScale.gray12};
  font-size: 1.23rem;
  font-weight: 600;
`;

const StyledEmptySubTitle = styled.div`
  color: ${themeCssVariables.grayScale.gray11};
  font-size: 0.92rem;
  font-weight: 400;
  line-height: 1.5;
  max-height: 2.8em;
  overflow: hidden;
  width: 50%;
`;

export const LayoutCustomizationObjectNotSharedEmptyState = () => {
  return (
    <StyledPanel>
        <StyledEmptyContainer>
          <StyledImageContainer>
            <StyledBackgroundImage
              src={NOT_SHARED_BACKGROUND_IMAGE}
              alt={t`Background`}
            />
            <StyledInnerImage
              src={NOT_SHARED_MOVING_IMAGE}
              alt={t`Not shared illustration`}
            />
          </StyledImageContainer>
          <StyledEmptyTextContainer>
            <StyledEmptyTitle>
              <Trans>Object not shared</Trans>
            </StyledEmptyTitle>
            <StyledEmptySubTitle>
              <Trans>You do not have access to this object</Trans>
            </StyledEmptySubTitle>
          </StyledEmptyTextContainer>
        </StyledEmptyContainer>
      </StyledPanel>
  );
};
