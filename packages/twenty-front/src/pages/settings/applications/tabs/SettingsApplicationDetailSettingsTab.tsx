import { isDefined } from 'twenty-shared/utils';
import { Application } from '~/generated-metadata/graphql';
import { useUpdateOneApplicationVariable } from '~/pages/settings/applications/hooks/useUpdateOneApplicationVariable';
import { SettingsApplicationDetailEnvironmentVariablesTable } from '~/pages/settings/applications/tabs/SettingsApplicationDetailEnvironmentVariablesTable';
import { H2Title, IconTrash } from 'twenty-ui/display';
import { t } from '@lingui/core/macro';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';

export const SettingsApplicationDetailSettingsTab = ({
  application,
}: {
  application?: Pick<
    Application,
    'applicationVariables' | 'id' | 'universalIdentifier' | 'canBeUninstalled'
  >;
}) => {
  const { updateOneApplicationVariable } = useUpdateOneApplicationVariable();

  const envVariables = [...(application?.applicationVariables ?? [])].sort(
    (a, b) => a.key.localeCompare(b.key),
  );

  return (
    <SettingsApplicationDetailEnvironmentVariablesTable
      envVariables={envVariables}
      onUpdate={({ key, value }) =>
        application?.id
          ? updateOneApplicationVariable({
              key,
              value,
              applicationId: application.id,
            })
          : null
      }
    />
  );
};
