import { SettingsOptionCardContentButton } from '@/settings/components/SettingsOptions/SettingsOptionCardContentButton';
import { t } from '@lingui/core/macro';
import { SettingsPath } from 'twenty-shared/types';
import { IconArrowUp, IconLock } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { Card } from 'twenty-ui/layout';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

export const SettingsEnterpriseFeatureGateCard = ({
  description,
}: {
  description: string;
}) => {
  const navigateSettings = useNavigateSettings();

  return (
    <Card rounded>
      <SettingsOptionCardContentButton
        Icon={IconLock}
        title={t`Enterprise feature`}
        description={description}
        Button={
          <Button
            title={t`Activate`}
            variant="primary"
            accent="blue"
            size="small"
            Icon={IconArrowUp}
            onClick={() => navigateSettings(SettingsPath.AdminPanelEnterprise)}
          />
        }
      />
    </Card>
  );
};
