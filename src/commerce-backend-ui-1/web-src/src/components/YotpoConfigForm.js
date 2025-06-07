import React, { useState, useEffect } from "react";
import {
  Button,
  Form,
  TextField,
  Content,
  View,
  Picker,
  Item,
  Heading,
  Grid,
  Text
} from "@adobe/react-spectrum";

const DEBUG = false; // Set to true for detailed error messages



export default function YotpoConfigForm({ actionUrl }) {
  const [appKey, setAppKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [status, setStatus] = useState("off");
  const [statusMsg, setStatusMsg] = useState("Loading config...");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const resp = await fetch(actionUrl);
        if (!resp.ok) throw new Error(`GET failed: HTTP ${resp.status}`);
        const data = await resp.json();
        if (data.config) {
          setAppKey(data.config.appKey || "");
          setApiSecret(data.config.apiSecret || "");
          setStatus(data.config.status || "off");
        }
        setStatusMsg("Config loaded successfully");
        setHasError(false);
      } catch (err) {
        setHasError(true);
        if (DEBUG) {
          setStatusMsg(`Error loading config: ${err.message}`);
        } else {
          setStatusMsg("");
          console.log("Error loading config:", err);
        }
      }
    }
    loadConfig();
  }, [actionUrl]);

  async function handleSave() {
    const body = { appKey, apiSecret, status };
    try {
      const resp = await fetch(actionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(`POST failed: HTTP ${resp.status}`);
      setStatusMsg(`Configuration saved successfully`);
      setHasError(false);
    } catch (err) {
      setHasError(true);
      if (DEBUG) {
        setStatusMsg(`Error saving config: ${err.message}`);
      } else {
        setStatusMsg("");
        console.error("Error saving config:", err);
      }
    }
  }

const links = [
    { label: 'Blue Acorn iCi', url: 'https://blueacornici.shop/' },
    { label: 'Create an Issue', url: 'https://github.com/BlueAcornInc/aio-commerce-yotpo/issues/new' },
    { label: 'Issue Tracker', url: 'https://github.com/BlueAcornInc/aio-commerce-yotpo/issues' },
    { label: 'Contact Us', url: 'apps@blueacornici.com' },
    { label: 'Documentation', url: 'https://apps.blueacornici.shop/' },
]

return (
    <View padding="size-250">
        {DEBUG && statusMsg && (
            <Content marginBottom="size-200" UNSAFE_style={{ color: "#d2691e" }}>
                {statusMsg}
            </Content>
        )}

        <Form maxWidth="size-6000">

            <Heading level={3}>Storefront Blocks</Heading>

                <Content>
                    Yotpo must also be configured in the Adobe Commerce Storefront configs.json.<br /><br />
                </Content>

            <Heading level={3}>General Settings</Heading>

            <TextField
                label="App Key"
                value={appKey}
                onChange={setAppKey}
                isRequired
                isDisabled={hasError}
            />
            <TextField
                label="API Secret"
                value={apiSecret}
                onChange={setApiSecret}
                isRequired
                isDisabled={hasError}
            />
            <Picker
                label="Status"
                selectedKey={status}
                onSelectionChange={setStatus}
                isRequired
                isDisabled={hasError}
            >
                <Item key="on">On</Item>
                <Item key="off">Off</Item>
            </Picker>

            {!hasError && (
                <Button variant="accent" onPress={handleSave} isDisabled={hasError}>
                Save
                </Button>
            )}

            {hasError && (
                <Content UNSAFE_style={{ color: "#b0b0b0" }}>
                    <br />Secure configuration management is not yet supported. Please manage any setting with environment variables.
                </Content>
            )}

            <br /><br />
            <Heading level={3}>Support</Heading>
            <Grid
                columns={['1fr 1fr']}
                gap="size-200"
                width="size-3600"
            >
                {links.map(link => (
                    <View
                        key={link.url}
                        borderWidth="thin"
                        borderColor="dark"
                        padding="size-200"
                        borderRadius="medium"
                        onClick={() => {
                            window.parent.postMessage({ type: 'open-link', url: link.url }, '*');
                        }}
                        role="button"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                    >
                        <Text><b>{link.label}</b>: {link.url}</Text>
                    </View>
                ))}
            </Grid>
        </Form>
    </View>
);
}
