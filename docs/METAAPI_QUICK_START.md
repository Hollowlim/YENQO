# MetaApi setup for the P/L Calendar

You can set this up on the local website before buying a domain or deploying to Vercel. No provider account has been provisioned by this guide or the implementation tests. MetaApi usage is chargeable; check its Billing / View rates before connecting accounts.

1. Sign in at [app.metaapi.cloud](https://app.metaapi.cloud/). Open **API Access → Generate token**. Create an **API-access token**, with permission for the account-management/provisioning operations (create, read, deploy, undeploy, delete and server lookup) and MetaApi REST account-information/deal-history reads used by this integration. Use the narrowest available permissions. CopyFactory, MetaStats, risk-management and MT Manager services are not used. The application exposes no broker trading methods.
2. In the project's existing root `.env`, fill **only** the `METAAPI_TOKEN` value privately. The provider token is different from an MT5 investor password. Do not paste either into chat, GitHub, HTML or browser storage. Existing setup uses:

   ```dotenv
   METAAPI_TOKEN=replace_privately_with_your_api_access_token
   METAAPI_REGION=london
   BROKER_READ_ONLY_ENABLED=true
   METAAPI_ALLOW_REAL_READONLY=false
   PC_CONNECTOR_ENABLED=false
   ```

   Keep existing database, authentication and Resend values. The current provider quota lists `london`, so keep that value; this controls new-account provisioning; reads use the assigned account region reported by MetaApi.
3. Save the file and tell the assistant **saved**. The currently running local server needs restarting to load new environment values; the token itself must not be sent in your message. Until configured, the connection card correctly shows Setup pending and disables password entry.
4. After configuration is checked, open [Account Settings](http://127.0.0.1:3000/app/settings#broker-connection-heading) under the account approved for testing. Use an MT5 **demo account** and its exact broker server. Enter its **investor/read-only password in the website form**, consent and choose **Connect read-only account**. Let MetaApi finish provisioning, then choose **Sync history** and open [P/L Calendar](http://127.0.0.1:3000/app/calendar). Compare the results with the MT5 demo history before accepting real-account reads.

The Calendar shows saved snapshots, with a last-sync timestamp and MYT dates. Use Sync history to refresh provider data. This does not activate Tools or trading, and does not deploy the webapp to Vercel. A provider acceptance test is still pending. For cleanup, billing considerations, membership restrictions, region support, privacy and limits, see [the detailed guide](READ_ONLY_BROKER_SETUP.md).

The server keeps its UUID request key locally and sends its stable 32 hexadecimal characters as the provider transaction ID, matching [MetaApi's create-account contract](https://metaapi.cloud/docs/provisioning/api/account/createAccount/). Retries retain the same transaction identity.

Primary references: [API authentication](https://metaapi.cloud/docs/client/restApi/auth/), [account-management API](https://metaapi.cloud/docs/provisioning/), [supported regions](https://metaapi.cloud/docs/client/regions/).
