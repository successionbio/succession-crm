import { SubTitle } from '@/auth/components/SubTitle';
import { Title } from '@/auth/components/Title';
import { currentUserState } from '@/auth/states/currentUserState';
import { OnboardingModalCircularIcon } from '@/onboarding/components/OnboardingModalCircularIcon';
import { ModalContent } from 'twenty-ui/layout';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useSubscriptionStatus } from '@/workspace/hooks/useSubscriptionStatus';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconCheck } from 'twenty-ui/display';
import { Loader } from 'twenty-ui/feedback';
import { MainButton } from 'twenty-ui/input';
import { AnimatedEaseIn } from 'twenty-ui/utilities';
import { useLazyQuery } from '@apollo/client/react';
import { GetCurrentUserDocument } from '~/generated-metadata/graphql';
import { useNavigateApp } from '~/hooks/useNavigateApp';
import { sleep } from '~/utils/sleep';

const SUBSCRIPTION_CHECK_RETRY_DELAY_MS = 2000;
const SUBSCRIPTION_CHECK_MAX_RETRIES = 5;

const StyledTitleContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  text-align: center;
`;

export const PaymentSuccess = () => {
  const navigate = useNavigateApp();
  const subscriptionStatus = useSubscriptionStatus();
  const [getCurrentUser] = useLazyQuery(GetCurrentUserDocument, {
    fetchPolicy: 'network-only',
  });
  const setCurrentUser = useSetAtomState(currentUserState);
  const [isLoading, setIsLoading] = useState(false);
  const { enqueueErrorSnackBar } = useSnackBar();
  const navigateWithSubscriptionCheck = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      if (isDefined(subscriptionStatus)) {
        navigate(AppPath.CreateWorkspace);
        return;
      }

      for (
        let attempt = 0;
        attempt < SUBSCRIPTION_CHECK_MAX_RETRIES;
        attempt++
      ) {
        const result = await getCurrentUser();
        const currentUser = result.data?.currentUser;
        const refreshedSubscriptionStatus =
          currentUser?.currentWorkspace?.currentBillingSubscription?.status;

        if (isDefined(currentUser) && isDefined(refreshedSubscriptionStatus)) {
          setCurrentUser(currentUser);
          navigate(AppPath.CreateWorkspace);
          return;
        }

        if (attempt < SUBSCRIPTION_CHECK_MAX_RETRIES - 1) {
          await sleep(SUBSCRIPTION_CHECK_RETRY_DELAY_MS);
        }
      }

      enqueueErrorSnackBar(
        t`We're waiting for a confirmation from our payment provider (Stripe). Please try again in a few seconds.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalContent gap={8} isVerticallyCentered isHorizontallyCentered>
      <AnimatedEaseIn>
        <OnboardingModalCircularIcon Icon={IconCheck} />
      </AnimatedEaseIn>
      <StyledTitleContainer>
        <Title noMarginTop>{t`All set!`}</Title>
        <SubTitle>{t`Your account has been activated.`}</SubTitle>
      </StyledTitleContainer>
      <MainButton
        title={t`Start`}
        width={200}
        onClick={navigateWithSubscriptionCheck}
        Icon={() => (isLoading ? <Loader /> : null)}
        disabled={isLoading}
      />
    </ModalContent>
  );
};
