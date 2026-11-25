# MetaApi account-creation denial

Paste the following into MetaApi's support chat while signed into the affected MetaApi account. Do not attach `.env`, an API token, or an investor password.

> Our server-side integration receives HTTP 403 `ForbiddenError` from `POST /users/current/accounts` (`createAccount`), before an account ID is returned. The failure occurred at 2026-11-01 16:48:19 UTC (2026-11-02 00:48:19 MYT). The requested platform is MT5, type `cloud-g2`, region `london`, using investor credentials for read-only history.
>
> The configured token has reader/writer roles for `trading-account-management-api:rest:public:*:*`, with resource pattern `*:$USER_ID$:*`. It also has MetaApi REST access. Token checks succeed for the access-rule manifest, known-server directory, regional quotas and account listing. The last account listing returned zero accounts. Quotas reported London capacity of 100 accounts and 100 deployed G2 accounts, at 0% usage.
>
> The application retained only HTTP status, operation and error name; it did not retain the provider's raw response or broker credentials. No `E_AUTH` broker-login code was captured. Please check the server-side reason for this creation denial and confirm the exact method/resource authorization or account eligibility requirement we must change. Please distinguish an access-rule problem from any account restriction or billing requirement before recommending changes.

No support message has been sent automatically. No additional cloud account was created, deployed or deleted during this diagnostic.

References: [create-account status codes](https://metaapi.cloud/docs/provisioning/api/account/createAccount/), [official token-management guidance](https://github.com/metaapi/metaapi-javascript-sdk/blob/main/docs/tokenManagementApi.md).
