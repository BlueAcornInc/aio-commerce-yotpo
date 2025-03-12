async function main(params) {
    params;
    const namespace = process.env.__OW_NAMESPACE || "default-namespace";
    const baseUrl = `https://${namespace}.adobeio-static.net`;
    const href = `${baseUrl}/index.html`;
    return {
        statusCode: 200,
        body: {
            registration: {
                name: "yotpo-extension",
                title: "Yotpo Extension",
                description: "Yotpo integration for Adobe Commerce",
                icon: "none",
                publisher: "PUBLISHER_ID",
                status: "PUBLISHED",
                endpoints: {
                    "commerce/backend-ui/1": {
                        view: [
                            {
                                href: href,
                            },
                        ],
                    },
                },
                xrInfo: {
                    supportEmail: "extensions@example.com",
                    appId: "APP_ID",
                },
            },
        },
    };
}

exports.main = main;