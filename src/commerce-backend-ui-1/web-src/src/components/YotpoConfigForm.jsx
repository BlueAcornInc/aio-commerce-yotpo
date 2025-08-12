import React, { useState } from 'react';
import {
  Button,
  Form,
  TextField,
  Heading,
  Content,
  View,
  Picker,
  Item,
  Grid,
  Text,
} from '@adobe/react-spectrum';
import {
  useYotpoConfigLoader,
  useYotpoConfigSaver,
} from '../hooks/useYotpoConfig';

const DEBUG = false;

/**
 *
 * @param props
 */
export default function YotpoConfigForm(props) {
  const [formState, setFormState] = useState({
    status: 'no',
    appKey: '',
    apiSecret: '',
    instanceId: '',
  });

  const { statusMsg: loadStatusMsg, hasError: loadHasError } =
    useYotpoConfigLoader(props, setFormState);

  const {
    saveConfig,
    statusMsg: saveStatusMsg,
    hasError: saveHasError,
  } = useYotpoConfigSaver(props);

  const handleChange = (name, value) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    saveConfig(formState);
  };

  const links = [
    { label: 'Blue Acorn iCi', url: 'https://blueacornici.com/' },
    {
      label: 'Create an Issue',
      url: 'https://github.com/BlueAcornInc/aio-commerce-yotpo/issues/new',
    },
    {
      label: 'Issue Tracker',
      url: 'https://github.com/BlueAcornInc/aio-commerce-yotpo/issues',
    },
    { label: 'Contact Us', url: 'apps@blueacornici.com' },
    { label: 'Documentation', url: 'https://apps.blueacornici.shop/' },
  ];

  return (
    <View padding="size-250">
      {DEBUG && loadStatusMsg && (
        <Content marginBottom="size-200" UNSAFE_style={{ color: '#d2691e' }}>
          {loadStatusMsg}
        </Content>
      )}
      <Heading level={3}>Storefront Blocks</Heading>
      <Content>
        Yotpo must also be configured in the Adobe Commerce Storefront
        configs.json.
        <br />
        <br />
      </Content>
      <Form maxWidth="size-6000">
        <Heading level={3} marginTop="size-200" marginBottom="size-100">
          General Configuration
        </Heading>

        <TextField
          label="App Key"
          value={formState.appKey}
          onChange={(val) => handleChange('appKey', val)}
          isRequired
          isDisabled={loadHasError}
        />
        <TextField
          label="API Secret"
          value={formState.apiSecret}
          onChange={(val) => handleChange('apiSecret', val)}
          isRequired
          isDisabled={loadHasError}
        />
        <TextField
          label="Instance ID"
          value={formState.instanceId}
          onChange={(val) => handleChange('instanceId', val)}
          isRequired
          isDisabled={loadHasError}
        />
        <Picker
          label="Status"
          selectedKey={formState.status}
          onSelectionChange={(val) => handleChange('status', val)}
          isRequired
          isDisabled={loadHasError}
        >
          <Item key="on">On</Item>
          <Item key="off">Off</Item>
        </Picker>

        <Button variant="accent" onPress={handleSave} isDisabled={loadHasError}>
          Save
        </Button>

        {saveHasError && (
          <Content UNSAFE_style={{ color: '#b0b0b0' }}>
            <br />
            {saveStatusMsg}
          </Content>
        )}

        <br />
        <br />
        <Heading level={3}>Support</Heading>
        <Grid columns={['1fr 1fr']} gap="size-200" width="size-3600">
          {links.map((link) => (
            <View
              key={link.url}
              borderWidth="thin"
              borderColor="dark"
              padding="size-200"
              borderRadius="medium"
              onClick={() => {
                window.parent.postMessage(
                  { type: 'open-link', url: link.url },
                  '*',
                );
              }}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
            >
              <Text>
                <b>{link.label}</b>: {link.url}
              </Text>
            </View>
          ))}
        </Grid>
      </Form>
    </View>
  );
}
