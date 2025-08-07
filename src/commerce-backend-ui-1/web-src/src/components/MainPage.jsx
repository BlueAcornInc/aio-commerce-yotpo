import { attach } from "@adobe/uix-guest";
import { useEffect, useState } from "react";
import YotpoConfigForm from "./YotpoConfigForm";
import { EXTENSION_ID } from "../constants";
import { View } from "@adobe/react-spectrum";
import config from "../config.json";

export const MainPage = (props) => {
  const [imsToken, setImsToken] = useState(null);
  const [imsOrgId, setImsOrgId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const actionUrl = config["yotpo/admin-config"];

  useEffect(() => {
    // Load IMS token for calling require-adobe-auth: true actions
    const loadImsInfo = async () => {
      try {
        if (props.ims?.token) {
          // When running inside Experience Cloud Shell, IMS token and orgId can be accessed via props.ims.
          setImsToken(props.ims.token);
          setImsOrgId(props.ims.org);
        } else {
          // Commerce PaaS requires Admin UI SDK 3.0+ to access IMS info via sharedContext.
          // See https://developer.adobe.com/commerce/extensibility/admin-ui-sdk/extension-points/#shared-contexts
          const guestConnection = await attach({ id: EXTENSION_ID });
          const context = guestConnection?.sharedContext;
          setImsToken(context?.get("imsToken"));
          setImsOrgId(context?.get("imsOrgId"));
        }
      } catch (error) {
        console.error("Error loading IMS info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImsInfo();
  }, []);

  return !isLoading ? (
    <YotpoConfigForm
      actionUrl={actionUrl}
      imsToken={imsToken}
      imsOrgId={imsOrgId}
    />
  ) : (
    <View></View>
  );
};
