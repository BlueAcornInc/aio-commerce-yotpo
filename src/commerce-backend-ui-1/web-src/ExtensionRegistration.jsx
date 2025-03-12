import React, { useEffect } from "react";
import { register } from "@adobe/uix-guest";

export default function ExtensionRegistration() {
    useEffect(() => {
        if (process.env.NODE_ENV === "development") {
            console.log("Skipping guest registration in local development");
            return;
        }

        async function init() {
            try {
                await register({
                    id: "yotpo-app"
                });
                console.log("Extension registered successfully");
            } catch (err) {
                console.error("Registration failed:", err);
            }
        }
        init();
    }, []);

    return null;
}