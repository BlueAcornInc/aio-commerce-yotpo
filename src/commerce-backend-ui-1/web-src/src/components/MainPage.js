import YotpoConfigForm from "./YotpoConfigForm";

export const MainPage = (props) => {
  const namespace = process.env.AIO_runtime_namespace;
  const actionUrl = `https://${namespace}.adobeioruntime.net/api/v1/web/aio-commerce-yotpo-app/yotpo-config`;
  return <YotpoConfigForm actionUrl={actionUrl} />;
};
