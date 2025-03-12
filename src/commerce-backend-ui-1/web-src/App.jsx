import React from "react";
import { Provider } from "@react-spectrum/provider";
import { theme } from "@react-spectrum/theme-default";
import YotpoConfigForm from "./YotpoConfigForm.jsx";
import ExtensionRegistration from "./ExtensionRegistration.jsx";
import ReactDOM from "react-dom";

export default function App() {
    const namespace =
        (typeof process !== "undefined" && process.env.__OW_NAMESPACE) ||
        "YOUR_NAMESPACE";
    const appName = "aio-commerce-yotpo-app";
    const ACTION_URL = `/api/v1/web/${appName}/yotpo-config`;
    return (
        <Provider theme={theme} colorScheme="light">
            <ExtensionRegistration />
            <YotpoConfigForm actionUrl={ACTION_URL} />
        </Provider>
    );
}

ReactDOM.render(<App />, document.getElementById("root"));