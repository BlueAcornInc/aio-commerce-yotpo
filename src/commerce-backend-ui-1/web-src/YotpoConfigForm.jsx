import React, { useState, useEffect } from "react";
import {
    Button,
    Form,
    TextField,
    Heading,
    Content,
    View,
    Picker,
    Item,
} from "@adobe/react-spectrum";

export default function YotpoConfigForm({ actionUrl }) {
    const [appKey, setAppKey] = useState("");
    const [apiSecret, setApiSecret] = useState("");
    const [status, setStatus] = useState("off");
    const [statusMsg, setStatusMsg] = useState("Loading config...");

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
            } catch (err) {
                setStatusMsg(`Error loading config: ${err.message}`);
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
        } catch (err) {
            setStatusMsg(`Error saving config: ${err.message}`);
        }
    }

    return (
        <View padding="size-250">
            <Heading level={1}>Yotpo Config Editor</Heading>
            <Content marginBottom="size-200">{statusMsg}</Content>
            <Form maxWidth="size-6000">
                <TextField
                    label="App Key"
                    value={appKey}
                    onChange={setAppKey}
                    isRequired
                />
                <TextField
                    label="API Secret"
                    value={apiSecret}
                    onChange={setApiSecret}
                    isRequired
                />
                <Picker
                    label="Status"
                    selectedKey={status}
                    onSelectionChange={setStatus}
                    isRequired
                >
                    <Item key="on">On</Item>
                    <Item key="off">Off</Item>
                </Picker>
                <Button variant="accent" onPress={handleSave}>
                    Save
                </Button>
            </Form>
        </View>
    );
}