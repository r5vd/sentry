import React from 'react';
import styled from '@emotion/styled';

import {promptsCheck, promptsUpdate} from 'app/actionCreators/prompts';
import SidebarPanelActions from 'app/actions/sidebarPanelActions';
import {Client} from 'app/api';
import Alert from 'app/components/alert';
import {ALL_ACCESS_PROJECTS} from 'app/constants/globalSelectionHeader';
import {IconUpgrade} from 'app/icons';
import {t, tct} from 'app/locale';
import space from 'app/styles/space';
import {
  GlobalSelection,
  Organization,
  ProjectSdkUpdates,
  SDKUpdatesSuggestion,
} from 'app/types';
import {snoozedDays} from 'app/utils/promptsActivity';
import withApi from 'app/utils/withApi';
import withGlobalSelection from 'app/utils/withGlobalSelection';
import withOrganization from 'app/utils/withOrganization';
import withSdkUpdates from 'app/utils/withSdkUpdates';

import {SidebarPanelKey} from './sidebar/types';
import Button from './button';

type Props = {
  api: Client;
  organization: Organization;
  sdkUpdates?: ProjectSdkUpdates[] | null;
  selection?: GlobalSelection;
};

type State = {
  isDismissed: boolean | null;
};

const flattenSuggestions = (list: ProjectSdkUpdates[]) =>
  list.reduce<SDKUpdatesSuggestion[]>(
    (suggestions, sdk) => [...suggestions, ...sdk.suggestions],
    []
  );

class InnerGlobalSdkSuggestions extends React.Component<Props, State> {
  state: State = {
    isDismissed: null,
  };

  componentDidMount() {
    this.promptsCheck();
  }

  async promptsCheck() {
    const {api, organization} = this.props;

    const prompt = await promptsCheck(api, {
      organizationId: organization.id,
      feature: 'sdk_updates',
    });

    this.setState({
      isDismissed: !prompt?.snoozedTime ? false : snoozedDays(prompt?.snoozedTime) < 14,
    });
  }

  dismissPrompt = () => {
    const {api, organization} = this.props;
    promptsUpdate(api, {
      organizationId: organization.id,
      feature: 'sdk_updates',
      status: 'snoozed',
    });

    this.setState({isDismissed: true});
  };

  render() {
    const {selection, sdkUpdates} = this.props;
    const {isDismissed} = this.state;

    if (!sdkUpdates || isDismissed === null || isDismissed) {
      return null;
    }

    // withSdkUpdates explicitly only queries My Projects. This means that when
    // looking at any projects outside of My Projects (like All Projects), this
    // will only show the updates relevant to the to user.
    const projectSpecificUpdates =
      selection?.projects.length === 0 || selection?.projects === [ALL_ACCESS_PROJECTS]
        ? sdkUpdates
        : sdkUpdates.filter(update =>
            selection?.projects?.includes(parseInt(update.projectId, 10))
          );

    // Are there any updates?
    if (flattenSuggestions(projectSpecificUpdates).length === 0) {
      return null;
    }

    const showBroadcastsPanel = (
      <Button
        priority="link"
        onClick={() => SidebarPanelActions.activatePanel(SidebarPanelKey.Broadcasts)}
      />
    );

    return (
      <Alert type="info" icon={<IconUpgrade />}>
        <Content>
          {tct(
            `Looks like some SDKs configured for the selected projects are out of date.
             [showBroadcastsPanel:View upgrade suggestions]`,
            {showBroadcastsPanel}
          )}
          <Button
            priority="link"
            title={t('Dismiss SDK update notifications for the next two weeks')}
            onClick={this.dismissPrompt}
          >
            {t('Remind me later')}
          </Button>
        </Content>
      </Alert>
    );
  }
}

const Content = styled('div')`
  display: grid;
  grid-template-columns: 1fr max-content;
  grid-gap: ${space(1)};
`;

const GlobalSdkSuggestions = withOrganization(
  withSdkUpdates(withGlobalSelection(withApi(InnerGlobalSdkSuggestions)))
);

export default GlobalSdkSuggestions;
